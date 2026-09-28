from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    public_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    organization: Mapped[str | None] = mapped_column(String(128), nullable=True)
    title: Mapped[str | None] = mapped_column(String(256), nullable=True)
    date: Mapped[str | None] = mapped_column(String(32), nullable=True)
    service: Mapped[str] = mapped_column(String(128))
    severity: Mapped[str] = mapped_column(String(16))
    environment: Mapped[str] = mapped_column(String(64))
    deployment: Mapped[str] = mapped_column(String(128))
    error: Mapped[str] = mapped_column(String(256))
    logs: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(32), default="open")
    symptoms_json: Mapped[str] = mapped_column(Text, default="[]")
    impact: Mapped[str | None] = mapped_column(Text, nullable=True)
    analysis_json: Mapped[str] = mapped_column(Text, default="null")
    predicted_root_cause: Mapped[str | None] = mapped_column(Text, nullable=True)
    actual_root_cause: Mapped[str | None] = mapped_column(Text, nullable=True)
    actual_resolution: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    lessons_learned: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_title: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_held_out: Mapped[bool] = mapped_column(default=False)
    correction_history_json: Mapped[str] = mapped_column(Text, default="[]")
    outcome: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolution_time_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    recommendation_helped: Mapped[bool | None] = mapped_column(nullable=True)
    memory_retained: Mapped[bool] = mapped_column(default=False)
    is_seed: Mapped[bool] = mapped_column(default=False)
    timeline_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    analyzed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class MemoryCatalog(Base):
    """Application catalog of memories retained into Hindsight (not a recall engine)."""

    __tablename__ = "memory_catalog"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    incident_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    organization: Mapped[str | None] = mapped_column(String(128), nullable=True)
    service: Mapped[str] = mapped_column(String(128))
    pattern: Mapped[str] = mapped_column(String(256))
    root_cause: Mapped[str] = mapped_column(Text)
    resolution: Mapped[str] = mapped_column(Text)
    outcome: Mapped[str] = mapped_column(Text)
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_title: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload_json: Mapped[str] = mapped_column(Text)
    tags_json: Mapped[str] = mapped_column(Text, default="[]")
    versions_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class MemoryRecallEvent(Base):
    """Tracks every time a memory document is recalled during an incident analysis."""

    __tablename__ = "memory_recall_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    memory_id: Mapped[str] = mapped_column(String(32), index=True)
    incident_id: Mapped[str] = mapped_column(String(32), index=True)
    relevance: Mapped[int] = mapped_column(Integer, default=0)
    recalled_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
