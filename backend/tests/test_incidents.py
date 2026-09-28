def test_create_incident(client):
    response = client.post(
        "/api/incidents",
        json={
            "service": "Payment API",
            "severity": "SEV-1",
            "environment": "Production",
            "deployment": "payment-v2.4.2",
            "error": "Connection timeout",
            "logs": "Database connections unavailable",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "Payment API"
    assert data["status"] == "open"
    assert data["public_id"].startswith("INC-")


def test_create_invalid(client):
    response = client.post("/api/incidents", json={"service": ""})
    assert response.status_code == 422


def test_analyze_and_resolve_and_learn(client):
    created = client.post(
        "/api/incidents",
        json={
            "service": "Payment API",
            "severity": "SEV-1",
            "environment": "Production",
            "deployment": "payment-v2.4.9",
            "error": "Connection timeout",
            "logs": "Database connection timeout. Connection pool exhausted.",
        },
    ).json()
    pid = created["public_id"]
    analyzed = client.post(f"/api/incidents/{pid}/analyze")
    assert analyzed.status_code == 200
    body = analyzed.json()
    assert "analysis" in body
    assert body["analysis"]["likely_root_cause"]

    resolved = client.post(
        f"/api/incidents/{pid}/resolve",
        json={
            "root_cause": "Database connection pool exhaustion",
            "actual_resolution": "Increase connection pool from 50 to 100",
            "resolution_notes": "Confirmed pool waiters.",
            "resolution_status": "Resolved",
            "recommendation_helped": True,
        },
    )
    assert resolved.status_code == 200
    learn = resolved.json()["learn"]
    assert learn["actual_root_cause"] == "Database connection pool exhaustion"
    assert learn["successful_fix"]
    assert "new_memory" in learn

    learned = client.post(f"/api/incidents/{pid}/learn")
    assert learned.status_code == 200
    assert learned.json()["actual_root_cause"]
    memory = client.get(f"/api/memory/{pid}")
    assert memory.status_code == 200
    assert memory.json()["resolution"]
