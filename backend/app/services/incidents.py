from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.agents.incident_analyzer import analyze_incident, extract_symptoms
from app.agents.learning_agent import learn_from_incident
from app.agents.memory_recall import recall_for_incident
from app.memory.hindsight_service import HindsightService
from app.models import Incident, MemoryCatalog, MemoryRecallEvent
from app.seed import seed_if_empty


def next_public_id(db: Session) -> str:
    ids = [row[0] for row in db.query(Incident.public_id).all()]
    nums = []
    for pid in ids:
        match = re.search(r"(\d+)$", pid)
        if match:
            nums.append(int(match.group(1)))
    nxt = max(nums) + 1 if nums else 2000
    return f"INC-{nxt:04d}"


def incident_to_dict(incident: Incident) -> dict[str, Any]:
    return {
        "public_id": incident.public_id,
        "organization": incident.organization,
        "title": incident.title,
        "date": incident.date,
        "service": incident.service,
        "severity": incident.severity,
        "environment": incident.environment,
        "deployment": incident.deployment,
        "error": incident.error,
        "logs": incident.logs,
        "status": incident.status,
        "symptoms": json.loads(incident.symptoms_json or "[]"),
        "impact": incident.impact,
        "analysis": json.loads(incident.analysis_json) if incident.analysis_json and incident.analysis_json != "null" else None,
        "predicted_root_cause": incident.predicted_root_cause,
        "actual_root_cause": incident.actual_root_cause,
        "actual_resolution": incident.actual_resolution,
        "resolution_notes": incident.resolution_notes,
        "lessons_learned": incident.lessons_learned,
        "source_url": incident.source_url,
        "source_title": incident.source_title,
        "is_held_out": incident.is_held_out,
        "correction_history": json.loads(incident.correction_history_json or "[]"),
        "outcome": incident.outcome,
        "resolution_time_minutes": incident.resolution_time_minutes,
        "memory_retained": incident.memory_retained,
        "is_seed": incident.is_seed,
        "timeline": json.loads(incident.timeline_json or "[]"),
        "created_at": incident.created_at,
        "analyzed_at": incident.analyzed_at,
        "resolved_at": incident.resolved_at,
    }


