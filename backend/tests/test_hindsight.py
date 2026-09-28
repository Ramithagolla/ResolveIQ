import pytest

from app.config import Settings
from app.memory.hindsight_service import HindsightService, MemoryUnavailableError


def local_service() -> HindsightService:
    settings = Settings(
        memory_provider="local",
        database_url="sqlite:///:memory:",
        llm_api_key="",
    )
    return HindsightService(settings)


@pytest.mark.asyncio
async def test_retain_and_recall_incident():
    svc = local_service()
    payload = {
        "incident_id": "INC-1042",
        "service": "Payment API",
        "severity": "SEV-1",
        "environment": "production",
        "deployment": "payment-v2.4.1",
        "symptoms": ["connection timeout", "database connections unavailable"],
        "logs": "Database connection timeout. Connection pool exhausted.",
        "root_cause": "Database connection pool exhaustion",
        "resolution": "Increase connection pool from 50 to 100",
        "outcome": "Successfully resolved",
        "resolution_time_minutes": 11,
        "tags": ["payment", "database", "timeout"],
        "pattern": "Payment API + deployment + connection timeout",
    }
    result = await svc.retain_memory(payload)
    assert result["ok"] is True
    recalled = await svc.recall_memory(
        svc.build_recall_query(
            {
                "service": "Payment API",
                "error": "Connection timeout",
                "environment": "Production",
                "deployment": "payment-v2.4.2",
                "logs": "Payment requests timing out. Database connections unavailable.",
            }
        )
    )
    assert recalled["available"] is True
    assert recalled["provider"] == "local-demo"
    ids = [item["incident_id"] for item in recalled["items"]]
    assert "INC-1042" in ids


@pytest.mark.asyncio
async def test_recall_no_memories():
    svc = local_service()
    recalled = await svc.recall_memory("auth token expiration jwks mismatch")
    assert recalled["items"] == []


@pytest.mark.asyncio
async def test_hindsight_errors():
    svc = HindsightService(
        Settings(memory_provider="hindsight", hindsight_base_url="http://127.0.0.1:9", hindsight_api_key="x")
    )
    svc.available = False
    svc.error = "Memory service unavailable"
    with pytest.raises(MemoryUnavailableError):
        await svc.retain_memory({"incident_id": "INC-1"})
    recalled = await svc.recall_memory("anything")
    assert recalled["available"] is False
    assert "unavailable" in (recalled["error"] or "").lower()
