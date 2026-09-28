from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from app.models import Incident, MemoryCatalog

REAL_INCIDENTS_PATH = Path(__file__).resolve().parents[2] / "data" / "incidents" / "real_incidents.json"

LEGACY_SEED_INCIDENTS: list[dict] = [
    {
        "public_id": "INC-1042",
        "organization": "ResolveIQ Internal",
        "service": "Payment API",
        "severity": "SEV-1",
        "environment": "Production",
        "deployment": "payment-v2.4.1",
        "error": "Connection timeout",
        "logs": "Database connection timeout.\nConnection pool exhausted.\nRequests waiting for available connection.",
        "status": "resolved",
        "symptoms": ["connection timeout", "connection pool exhausted", "database connections unavailable"],
        "predicted_root_cause": "Database connection pool exhaustion",
        "actual_root_cause": "Database connection pool exhaustion",
        "actual_resolution": "Increase connection pool from 50 to 100",
        "outcome": "Successfully resolved",
        "resolution_time_minutes": 11,
        "minutes_ago": 180,
    },
    {
        "public_id": "INC-0981",
        "organization": "ResolveIQ Internal",
        "service": "Payment API",
        "severity": "SEV-1",
        "environment": "Production",
        "deployment": "payment-v2.3.9",
        "error": "Connection timeout",
        "logs": "Checkout latency spike. Database connections unavailable during peak.",
        "status": "resolved",
        "symptoms": ["connection timeout", "database connections unavailable"],
        "predicted_root_cause": "Database connection pool exhaustion",
        "actual_root_cause": "Database connection pool exhaustion",
        "actual_resolution": "Successful rollback to payment-v2.3.8 plus pool increase",
        "outcome": "Successfully resolved",
        "resolution_time_minutes": 22,
        "minutes_ago": 2400,
    },
    {
        "public_id": "INC-0877",
        "organization": "ResolveIQ Internal",
        "service": "Payment API",
        "severity": "SEV-2",
        "environment": "Production",
        "deployment": "payment-v2.2.1",
        "error": "Connection timeout",
        "logs": "Intermittent DB timeouts after traffic surge. Pool wait queue growing.",
        "status": "resolved",
        "symptoms": ["connection timeout", "waiting for available connection"],
        "predicted_root_cause": "Database connection pool exhaustion",
        "actual_root_cause": "Database connection pool exhaustion",
        "actual_resolution": "Raised pool max and fixed leaked connections in webhook worker",
        "outcome": "Successfully resolved",
        "resolution_time_minutes": 31,
        "minutes_ago": 7200,
    },
    {
        "public_id": "INC-1041",
        "organization": "ResolveIQ Internal",
        "service": "Auth Service",
        "severity": "SEV-2",
        "environment": "Production",
        "deployment": "auth-v1.8.4",
        "error": "Token expiration",
        "logs": "JWT exp claim in the past. Clients receiving 401 after 4 minutes.",
        "status": "resolved",
        "symptoms": ["token expiration"],
        "predicted_root_cause": "Token TTL too short after config change",
        "actual_root_cause": "Token TTL too short after config change",
        "actual_resolution": "Restored TTL to 15 minutes and flushed auth cache",
        "outcome": "Successfully resolved",
        "resolution_time_minutes": 18,
        "minutes_ago": 400,
    },
]


