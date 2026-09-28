import json
from pathlib import Path

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.memory.hindsight_service import get_memory_service
from app.schemas import EvaluationSummary
from app.config import ROOT
from app.services.incidents import run_held_out_evaluation

router = APIRouter()

_CANDIDATE_DATA_DIRS = [
    Path(__file__).resolve().parents[2] / "data" / "incidents",
    ROOT / "data" / "incidents",
]
DATA_DIR = next((d for d in _CANDIDATE_DATA_DIRS if d.exists()), _CANDIDATE_DATA_DIRS[0])


@router.get("/evaluation", response_model=EvaluationSummary)
async def evaluate(db: Session = Depends(get_db)):
    """Run held-out evaluation comparing WITHOUT MEMORY vs WITH HINDSIGHT MEMORY."""
    memory = get_memory_service()
    result = await run_held_out_evaluation(db, memory)
    return result


@router.get("/sources")
def get_sources():
    """Return provenance dataset for all real public postmortems."""
    real_path = DATA_DIR / "real_incidents.json"
    sources_path = DATA_DIR / "sources.json"

    real_incidents = []
    sources = []

    if real_path.exists():
        try:
            with open(real_path, "r", encoding="utf-8") as f:
                real_incidents = json.load(f)
        except Exception:
            pass

    if sources_path.exists():
        try:
            with open(sources_path, "r", encoding="utf-8") as f:
                sources = json.load(f)
        except Exception:
            pass

    return {
        "title": "PUBLIC INCIDENT DATA",
        "total_incidents": len(real_incidents),
        "total_sources": len(sources),
        "disclaimer": "All incidents are concise structured summaries of publicly documented engineering postmortems with full attribution.",
        "incidents": real_incidents,
        "sources": sources,
    }
