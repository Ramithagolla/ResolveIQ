import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.memory.hindsight_service import get_memory_service
from app.models import Incident, MemoryCatalog, MemoryRecallEvent
from app.schemas import PatternOut, RecallRequest
from app.services.incidents import patterns as live_patterns

router = APIRouter()


@router.post("/memory/recall")
async def recall(body: RecallRequest, db: Session = Depends(get_db)):
    memory = get_memory_service()
    incident_payload = {
        "service": body.service,
        "error": body.error,
        "logs": body.logs,
        "deployment": body.deployment,
        "environment": body.environment,
        "public_id": body.incident_id,
    }
    if body.incident_id:
        incident = db.query(Incident).filter(Incident.public_id == body.incident_id).one_or_none()
        if incident:
            incident_payload.update(
                {
                    "service": incident.service,
                    "error": incident.error,
                    "logs": incident.logs,
                    "deployment": incident.deployment,
                    "environment": incident.environment,
                    "public_id": incident.public_id,
                }
            )
    query = body.query or memory.build_recall_query(incident_payload)
    result = await memory.recall_memory(query, current=incident_payload)
    if not result.get("available"):
        return {
            "error": result.get("error") or "Memory service unavailable",
            "provider": result.get("provider"),
            "items": [],
            "available": False,
        }

    # Record recall events for tracking
    items = result.get("items") or []
    if body.incident_id:
        for item in items:
            mem_id = item.get("incident_id")
            if mem_id:
                db.add(
                    MemoryRecallEvent(
                        memory_id=mem_id,
                        incident_id=body.incident_id,
                        relevance=item.get("relevance", 0),
                    )
                )
        db.commit()

    return {
        "query": query,
        "provider": result.get("provider"),
        "available": True,
        "items": items,
    }


@router.get("/memory")
def list_memory(q: str | None = None, db: Session = Depends(get_db)):
    rows = db.query(MemoryCatalog).order_by(MemoryCatalog.created_at.desc()).all()
    items = []
    for row in rows:
        blob = f"{row.incident_id} {row.service} {row.root_cause} {row.resolution}".lower()
        if q and q.lower() not in blob:
            continue

        recalls_count = db.query(MemoryRecallEvent).filter(MemoryRecallEvent.memory_id == row.incident_id).count()
        last_event = (
            db.query(MemoryRecallEvent)
            .filter(MemoryRecallEvent.memory_id == row.incident_id)
            .order_by(MemoryRecallEvent.recalled_at.desc())
            .first()
        )

        items.append(
            {
                "incident_id": row.incident_id,
                "organization": row.organization,
                "service": row.service,
                "pattern": row.pattern,
                "root_cause": row.root_cause,
                "resolution": row.resolution,
                "outcome": row.outcome,
                "source_url": row.source_url,
                "source_title": row.source_title,
                "tags": json.loads(row.tags_json or "[]"),
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "used_in_recalls_count": recalls_count,
                "last_recalled_at": last_event.recalled_at.isoformat() if last_event else None,
                "last_recalled_incident_id": last_event.incident_id if last_event else None,
                "successful_outcomes_count": 1 if "resolve" in row.outcome.lower() else 0,
            }
        )
    return {
        "count": len(items),
        "patterns": len({i["pattern"] for i in items}),
        "note": "Catalog of memories retained into the memory engine. Search here is catalog filter, not Hindsight recall.",
        "items": items,
    }


@router.get("/memory/{memory_id}")
def get_memory(memory_id: str, db: Session = Depends(get_db)):
    row = db.query(MemoryCatalog).filter(MemoryCatalog.incident_id == memory_id).one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Memory not found")
    from app.memory.hindsight_service import format_retain_content

    payload = json.loads(row.payload_json)
    if "formatted_content" not in payload:
        payload["formatted_content"] = format_retain_content(payload)
    if "context" not in payload:
        payload["context"] = "engineering incident resolution — what happened and what actually worked"

    recalls_count = db.query(MemoryRecallEvent).filter(MemoryRecallEvent.memory_id == memory_id).count()
    last_event = (
        db.query(MemoryRecallEvent)
        .filter(MemoryRecallEvent.memory_id == memory_id)
        .order_by(MemoryRecallEvent.recalled_at.desc())
        .first()
    )

    payload.update(
        {
            "used_in_recalls_count": recalls_count,
            "last_recalled_at": last_event.recalled_at.isoformat() if last_event else None,
            "last_recalled_incident_id": last_event.incident_id if last_event else None,
            "successful_outcomes_count": 1 if "resolve" in row.outcome.lower() else 0,
        }
    )
    return payload


@router.get("/patterns", response_model=list[PatternOut])
def patterns(db: Session = Depends(get_db)):
    return live_patterns(db)
