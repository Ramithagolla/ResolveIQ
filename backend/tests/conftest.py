import os

os.environ["MEMORY_PROVIDER"] = "local"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["LLM_API_KEY"] = ""
os.environ["HINDSIGHT_API_KEY"] = ""

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.db import Base, SessionLocal, engine, init_db
from app.main import app
from app.memory.hindsight_service import HindsightService, reset_memory_service


@pytest.fixture
def client():
    get_settings.cache_clear()
    reset_memory_service(HindsightService(get_settings()))
    Base.metadata.drop_all(bind=engine)
    init_db()
    with TestClient(app) as test_client:
        yield test_client
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    get_settings.cache_clear()
    reset_memory_service(HindsightService(get_settings()))
    Base.metadata.drop_all(bind=engine)
    init_db()
    db = SessionLocal()
    try:
        from app.seed import seed_if_empty
        seed_if_empty(db)
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
