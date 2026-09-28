import os
import threading
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings


class Base(DeclarativeBase):
    pass


def _engine_url() -> str:
    url = get_settings().database_url
    if os.environ.get("VERCEL"):
        # On Vercel serverless, working directory is read-only.
        # Ensure SQLite always uses /tmp where writes are permitted.
        if "resolveiq.db" in url and not url.startswith("sqlite:////tmp"):
            return "sqlite:////tmp/resolveiq.db"
    return url


_url = _engine_url()
_sqlite = _url.startswith("sqlite")
_kwargs: dict = {}
if _sqlite:
    _kwargs["connect_args"] = {"check_same_thread": False}
    if ":memory:" in _url:
        _kwargs["poolclass"] = StaticPool
engine = create_engine(_url, **_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

_db_initialized = False
_db_lock = threading.Lock()


def init_db() -> None:
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)


def ensure_db() -> None:
    global _db_initialized
    if _db_initialized:
        return
    with _db_lock:
        if not _db_initialized:
            init_db()
            try:
                from app.seed import seed_if_empty

                db = SessionLocal()
                try:
                    seed_if_empty(db)
                finally:
                    db.close()
            except Exception as e:
                import logging

                logging.getLogger(__name__).warning("Seed error (non-fatal): %s", e)
            _db_initialized = True


def get_db():
    ensure_db()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Initialize on module load if possible
try:
    ensure_db()
except Exception:
    pass

