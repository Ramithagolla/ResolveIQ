from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.memory.hindsight_service import get_memory_service
from app.models import Incident
from app.seed import retain_seed_memories
from app.services.incidents import create_incident, incident_to_dict

router = APIRouter()

DEMO_INCIDENT = {
    "service": "Payment API",
    "severity": "SEV-1",
    "environment": "Production",
    "deployment": "payment-v2.4.2",
    "error": "Connection timeout",
    "logs": (
        "Payment requests timing out.\n"
        "Database connections unavailable.\n"
        "High number of waiting requests."
    ),
}

FOLLOW_UP = {
    "service": "Payment API",
    "severity": "SEV-1",
    "environment": "Production",
    "deployment": "payment-v2.4.3",
    "error": "Connection timeout",
    "logs": (
        "Checkout API timing out after deploy payment-v2.4.3.\n"
        "Database connection timeout.\n"
        "Connection pool exhausted."
    ),
}


@router.post("/demo/launch")
async def launch_demo(db: Session = Depends(get_db)):
    memory = get_memory_service()
    await retain_seed_memories(db, memory)
    historical = db.query(Incident).filter(Incident.public_id == "INC-1042").one_or_none()

    # Idempotent: reuse an existing open demo incident instead of creating a duplicate
    existing_demo = (
        db.query(Incident)
        .filter(
            Incident.service == DEMO_INCIDENT["service"],
            Incident.deployment == DEMO_INCIDENT["deployment"],
            Incident.status == "open",
        )
        .order_by(Incident.created_at.desc())
        .first()
    )
    if existing_demo:
        incident = existing_demo
        demo_already_active = True
    else:
        incident = create_incident(db, DEMO_INCIDENT)
        demo_already_active = False

    return {
        "historical": incident_to_dict(historical) if historical else None,
        "new_incident": incident_to_dict(incident),
        "demo_already_active": demo_already_active,
        "related": ["INC-1042", "INC-0981", "INC-0877"],
        "steps": [
            "Historical incident INC-1042 already exists and is retained in memory.",
            f"New similar incident {incident.public_id} is open on Payment API.",
            "Analyze the new incident to recall Hindsight memories.",
            "Inspect Why this recommendation and historical evidence.",
            "Resolve the incident and retain the new organizational memory.",
            "Optionally create a follow-up incident to show improved recall.",
        ],
        "memory_provider": memory.provider,
        "memory_available": memory.available,
    }


@router.post("/demo/follow-up")
def follow_up(db: Session = Depends(get_db)):
    incident = create_incident(db, FOLLOW_UP)
    return incident_to_dict(incident)
