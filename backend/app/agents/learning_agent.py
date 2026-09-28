from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models import Incident, MemoryCatalog
from app.memory.hindsight_service import HindsightService, MemoryUnavailableError


def build_memory_payload(incident: Incident) -> dict[str, Any]:
    import json

    symptoms = json.loads(incident.symptoms_json or "[]")
    pattern = f"{incident.service} + deployment + {incident.error}"
    tags = [
        incident.service.split(" ")[0].lower(),
        incident.environment.lower(),
        "timeout" if "timeout" in (incident.error or "").lower() else "incident",
        "database" if "database" in (incident.logs or "").lower() or "connection" in (incident.error or "").lower() else "ops",
        "deployment",
    ]
    return {
        "incident_id": incident.public_id,
        "service": incident.service,
        "severity": incident.severity,
        "environment": incident.environment.lower(),
        "deployment": incident.deployment,
        "symptoms": symptoms,
        "logs": incident.logs,
        "root_cause": incident.actual_root_cause,
        "resolution": incident.actual_resolution,
        "outcome": incident.outcome,
        "resolution_time_minutes": incident.resolution_time_minutes,
        "timestamp": (incident.resolved_at or datetime.now(timezone.utc)).isoformat(),
        "tags": tags,
        "pattern": pattern,
        "predicted_root_cause": incident.predicted_root_cause,
        "recommendation_helped": incident.recommendation_helped,
    }


async def learn_from_incident(
    db: Session,
    incident: Incident,
    memory: HindsightService,
    memories_before: int,
) -> dict[str, Any]:
    payload = build_memory_payload(incident)
    try:
        retain_result = await memory.retain_memory(payload)
        retained = True
        error = None
        provider = retain_result.get("provider")
    except MemoryUnavailableError as exc:
        retained = False
        error = exc.message
        provider = memory.provider

    existing = db.query(MemoryCatalog).filter(MemoryCatalog.incident_id == incident.public_id).one_or_none()
    import json

    if existing:
        existing.service = incident.service
        existing.pattern = payload["pattern"]
        existing.root_cause = payload["root_cause"] or ""
        existing.resolution = payload["resolution"] or ""
        existing.outcome = payload["outcome"] or ""
        existing.payload_json = json.dumps(payload)
        existing.tags_json = json.dumps(payload["tags"])
    else:
        db.add(
            MemoryCatalog(
                incident_id=incident.public_id,
                service=incident.service,
                pattern=payload["pattern"],
                root_cause=payload["root_cause"] or "",
                resolution=payload["resolution"] or "",
                outcome=payload["outcome"] or "",
                payload_json=json.dumps(payload),
                tags_json=json.dumps(payload["tags"]),
            )
        )
    incident.memory_retained = retained
    db.commit()
    db.refresh(incident)

    memories_after = db.query(MemoryCatalog).count()
    predicted = (incident.predicted_root_cause or "").strip().lower()
    actual = (incident.actual_root_cause or "").strip().lower()
    return {
        "incident_id": incident.public_id,
        "memory_created": retained,
        "memory_provider": provider,
        "memory_error": error,
        "predicted_root_cause": incident.predicted_root_cause,
        "actual_root_cause": incident.actual_root_cause,
        "match": bool(predicted and predicted == actual),
        "pattern": payload["pattern"],
        "successful_fix": incident.actual_resolution,
        "memories_before": memories_before,
        "memories_after": memories_after,
        "new_memory": payload,
        "evolution": {
            "before": memories_before,
            "after": memories_after,
            "pattern": payload["pattern"],
            "root_cause": payload["root_cause"],
            "service": incident.service,
            "deployment": incident.deployment,
            "error": incident.error,
        },
    }
