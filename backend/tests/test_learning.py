def test_health_reports_provider(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert "memory_provider" in body
    assert "memory_available" in body


def test_memory_list(client):
    res = client.get("/api/memory")
    assert res.status_code == 200
    assert res.json()["count"] >= 1


def test_patterns(client):
    res = client.get("/api/patterns")
    assert res.status_code == 200
    assert isinstance(res.json(), list)
