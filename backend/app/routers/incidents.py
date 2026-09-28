from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.memory.hindsight_service import get_memory_service
from app.models import Incident, MemoryCatalog
from app.schemas import CorrectionRequest, IncidentCreate, IncidentOut, LearnResult, ResolveRequest, StatsOut
from app.services.incidents import (
    analyze,
    correct_incident_memory,
    create_incident,
    incident_to_dict,
    resolve_incident,
    stats as live_stats,
)
from app.agents.learning_agent import learn_from_incident

router = APIRouter()


@router.post("/incidents", response_model=IncidentOut)
def create(body: IncidentCreate, db: Session = Depends(get_db)):
    incident = create_incident(db, body.model_dump())
    return incident_to_dict(incident)


@router.get("/incidents", response_model=list[IncidentOut])
def list_incidents(db: Session = Depends(get_db)):
    rows = db.query(Incident).order_by(Incident.created_at.desc()).all()
    return [incident_to_dict(r) for r in rows]


@router.get("/incidents/{incident_id}", response_model=IncidentOut)
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.public_id == incident_id).one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident_to_dict(incident)


@router.post("/incidents/{incident_id}/analyze")
async def analyze_incident(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.public_id == incident_id).one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    memory = get_memory_service()
    analysis = await analyze(db, incident, memory)
    return {
        "incident": incident_to_dict(incident),
        "analysis": analysis,
    }


@router.post("/incidents/{incident_id}/correct")
async def correct_incident(incident_id: str, body: CorrectionRequest, db: Session = Depends(get_db)):
    """Engineer feedback correction endpoint for wrong recall demo."""
    incident = db.query(Incident).filter(Incident.public_id == incident_id).one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    memory = get_memory_service()
    res = await correct_incident_memory(db, incident, body.model_dump(), memory)
    return {
        "incident": incident_to_dict(incident),
        "correction": res,
    }


@router.post("/incidents/{incident_id}/resolve")
async def resolve(incident_id: str, body: ResolveRequest, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.public_id == incident_id).one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    memory = get_memory_service()
    learn = await resolve_incident(db, incident, body.model_dump(), memory)
    return {
        "incident": incident_to_dict(incident),
        "learn": learn,
    }


@router.post("/incidents/{incident_id}/learn", response_model=LearnResult)
async def learn(incident_id: str, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.public_id == incident_id).one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if not incident.actual_root_cause or not incident.actual_resolution:
        raise HTTPException(status_code=400, detail="Resolve the incident before learning")
    memory = get_memory_service()
    before = db.query(MemoryCatalog).count()
    result = await learn_from_incident(db, incident, memory, before)
    return result


@router.get("/stats", response_model=StatsOut)
def stats(db: Session = Depends(get_db)):
    return live_stats(db)