def create_incident(db: Session, data: dict[str, Any], public_id: str | None = None) -> Incident:
    pid = public_id or next_public_id(db)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    symptoms = extract_symptoms(data["error"], data.get("logs") or "")
    incident = Incident(
        public_id=pid,
        organization=data.get("organization", "Internal"),
        title=data.get("title", f"Incident on {data['service']}"),
        date=now.strftime("%Y-%m-%d"),
        service=data["service"].strip(),
        severity=data.get("severity", "SEV-2"),
        environment=data.get("environment", "Production").strip(),
        deployment=data.get("deployment", "main").strip(),
        error=data["error"].strip(),
        logs=data.get("logs") or "",
        status="open",
        symptoms_json=json.dumps(symptoms),
        impact=data.get("impact", "Service latency/degradation"),
        timeline_json=json.dumps([{"at": now.strftime("%H:%M"), "label": "Incident detected"}]),
        created_at=now,
        is_seed=False,
        is_held_out=False,
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident


def _append_timeline(incident: Incident, label: str) -> None:
    events = json.loads(incident.timeline_json or "[]")
    events.append({"at": datetime.now(timezone.utc).strftime("%H:%M"), "label": label})
    incident.timeline_json = json.dumps(events)


async def analyze(db: Session, incident: Incident, memory: HindsightService) -> dict[str, Any]:
    payload = {
        "public_id": incident.public_id,
        "organization": incident.organization,
        "service": incident.service,
        "severity": incident.severity,
        "environment": incident.environment,
        "deployment": incident.deployment,
        "error": incident.error,
        "logs": incident.logs,
        "symptoms": json.loads(incident.symptoms_json or "[]"),
    }
    recall = await recall_for_incident(memory, payload)
    items = recall.get("items") or []
    # Enrich from local catalog when Hindsight returns IDs without structured JSON
    for item in items:
        iid = item.get("incident_id")
        if iid and not item.get("root_cause"):
            row = db.query(MemoryCatalog).filter(MemoryCatalog.incident_id == iid).one_or_none()
            if row:
                item["organization"] = row.organization
                item["service"] = row.service
                item["root_cause"] = row.root_cause
                item["resolution"] = row.resolution
                item["outcome"] = row.outcome
                item["source_url"] = row.source_url
                item["source_title"] = row.source_title
                stored = json.loads(row.payload_json)
                item["payload"] = stored
                item["tags"] = json.loads(row.tags_json or "[]")
                item["is_corrected"] = len(json.loads(row.versions_json or "[]")) > 1

    analysis = await analyze_incident(
        payload,
        items,
        {
            "available": recall.get("available"),
            "provider": recall.get("provider"),
            "error": recall.get("error"),
        },
    )

    # Track memory recall usage events
    for item in items:
        iid = item.get("incident_id")
        if iid:
            db.add(
                MemoryRecallEvent(
                    memory_id=iid,
                    incident_id=incident.public_id,
                    relevance=item.get("relevance", 0),
                )
            )

    incident.analysis_json = json.dumps(analysis)
    incident.predicted_root_cause = analysis.get("likely_root_cause")
    incident.status = "investigating"
    incident.analyzed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    _append_timeline(incident, "ResolveIQ analysis")
    _append_timeline(incident, "Hindsight memories recalled")
    _append_timeline(incident, "Root cause identified")
    db.commit()
    db.refresh(incident)
    return analysis


async def correct_incident_memory(
    db: Session,
    incident: Incident,
    correction: dict[str, Any],
    memory: HindsightService
) -> dict[str, Any]:
    """Human engineer correction flow for wrong recall demo."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    old_hypothesis = incident.predicted_root_cause or "Database connection pool exhaustion"
    actual_rc = correction["actual_root_cause"]
    actual_res = correction["actual_resolution"]
    note = correction.get("engineer_note", "")

    # Build memory version records
    history = json.loads(incident.correction_history_json or "[]")
    v1 = {
        "version": 1,
        "hypothesis_or_root_cause": old_hypothesis,
        "resolution": "Initial AI hypothesis (Unverified)",
        "status": "Corrected by Engineer",
        "corrected_by": "System Initial Recall",
        "created_at": incident.created_at.isoformat() if incident.created_at else now.isoformat(),
    }
    v2 = {
        "version": 2,
        "hypothesis_or_root_cause": actual_rc,
        "resolution": actual_res,
        "status": "Active Ground Truth",
        "corrected_by": f"Engineer ({note})" if note else "Engineer",
        "created_at": now.isoformat(),
    }
    if not history:
        history = [v1, v2]
    else:
        v2["version"] = len(history) + 1
        history.append(v2)

    incident.actual_root_cause = actual_rc
    incident.actual_resolution = actual_res
    incident.resolution_notes = note
    incident.status = "resolved"
    incident.outcome = "Corrected & Resolved by Engineer"
    incident.correction_history_json = json.dumps(history)
    incident.memory_retained = True
    incident.resolved_at = now
    _append_timeline(incident, f"Engineer corrected root cause: {actual_rc}")
    _append_timeline(incident, "Hindsight memory updated with Version 2")

    # Update MemoryCatalog record
    pattern = f"{incident.service} + {incident.deployment} + {incident.error}"
    cat_row = db.query(MemoryCatalog).filter(MemoryCatalog.incident_id == incident.public_id).one_or_none()
    payload = {
        "incident_id": incident.public_id,
        "organization": incident.organization or "ResolveIQ",
        "service": incident.service,
        "severity": incident.severity,
        "environment": incident.environment.lower(),
        "deployment": incident.deployment,
        "symptoms": json.loads(incident.symptoms_json or "[]"),
        "logs": incident.logs,
        "root_cause": actual_rc,
        "resolution": actual_res,
        "outcome": "Corrected & Resolved by Engineer",
        "source_url": incident.source_url,
        "source_title": incident.source_title,
        "timestamp": now.isoformat(),
        "tags": [incident.service.split(" ")[0].lower(), "human-corrected"],
        "pattern": pattern,
        "versions": history,
        "is_corrected": True,
        "original_hypothesis": old_hypothesis,
    }

    if cat_row:
        cat_row.root_cause = actual_rc
        cat_row.resolution = actual_res
        cat_row.outcome = payload["outcome"]
        cat_row.payload_json = json.dumps(payload)
        cat_row.versions_json = json.dumps(history)
    else:
        cat_row = MemoryCatalog(
            incident_id=incident.public_id,
            organization=incident.organization,
            service=incident.service,
            pattern=pattern,
            root_cause=actual_rc,
            resolution=actual_res,
            outcome=payload["outcome"],
            source_url=incident.source_url,
            source_title=incident.source_title,
            payload_json=json.dumps(payload),
            tags_json=json.dumps(payload["tags"]),
            versions_json=json.dumps(history),
            created_at=now,
        )
        db.add(cat_row)

    db.commit()

    # Retain memory in Hindsight
    retain_res = await memory.retain_memory(payload)

    return {
        "incident_id": incident.public_id,
        "previous_belief": old_hypothesis,
        "engineer_correction": actual_rc,
        "new_resolution": actual_res,
        "versions": history,
        "memory_retained": retain_res.get("ok", False),
        "memory_provider": memory.provider,
    }


async def resolve_incident(db: Session, incident: Incident, body: dict[str, Any], memory: HindsightService) -> dict[str, Any]:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    created = incident.created_at
    minutes = max(1, int((now - created).total_seconds() // 60)) if created else 1
    incident.actual_root_cause = body["root_cause"]
    incident.actual_resolution = body["actual_resolution"]
    incident.resolution_notes = body.get("resolution_notes") or ""
    status = body.get("resolution_status") or "Resolved"
    incident.status = "resolved" if status == "Resolved" else status.lower()
    incident.outcome = "Successfully resolved" if status == "Resolved" else status
    incident.recommendation_helped = body.get("recommendation_helped", True)
    incident.resolved_at = now
    incident.resolution_time_minutes = minutes
    _append_timeline(incident, "Resolution applied")
    db.commit()
    memories_before = db.query(MemoryCatalog).count()
    learn = await learn_from_incident(db, incident, memory, memories_before)
    _append_timeline(incident, "Memory retained" if learn.get("memory_created") else "Memory retain attempted")
    db.commit()
    db.refresh(incident)
    return learn


def _is_root_cause_match(predicted: str | None, ground_truth: str | None) -> bool:
    if not predicted or not ground_truth:
        return False
    p = predicted.lower()
    g = ground_truth.lower()

    # Direct substring / keyword group matching
    if p in g or g in p:
        return True

    p_words = set(re.findall(r"[a-z0-9]+", p)) - {"a", "an", "the", "in", "on", "of", "and", "or", "for", "to", "with", "due", "by"}
    g_words = set(re.findall(r"[a-z0-9]+", g)) - {"a", "an", "the", "in", "on", "of", "and", "or", "for", "to", "with", "due", "by"}

    intersection = p_words & g_words
    if len(intersection) >= 2:
        return True
    if len(g_words) > 0 and (len(intersection) / len(g_words)) >= 0.35:
        return True
    return False


async def run_held_out_evaluation(db: Session, memory: HindsightService) -> dict[str, Any]:
    """Deterministic Held-Out Evaluation comparing WITHOUT MEMORY vs WITH HINDSIGHT MEMORY."""
    held_out_incidents = db.query(Incident).filter(Incident.is_held_out == True).all()
    if not held_out_incidents:
        # Fallback if no incidents explicitly flagged held-out
        held_out_incidents = db.query(Incident).filter(Incident.is_seed == True).order_by(Incident.id.desc()).limit(6).all()

    items = []
    without_correct = 0
    with_correct = 0

    for inc in held_out_incidents:
        payload = {
            "public_id": inc.public_id,
            "organization": inc.organization,
            "service": inc.service,
            "severity": inc.severity,
            "environment": inc.environment,
            "deployment": inc.deployment,
            "error": inc.error,
            "logs": inc.logs,
            "symptoms": json.loads(inc.symptoms_json or "[]"),
        }

        # MODE A — WITHOUT MEMORY (passes empty memories)
        eval_meta = {"available": memory.available, "provider": memory.provider, "error": memory.error}
        no_mem_analysis = await analyze_incident(payload, [], eval_meta)
        no_mem_pred = no_mem_analysis.get("likely_root_cause", "")
        no_mem_match = _is_root_cause_match(no_mem_pred, inc.actual_root_cause)
        if no_mem_match:
            without_correct += 1

        # MODE B — WITH HINDSIGHT MEMORY (recalls memories from memory bank)
        recall = await recall_for_incident(memory, payload)
        recalled_items = recall.get("items") or []

        # Enrich memories from catalog
        for item in recalled_items:
            iid = item.get("incident_id")
            if iid and not item.get("root_cause"):
                row = db.query(MemoryCatalog).filter(MemoryCatalog.incident_id == iid).one_or_none()
                if row:
                    item["organization"] = row.organization
                    item["service"] = row.service
                    item["root_cause"] = row.root_cause
                    item["resolution"] = row.resolution
                    item["outcome"] = row.outcome
                    item["source_url"] = row.source_url
                    item["source_title"] = row.source_title

        with_mem_analysis = await analyze_incident(payload, recalled_items, eval_meta)
        with_mem_pred = with_mem_analysis.get("likely_root_cause", "")
        with_mem_match = _is_root_cause_match(with_mem_pred, inc.actual_root_cause)
        if with_mem_match:
            with_correct += 1

        recalled_formatted = []
        for rm in recalled_items[:3]:
            rel = rm.get("relevance", 0)
            rel_lbl = rm.get("relevance_label") or (f"{rel}% match" if memory.provider != "hindsight" else "Retrieved by Hindsight")
            recalled_formatted.append(
                {
                    "incident_id": rm.get("incident_id"),
                    "organization": rm.get("organization"),
                    "relevance": rel,
                    "relevance_label": rel_lbl,
                    "service": rm.get("service"),
                    "root_cause": rm.get("root_cause"),
                    "resolution": rm.get("resolution"),
                    "outcome": rm.get("outcome"),
                    "source_url": rm.get("source_url"),
                    "source_title": rm.get("source_title"),
                    "text": rm.get("text") or "",
                    "tags": rm.get("tags") or [],
                }
            )

        items.append(
            {
                "incident_id": inc.public_id,
                "organization": inc.organization or "Public Postmortem",
                "title": inc.title or f"Incident on {inc.service}",
                "date": inc.date,
                "service": inc.service,
                "ground_truth_root_cause": inc.actual_root_cause or "Documented postmortem root cause",
                "without_memory_prediction": no_mem_pred,
                "without_memory_correct": no_mem_match,
                "with_memory_prediction": with_mem_pred,
                "with_memory_correct": with_mem_match,
                "recalled_memories": recalled_formatted,
                "source_url": inc.source_url,
                "source_title": inc.source_title,
            }
        )

    total = len(items)
    imp = with_correct - without_correct
    acc_no_mem = round((without_correct / total * 100), 1) if total > 0 else 0.0
    acc_with_mem = round((with_correct / total * 100), 1) if total > 0 else 0.0

    return {
        "held_out_count": total,
        "without_memory_correct_count": without_correct,
        "with_memory_correct_count": with_correct,
        "improvement_count": imp,
        "accuracy_without_memory_percent": acc_no_mem,
        "accuracy_with_memory_percent": acc_with_mem,
        "disclaimer": "Evaluation is based on our curated public postmortem dataset and should not be interpreted as production performance.",
        "items": items,
    }


def stats(db: Session) -> dict[str, Any]:
    incidents = db.query(Incident).all()
    active = len([i for i in incidents if i.status not in ("resolved", "unresolved")])
    resolved = [i for i in incidents if i.status == "resolved"]
    times = [i.resolution_time_minutes for i in resolved if i.resolution_time_minutes]
    memories = db.query(MemoryCatalog).count()
    patterns = {row.pattern for row in db.query(MemoryCatalog).all() if row.pattern}
    successful_recalls = db.query(MemoryRecallEvent).count()
    memory_assisted = 0
    for r in resolved:
        if r.analysis_json and r.analysis_json != "null":
            try:
                ana = json.loads(r.analysis_json)
                if (ana.get("memory_count") or 0) > 0 or len(ana.get("recalled_memories") or []) > 0:
                    memory_assisted += 1
            except Exception:
                pass

    return {
        "active_incidents": active,
        "resolved_incidents": len(resolved),
        "organizational_memories": memories,
        "recurring_patterns": len(patterns),
        "average_resolution_time": int(sum(times) / len(times)) if times else None,
        "successful_recalls": successful_recalls,
        "memory_assisted_resolutions": memory_assisted,
        "source": "live",
        "note": "These numbers are calculated from this local database, including seed incidents.",
    }


def patterns(db: Session) -> list[dict[str, Any]]:
    buckets: dict[str, int] = {}
    for row in db.query(MemoryCatalog).all():
        name = "Other"
        text = f"{row.pattern} {row.root_cause} {row.service}".lower()
        if "database" in text or "pool" in text or "connection" in text:
            name = "Database"
        elif "deploy" in text or "migration" in text:
            name = "Deployment"
        elif "auth" in text or "token" in text:
            name = "Authentication"
        elif "retry" in text or "timeout" in text and "notification" in text:
            name = "Retry configuration"
        elif "network" in text:
            name = "Network"
        elif "index" in text or "search" in text:
            name = "Search index"
        elif "queue" in text or "notification" in row.service.lower():
            name = "Notification"
        buckets[name] = buckets.get(name, 0) + 1
    ordered = sorted(buckets.items(), key=lambda x: x[1], reverse=True)
    return [{"name": n, "count": c, "source": "seed"} for n, c in ordered]


def ensure_seed(db: Session) -> None:
    seed_if_empty(db)
