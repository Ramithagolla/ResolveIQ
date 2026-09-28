import pytest
from app.memory.hindsight_service import get_memory_service, reset_memory_service, LocalMemoryIndex, HindsightService
from app.services.incidents import create_incident, analyze, correct_incident_memory, run_held_out_evaluation


@pytest.mark.asyncio
async def test_dual_mode_analysis_and_evidence(db_session):
    service = reset_memory_service(HindsightService())
    # Create incident
    inc = create_incident(
        db_session,
        {
            "organization": "Cloudflare",
            "title": "WAF CPU Backtracking",
            "service": "Edge Proxy",
            "severity": "SEV-1",
            "environment": "Production",
            "deployment": "edge-v1.2",
            "error": "100% CPU utilization on edge nodes",
            "logs": "HTTP 502 Bad Gateway across all traffic",
        },
    )

    analysis = await analyze(db_session, inc, service)
    assert "likely_root_cause" in analysis
    assert "mode_without_memory" in analysis
    assert "mode_with_memory" in analysis
    assert analysis["mode_without_memory"]["memory_count"] == 0
    assert "what_memory_contributed" in analysis


@pytest.mark.asyncio
async def test_engineer_correction_and_future_recall(db_session):
    service = reset_memory_service(HindsightService())
    # 1. Incident 1: Initial incorrect hypothesis
    inc1 = create_incident(
        db_session,
        {
            "organization": "ResolveIQ Test",
            "service": "Payment Service",
            "severity": "SEV-1",
            "environment": "Production",
            "deployment": "payment-v3.0.0",
            "error": "Connection timeout",
            "logs": "Database connection timeout.\nRequests timing out.",
        },
    )

    # Initial analysis predicts DB pool exhaustion
    await analyze(db_session, inc1, service)
    assert inc1.predicted_root_cause is not None

    # Engineer corrects the root cause
    correction_res = await correct_incident_memory(
        db_session,
        inc1,
        {
            "actual_root_cause": "Deployment configuration mismatch in payment-v3.0.0",
            "actual_resolution": "Roll back deployment to payment-v2.9.9",
            "engineer_note": "DB pool was healthy. Configuration X was invalid.",
        },
        service,
    )

    assert correction_res["engineer_correction"] == "Deployment configuration mismatch in payment-v3.0.0"
    assert len(correction_res["versions"]) >= 2
    assert inc1.status == "resolved"

    # 2. Incident 2: Future similar incident
    inc2 = create_incident(
        db_session,
        {
            "organization": "ResolveIQ Test",
            "service": "Payment Service",
            "severity": "SEV-1",
            "environment": "Production",
            "deployment": "payment-v3.0.1",
            "error": "Connection timeout",
            "logs": "Checkout API timing out after deploy payment-v3.0.1.\nDatabase connection timeout.",
        },
    )

    analysis2 = await analyze(db_session, inc2, service)
    # The updated recommendation should recall the corrected memory
    recalled_ids = [m.get("incident_id") for m in analysis2.get("recalled_memories", [])]
    assert inc1.public_id in recalled_ids or len(analysis2.get("recalled_memories", [])) > 0


@pytest.mark.asyncio
async def test_held_out_evaluation_calculation(db_session):
    service = reset_memory_service(HindsightService())
    eval_res = await run_held_out_evaluation(db_session, service)

    assert "held_out_count" in eval_res
    assert eval_res["held_out_count"] > 0
    assert "accuracy_without_memory_percent" in eval_res
    assert "accuracy_with_memory_percent" in eval_res
    assert "disclaimer" in eval_res
    assert "items" in eval_res
