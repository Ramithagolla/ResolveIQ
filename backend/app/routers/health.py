from fastapi import APIRouter

from app.config import get_settings
from app.memory.hindsight_service import get_memory_service
from app.schemas import HealthOut

router = APIRouter()


@router.get("/health", response_model=HealthOut)
async def health():
    memory = get_memory_service()
    settings = get_settings()
    return HealthOut(
        status="healthy" if memory.available else "degraded",
        memory_provider=memory.provider,
        memory_available=memory.available,
        memory_error=memory.error,
        bank_id=settings.hindsight_bank_id if memory.provider == "hindsight" else None,
        last_recall_at=memory.last_recall_at,
        last_retain_at=memory.last_retain_at,
        retained_count=memory.retained_count,
        recalled_count=memory.recalled_count,
        llm_available=bool(settings.llm_api_key),
    )
