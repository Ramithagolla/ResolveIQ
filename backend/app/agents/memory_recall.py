from __future__ import annotations

from typing import Any

from app.memory.hindsight_service import HindsightService


async def recall_for_incident(memory: HindsightService, incident: dict[str, Any]) -> dict[str, Any]:
    query = memory.build_recall_query(incident)
    result = await memory.recall_memory(query, current=incident)
    items = result.get("items") or []
    current_id = incident.get("public_id") or incident.get("incident_id")
    filtered = [i for i in items if i.get("incident_id") != current_id]
    result["items"] = filtered
    result["query"] = query
    return result
