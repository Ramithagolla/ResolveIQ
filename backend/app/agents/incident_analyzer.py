from __future__ import annotations

import json
import logging
import re
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


def extract_symptoms(error: str, logs: str) -> list[str]:
    text = f"{error}\n{logs}".lower()
    candidates = [
        "100% cpu utilization",
        "502 bad gateway",
        "cpu exhaustion",
        "database query timeouts",
        "replication lag",
        "thread count limit exceeded",
        "connection pool exhausted",
        "connection timeout",
        "500 errors",
        "503 service unavailable",
        "token expiration",
        "configuration mismatch",
        "service unavailable",
        "queue backlog",
        "retry storm",
        "provider timeout",
        "indexing failure",
        "stale index",
        "failed deployment",
    ]
    found = [c for c in candidates if c in text]
    if not found:
        found = [error.strip()] if error.strip() else ["unspecified symptom"]
    return found[:6]


def heuristic_analysis(incident: dict[str, Any], memories: list[dict[str, Any]]) -> dict[str, Any]:
    service = incident.get("service") or ""
    error = (incident.get("error") or "").lower()
    logs = (incident.get("logs") or "").lower()
    combined = f"{error} {logs}"

    # Base hypothesis without memory (based strictly on generic keywords in symptoms)
    likely = "Generic infrastructure / application anomaly"
    investigation = "Inspect active logs, metrics, recent deployments, and dependency status."
    resolution = "Follow standard operational triage procedures for generic service degradation."
    confidence = "Low"

    if "cpu" in combined or "502" in combined or "waf" in combined:
        likely = "CPU exhaustion / unthrottled worker process"
        investigation = "Inspect worker thread CPU usage and check recent WAF/rule deployments."
        resolution = "Restart worker processes and throttle heavy incoming endpoints."
        confidence = "Medium"
    elif "pool" in combined or "connection timeout" in combined or "connections unavailable" in combined:
        likely = "Database connection pool exhaustion"
        investigation = "Check database connection pool and compare active connections against maximum."
        resolution = "If pool is exhausted, increase connection pool max and check connection leaks."
        confidence = "Medium"
    elif "replication" in combined or "postgresql" in combined or "database query" in combined:
        likely = "Database replication lag / primary node bottleneck"
        investigation = "Inspect replica synchronization lag, disk I/O, and heavy long-running queries."
        resolution = "Fail over to sync replica or terminate long-running maintenance queries."
        confidence = "Medium"
    elif "thread" in combined or "kinesis" in combined:
        likely = "OS thread limit exhaustion"
        investigation = "Inspect process thread pool limits and file descriptors."
        resolution = "Sequential restart of service fleet with reduced thread creation caps."
        confidence = "Medium"
    elif "token" in combined or "iam" in combined or "expir" in combined:
        likely = "Authentication token expiration / identity cache mismatch"
        investigation = "Inspect token TTL, identity provider cache schema, and auth certificates."
        resolution = "Purge auth cache, synchronize keys, and restart auth pods."
        confidence = "Medium"
    elif "retry" in combined:
        likely = "Retry storm amplifying downstream latency"
        investigation = "Inspect retry budgets, backoff policies, and downstream error rates."
        resolution = "Apply exponential backoff with jitter and limit retry attempts."
        confidence = "Medium"

    current_evidence = [
        f"Service '{service}' reported error: {incident.get('error')}",
    ]
    if incident.get("deployment"):
        current_evidence.append(f"Deployment: {incident.get('deployment')}")
    if incident.get("environment"):
        current_evidence.append(f"Environment: {incident.get('environment')}")
    if logs:
        snippet = incident.get("logs", "").split("\n")[0][:180]
        current_evidence.append(f"Log signal: {snippet}")

    historical = []
    why = []
    if memories:
        confidence = "High" if memories[0].get("relevance", 0) >= 65 else "Medium"
        top = memories[0]
        if top.get("root_cause"):
            likely = top["root_cause"]
        if top.get("resolution"):
            resolution = (
                f"Apply evidence-backed resolution from {top.get('incident_id')}: {top['resolution']}"
            )
            investigation = (
                f"Investigate path proven by {top.get('incident_id')}: {investigation}"
            )

        for mem in memories[:3]:
            iid = mem.get("incident_id") or "unknown"
            org = f"[{mem.get('organization')}] " if mem.get("organization") else ""
            rc = mem.get("root_cause") or "related failure"
            res = mem.get("resolution") or "see memory"
            historical.append(f"{iid} {org}— Root Cause: {rc} | Resolution: {res}")

        why = [
            "Matches organizational postmortem pattern",
            f"Ground-truth incident {top.get('incident_id')} shares identical failure signature",
            "Prior resolution successfully restored service stability",
            "Avoids redundant investigation steps",
        ]
        with_memory = (
            f"Recalled {len(memories)} historical memories. Top match {top.get('incident_id')} "
            f"was resolved by: {top.get('resolution')}."
        )
    else:
        why = ["No historical memories were recalled for this incident"]
        with_memory = "I don't have information about previous incidents."

    return {
        "likely_root_cause": likely,
        "confidence": confidence,
        "recommended_investigation": investigation,
        "recommended_resolution": resolution,
        "current_evidence": current_evidence,
        "historical_evidence": historical,
        "why_this_recommendation": why,
        "without_memory_summary": "Analysis generated strictly from current symptoms and logs.",
        "with_memory_summary": with_memory,
        "analyzer_mode": "heuristic",
    }


