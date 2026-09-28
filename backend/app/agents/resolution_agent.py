from __future__ import annotations

from typing import Any


def reason(incident: dict[str, Any], analysis: dict[str, Any]) -> dict[str, Any]:
    memories = analysis.get("recalled_memories") or []
    return {
        "likely_root_cause": analysis.get("likely_root_cause"),
        "recommended_investigation": analysis.get("recommended_investigation"),
        "recommended_resolution": analysis.get("recommended_resolution"),
        "confidence": analysis.get("confidence"),
        "current_evidence": analysis.get("current_evidence") or [],
        "historical_evidence": analysis.get("historical_evidence") or [],
        "why_this_recommendation": analysis.get("why_this_recommendation") or [],
        "evidence_sources": [m.get("incident_id") for m in memories if m.get("incident_id")],
        "incident_id": incident.get("public_id"),
    }