def load_real_incidents() -> list[dict]:
    if not REAL_INCIDENTS_PATH.exists():
        return []
    try:
        with open(REAL_INCIDENTS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def _timeline(created: datetime, resolved: bool) -> list[dict]:
    events = [
        {"at": created.strftime("%H:%M"), "label": "Incident detected"},
        {"at": (created + timedelta(minutes=2)).strftime("%H:%M"), "label": "ResolveIQ analysis"},
        {"at": (created + timedelta(minutes=3)).strftime("%H:%M"), "label": "Hindsight memories recalled"},
        {"at": (created + timedelta(minutes=5)).strftime("%H:%M"), "label": "Root cause identified"},
    ]
    if resolved:
        events.append({"at": (created + timedelta(minutes=9)).strftime("%H:%M"), "label": "Resolution applied"})
        events.append({"at": (created + timedelta(minutes=11)).strftime("%H:%M"), "label": "Memory retained"})
    return events


def seed_if_empty(db: Session) -> None:
    if db.query(Incident).count() > 0:
        return

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # 1. Seed legacy demo incidents
    for item in LEGACY_SEED_INCIDENTS:
        created = now - timedelta(minutes=item["minutes_ago"])
        resolved = item["status"] == "resolved"
        incident = Incident(
            public_id=item["public_id"],
            organization=item.get("organization", "ResolveIQ Internal"),
            service=item["service"],
            severity=item["severity"],
            environment=item["environment"],
            deployment=item["deployment"],
            error=item["error"],
            logs=item["logs"],
            status=item["status"],
            symptoms_json=json.dumps(item["symptoms"]),
            predicted_root_cause=item.get("predicted_root_cause"),
            actual_root_cause=item.get("actual_root_cause"),
            actual_resolution=item.get("actual_resolution"),
            outcome=item.get("outcome"),
            resolution_time_minutes=item.get("resolution_time_minutes"),
            memory_retained=resolved,
            is_seed=True,
            is_held_out=False,
            timeline_json=json.dumps(_timeline(created, resolved)),
            created_at=created,
            analyzed_at=created + timedelta(minutes=2) if resolved else None,
            resolved_at=created + timedelta(minutes=item.get("resolution_time_minutes") or 10) if resolved else None,
        )
        db.add(incident)
        if resolved:
            pattern = f"{item['service']} + deployment + {item['error']}"
            v1 = {
                "version": 1,
                "hypothesis_or_root_cause": item.get("actual_root_cause") or "",
                "resolution": item.get("actual_resolution") or "",
                "status": "Active Memory",
                "corrected_by": "System Seed",
                "created_at": created.isoformat(),
            }
            payload = {
                "incident_id": item["public_id"],
                "organization": item.get("organization"),
                "service": item["service"],
                "severity": item["severity"],
                "environment": item["environment"].lower(),
                "deployment": item["deployment"],
                "symptoms": item["symptoms"],
                "logs": item["logs"],
                "root_cause": item.get("actual_root_cause"),
                "resolution": item.get("actual_resolution"),
                "outcome": item.get("outcome"),
                "resolution_time_minutes": item.get("resolution_time_minutes"),
                "timestamp": created.isoformat(),
                "tags": [item["service"].split(" ")[0].lower(), "seed"],
                "pattern": pattern,
                "versions": [v1],
            }
            db.add(
                MemoryCatalog(
                    incident_id=item["public_id"],
                    organization=item.get("organization"),
                    service=item["service"],
                    pattern=pattern,
                    root_cause=item.get("actual_root_cause") or "",
                    resolution=item.get("actual_resolution") or "",
                    outcome=item.get("outcome") or "",
                    payload_json=json.dumps(payload),
                    tags_json=json.dumps(payload["tags"]),
                    versions_json=json.dumps([v1]),
                    created_at=created,
                )
            )

    # 2. Seed Real Public Incidents from real_incidents.json
    real_items = load_real_incidents()
    total_real = len(real_items)
    # Train/Memory set = first 11 incidents; Held-out evaluation set = remaining
    held_out_cutoff = max(1, total_real - 5) if total_real > 5 else 3

    for idx, item in enumerate(real_items):
        is_held_out = idx >= held_out_cutoff
        created = now - timedelta(days=(idx + 1) * 3)
        pid = item["incident_id"]

        incident = Incident(
            public_id=pid,
            organization=item.get("organization"),
            title=item.get("title"),
            date=item.get("date"),
            service=item.get("service") or "Cloud Service",
            severity="SEV-1" if idx % 2 == 0 else "SEV-2",
            environment="Production",
            deployment=f"{item.get('service', 'service').lower().replace(' ', '-')}-v1.{idx}.0",
            error=item.get("symptoms", ["Production disruption"])[0],
            logs=f"Ground-truth postmortem logs for {pid}.\nImpact: {item.get('impact')}\nSymptoms: {', '.join(item.get('symptoms', []))}",
            status="resolved",
            symptoms_json=json.dumps(item.get("symptoms", [])),
            impact=item.get("impact"),
            predicted_root_cause=item.get("root_cause"),
            actual_root_cause=item.get("root_cause"),
            actual_resolution=item.get("resolution"),
            lessons_learned=item.get("lessons_learned"),
            source_url=item.get("source_url"),
            source_title=item.get("source_title"),
            is_held_out=is_held_out,
            memory_retained=not is_held_out,
            is_seed=True,
            timeline_json=json.dumps(_timeline(created, True)),
            created_at=created,
            analyzed_at=created + timedelta(minutes=2),
            resolved_at=created + timedelta(minutes=30),
        )
        db.add(incident)

        # Retain in memory catalog ONLY if NOT held out
        if not is_held_out:
            pattern = f"{item['organization']} + {item['service']} + {item.get('symptoms', [''])[0]}"
            v1 = {
                "version": 1,
                "hypothesis_or_root_cause": item.get("root_cause") or "",
                "resolution": item.get("resolution") or "",
                "status": "Active Memory",
                "corrected_by": "Public Postmortem",
                "created_at": created.isoformat(),
            }
            payload = {
                "incident_id": pid,
                "organization": item.get("organization"),
                "title": item.get("title"),
                "date": item.get("date"),
                "service": item.get("service"),
                "symptoms": item.get("symptoms", []),
                "logs": incident.logs,
                "root_cause": item.get("root_cause"),
                "resolution": item.get("resolution"),
                "outcome": "Resolved per public postmortem",
                "lessons_learned": item.get("lessons_learned"),
                "source_url": item.get("source_url"),
                "source_title": item.get("source_title"),
                "timestamp": created.isoformat(),
                "tags": [item.get("organization", "").lower(), item.get("service", "").split(" ")[0].lower(), "real-postmortem"],
                "pattern": pattern,
                "versions": [v1],
            }
            db.add(
                MemoryCatalog(
                    incident_id=pid,
                    organization=item.get("organization"),
                    service=item.get("service", ""),
                    pattern=pattern,
                    root_cause=item.get("root_cause") or "",
                    resolution=item.get("resolution") or "",
                    outcome="Resolved per public postmortem",
                    source_url=item.get("source_url"),
                    source_title=item.get("source_title"),
                    payload_json=json.dumps(payload),
                    tags_json=json.dumps(payload["tags"]),
                    versions_json=json.dumps([v1]),
                    created_at=created,
                )
            )

    db.commit()


async def retain_seed_memories(db: Session, memory) -> None:
    rows = db.query(MemoryCatalog).all()
    for row in rows:
        payload = json.loads(row.payload_json)
        try:
            await memory.retain_memory(payload)
        except Exception:
            continue