async def llm_analysis(incident: dict[str, Any], memories: list[dict[str, Any]]) -> dict[str, Any] | None:
    settings = get_settings()
    if not settings.llm_api_key:
        return None

    memory_block = json.dumps(
        [
            {
                "incident_id": m.get("incident_id"),
                "organization": m.get("organization"),
                "service": m.get("service"),
                "root_cause": m.get("root_cause"),
                "resolution": m.get("resolution"),
                "outcome": m.get("outcome"),
                "source_url": m.get("source_url"),
            }
            for m in memories
        ],
        indent=2,
    )
    prompt = f"""You are ResolveIQ's incident analyzer.
You MUST NOT invent historical incidents. Use ONLY the memories JSON provided.
If memories is empty, perform analysis strictly on the current incident details without claiming historical evidence.

Current incident:
{json.dumps(incident, indent=2, default=str)}

Historical memories from Hindsight (authoritative):
{memory_block}

Return JSON only with keys:
likely_root_cause, confidence (High|Medium|Low), recommended_investigation,
recommended_resolution, current_evidence (array of strings),
historical_evidence (array of strings citing incident IDs),
why_this_recommendation (array of short evidence bullets),
without_memory_summary, with_memory_summary.
"""
    url = settings.llm_base_url.rstrip("/") + "/chat/completions"
    try:
        async with httpx.AsyncClient(timeout=40.0) as client:
            response = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {settings.llm_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.llm_model,
                    "temperature": 0.2,
                    "messages": [
                        {"role": "system", "content": "Return valid JSON only. Never invent incident IDs."},
                        {"role": "user", "content": prompt},
                    ],
                },
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            match = re.search(r"\{.*\}", content, re.DOTALL)
            if not match:
                return None
            data = json.loads(match.group(0))
            data["analyzer_mode"] = "llm"
            return data
    except Exception:
        logger.exception("LLM analysis failed")
        return None


async def analyze_incident(
    incident: dict[str, Any],
    memories: list[dict[str, Any]],
    memory_meta: dict[str, Any]
) -> dict[str, Any]:
    # 1. Compute MODE A: WITHOUT MEMORY (using identical LLM/heuristic model but empty memories)
    without_memory_base = heuristic_analysis(incident, [])
    without_memory_llm = await llm_analysis(incident, [])
    without_memory = without_memory_llm if without_memory_llm else without_memory_base

    # 2. Compute MODE B: WITH MEMORY (using identical LLM/heuristic model with recalled memories)
    with_memory_base = heuristic_analysis(incident, memories)
    with_memory_llm = await llm_analysis(incident, memories)
    with_memory = with_memory_llm if with_memory_llm else with_memory_base

    recalled = []
    for mem in memories:
        provider = memory_meta.get("provider") or "local"
        rel = mem.get("relevance") or 0
        rel_label = mem.get("relevance_label") or (f"{rel}% match" if provider != "hindsight" else "Retrieved by Hindsight")
        recalled.append(
            {
                "incident_id": mem.get("incident_id"),
                "organization": mem.get("organization"),
                "relevance": rel,
                "relevance_label": rel_label,
                "service": mem.get("service"),
                "root_cause": mem.get("root_cause"),
                "resolution": mem.get("resolution"),
                "outcome": mem.get("outcome"),
                "source_url": mem.get("source_url"),
                "source_title": mem.get("source_title"),
                "text": mem.get("text") or "",
                "tags": mem.get("tags") or [],
                "is_corrected": mem.get("is_corrected", False),
                "original_hypothesis": mem.get("original_hypothesis"),
            }
        )

    # Primary analysis output (WITH MEMORY if available)
    primary = dict(with_memory)
    primary.update(
        {
            "recalled_memories": recalled,
            "memory_count": len(recalled),
            "memory_available": bool(memory_meta.get("available")),
            "memory_provider": memory_meta.get("provider") or "unavailable",
            "memory_error": memory_meta.get("error"),
            "llm_available": bool(with_memory_llm),
            "analyzer_mode": with_memory.get("analyzer_mode", "heuristic"),
            # Structured Side-by-Side comparison outputs
            "mode_without_memory": {
                "likely_root_cause": without_memory.get("likely_root_cause"),
                "confidence": without_memory.get("confidence"),
                "recommended_investigation": without_memory.get("recommended_investigation"),
                "recommended_resolution": without_memory.get("recommended_resolution"),
                "current_evidence": without_memory.get("current_evidence", []),
                "historical_evidence": [],
                "memory_count": 0,
            },
            "mode_with_memory": {
                "likely_root_cause": with_memory.get("likely_root_cause"),
                "confidence": with_memory.get("confidence"),
                "recommended_investigation": with_memory.get("recommended_investigation"),
                "recommended_resolution": with_memory.get("recommended_resolution"),
                "current_evidence": with_memory.get("current_evidence", []),
                "historical_evidence": with_memory.get("historical_evidence", []),
                "memory_count": len(recalled),
            },
            "what_memory_contributed": [
                "Historical incident evidence",
                "Previous root-cause pattern",
                "Previous successful resolution",
                "Organizational context",
            ] if memories else ["No historical memories available to contribute"],
        }
    )

    if not memory_meta.get("available"):
        primary["historical_evidence"] = []
        primary["with_memory_summary"] = "Memory service unavailable"
        primary["why_this_recommendation"] = ["Memory service unavailable — recommendation uses current evidence only"]

    return primary
