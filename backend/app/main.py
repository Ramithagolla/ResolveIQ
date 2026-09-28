import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import SessionLocal, init_db
from app.memory.hindsight_service import get_memory_service
from app.routers import demo, evaluation, health, incidents, memory
from app.seed import retain_seed_memories, seed_if_empty

logger = logging.getLogger(__name__)

_IS_VERCEL = bool(os.environ.get("VERCEL"))


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        init_db()
        db = SessionLocal()
        try:
            seed_if_empty(db)
            mem = get_memory_service()
            await mem.ensure_bank()
            # On Vercel serverless, skip bulk re-retain — memories already
            # live in Hindsight Cloud and re-retaining 16+ items would
            # exceed the function timeout.
            if not _IS_VERCEL:
                await retain_seed_memories(db, mem)
        finally:
            db.close()
    except Exception as exc:
        logger.warning("Lifespan init warning (non-fatal): %s", exc)
    yield


app = FastAPI(title="ResolveIQ", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(incidents.router, prefix="/api")
app.include_router(memory.router, prefix="/api")
app.include_router(demo.router, prefix="/api")
app.include_router(evaluation.router, prefix="/api")
