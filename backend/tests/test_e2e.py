def test_end_to_end_memory_loop(client):
    demo = client.post("/api/demo/launch")
    assert demo.status_code == 200
    payload = demo.json()
    assert payload["historical"]["public_id"] == "INC-1042"
    new_id = payload["new_incident"]["public_id"]

    analyzed = client.post(f"/api/incidents/{new_id}/analyze").json()
    analysis = analyzed["analysis"]
    ids = [m["incident_id"] for m in analysis["recalled_memories"] if m.get("incident_id")]
    assert "INC-1042" in ids
    assert analysis["memory_count"] >= 1
    assert "pool" in analysis["likely_root_cause"].lower() or "connection" in analysis["likely_root_cause"].lower()
    assert analysis["why_this_recommendation"]

    resolved = client.post(
        f"/api/incidents/{new_id}/resolve",
        json={
            "root_cause": "Database connection pool exhaustion",
            "actual_resolution": "Increase connection pool from 50 to 100",
            "resolution_notes": "Matched INC-1042",
            "resolution_status": "Resolved",
        },
    ).json()
    assert resolved["learn"]["memory_created"] is True
    assert resolved["incident"]["status"] == "resolved"

    follow = client.post("/api/demo/follow-up").json()
    second = client.post(f"/api/incidents/{follow['public_id']}/analyze").json()
    recalled_ids = [m["incident_id"] for m in second["analysis"]["recalled_memories"] if m.get("incident_id")]
    assert new_id in recalled_ids or "INC-1042" in recalled_ids
