from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class IncidentCreate(BaseModel):
    service: str = Field(min_length=1, max_length=128)
    severity: Literal["SEV-1", "SEV-2", "SEV-3", "SEV-4"] = "SEV-2"
    environment: str = Field(min_length=1, max_length=64)
    deployment: str = Field(min_length=1, max_length=128)
    error: str = Field(min_length=1, max_length=256)
    logs: str = ""


class ResolveRequest(BaseModel):
    root_cause: str = Field(min_length=1)
    actual_resolution: str = Field(min_length=1)
    resolution_notes: str = ""
    resolution_status: Literal["Resolved", "Mitigated", "Unresolved"] = "Resolved"
    recommendation_helped: bool = True


class RecallRequest(BaseModel):
    query: str | None = None
    incident_id: str | None = None
    service: str | None = None
    error: str | None = None
    logs: str | None = None
    deployment: str | None = None
    environment: str | None = None


class CorrectionRequest(BaseModel):
    actual_root_cause: str = Field(min_length=1)
    actual_resolution: str = Field(min_length=1)
    engineer_note: str = ""


class MemoryVersion(BaseModel):
    version: int
    hypothesis_or_root_cause: str
    resolution: str | None = None
    status: str
    corrected_by: str | None = None
    created_at: str


class MemoryRecord(BaseModel):
    incident_id: str
    organization: str | None = None
    service: str
    severity: str | None = None
    environment: str | None = None
    deployment: str | None = None
    symptoms: list[str] = []
    logs: str | None = None
    root_cause: str
    resolution: str
    outcome: str
    resolution_time_minutes: int | None = None
    timestamp: str | None = None
    tags: list[str] = []
    pattern: str | None = None
    relevance: int | None = None
    relevance_label: str | None = None
    source_url: str | None = None
    source_title: str | None = None
    versions: list[dict[str, Any]] = []


class RecalledMemory(BaseModel):
    incident_id: str | None = None
    organization: str | None = None
    relevance: int
    relevance_label: str | None = None
    service: str | None = None
    root_cause: str | None = None
    resolution: str | None = None
    outcome: str | None = None
    source_url: str | None = None
    source_title: str | None = None
    text: str
    tags: list[str] = []
    is_corrected: bool = False
    original_hypothesis: str | None = None


class AnalysisResult(BaseModel):
    likely_root_cause: str
    confidence: str
    recommended_investigation: str
    recommended_resolution: str
    current_evidence: list[str]
    historical_evidence: list[str]
    why_this_recommendation: list[str]
    recalled_memories: list[RecalledMemory]
    memory_count: int
    memory_available: bool
    memory_provider: str
    memory_error: str | None = None
    llm_available: bool
    analyzer_mode: Literal["llm", "heuristic"]
    without_memory_summary: str
    with_memory_summary: str


class IncidentOut(BaseModel):
    public_id: str
    organization: str | None = None
    title: str | None = None
    date: str | None = None
    service: str
    severity: str
    environment: str
    deployment: str
    error: str
    logs: str
    status: str
    symptoms: list[str]
    impact: str | None = None
    analysis: dict[str, Any] | None = None
    predicted_root_cause: str | None = None
    actual_root_cause: str | None = None
    actual_resolution: str | None = None
    resolution_notes: str | None = None
    lessons_learned: str | None = None
    source_url: str | None = None
    source_title: str | None = None
    is_held_out: bool = False
    correction_history: list[dict[str, Any]] = []
    outcome: str | None = None
    resolution_time_minutes: int | None = None
    memory_retained: bool
    is_seed: bool
    timeline: list[dict[str, Any]]
    created_at: datetime
    analyzed_at: datetime | None = None
    resolved_at: datetime | None = None


class HeldOutEvalItem(BaseModel):
    incident_id: str
    organization: str
    title: str
    date: str | None = None
    service: str
    ground_truth_root_cause: str
    without_memory_prediction: str
    without_memory_correct: bool
    with_memory_prediction: str
    with_memory_correct: bool
    recalled_memories: list[RecalledMemory]
    source_url: str | None = None
    source_title: str | None = None


class EvaluationSummary(BaseModel):
    held_out_count: int
    without_memory_correct_count: int
    with_memory_correct_count: int
    improvement_count: int
    accuracy_without_memory_percent: float
    accuracy_with_memory_percent: float
    disclaimer: str
    items: list[HeldOutEvalItem]


class LearnResult(BaseModel):
    incident_id: str
    memory_created: bool
    memory_provider: str
    predicted_root_cause: str | None
    actual_root_cause: str
    match: bool
    pattern: str
    successful_fix: str
    memories_before: int
    memories_after: int
    new_memory: MemoryRecord
    evolution: dict[str, Any]


class StatsOut(BaseModel):
    active_incidents: int
    resolved_incidents: int
    organizational_memories: int
    recurring_patterns: int
    average_resolution_time: int | None
    successful_recalls: int = 0
    memory_assisted_resolutions: int = 0
    source: Literal["live"]
    note: str


class PatternOut(BaseModel):
    name: str
    count: int
    source: Literal["live", "seed"]


class HealthOut(BaseModel):
    status: str
    memory_provider: str
    memory_available: bool
    memory_error: str | None = None
    bank_id: str | None = None
    last_recall_at: str | None = None
    last_retain_at: str | None = None
    retained_count: int = 0
    recalled_count: int = 0
    llm_available: bool

