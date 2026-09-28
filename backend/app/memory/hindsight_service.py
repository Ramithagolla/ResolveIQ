"""Hindsight memory service.

Isolates all Hindsight SDK usage. Official APIs used:
  Hindsight(base_url, api_key)
  await client.aretain(...)
  await client.arecall(...)
  client.acreate_bank / create_bank

A local development store exists only when MEMORY_PROVIDER=local.
It is never labeled as Hindsight.
"""

from __future__ import annotations

import json
import logging
import math
import re
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)

INCIDENT_ID_RE = re.compile(r"INC-[A-Z0-9-]+", re.IGNORECASE)


class MemoryUnavailableError(Exception):
    def __init__(self, message: str = "Memory service unavailable"):
        super().__init__(message)
        self.message = message


def _tokenize(text: str) -> list[str]:
    return [t for t in re.findall(r"[a-z0-9]+", text.lower()) if len(t) > 2]


def _cosine(a: Counter[str], b: Counter[str]) -> float:
    keys = set(a) | set(b)
    if not keys:
        return 0.0
    dot = sum(a[k] * b[k] for k in keys)
    na = math.sqrt(sum(v * v for v in a.values()))
    nb = math.sqrt(sum(v * v for v in b.values()))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def format_retain_content(payload: dict[str, Any]) -> str:
    symptoms = payload.get("symptoms") or []
    tags = payload.get("tags") or []
    return (
        f"Engineering incident memory {payload.get('incident_id')}.\n"
        f"What happened: service {payload.get('service')} in {payload.get('environment')} "
        f"on deployment {payload.get('deployment')} reported {payload.get('error')}. "
        f"Symptoms: {', '.join(symptoms)}. Logs: {payload.get('logs')}.\n"
        f"What actually worked: root cause was {payload.get('root_cause')}. "
        f"Resolution applied: {payload.get('resolution')}. "
        f"Outcome: {payload.get('outcome')}. "
        f"Resolution time minutes: {payload.get('resolution_time_minutes')}.\n"
        f"Pattern: {payload.get('pattern')}. Tags: {', '.join(tags)}.\n"
        f"STRUCTURED_JSON: {json.dumps(payload, ensure_ascii=True)}"
    )


def parse_structured_from_text(text: str) -> dict[str, Any] | None:
    marker = "STRUCTURED_JSON:"
    if marker in text:
        raw = text.split(marker, 1)[1].strip()
        try:
            data = json.loads(raw)
            if isinstance(data, dict):
                return data
        except json.JSONDecodeError:
            return None
    return None


def extract_incident_id(text: str) -> str | None:
    match = INCIDENT_ID_RE.search(text or "")
    return match.group(0).upper() if match else None


def relevance_score(query: str, memory_text: str, extra: dict[str, Any] | None = None) -> int:
    """Application ranking over recalled items — not a published benchmark."""
    extra = extra or {}
    score = int(_cosine(Counter(_tokenize(query)), Counter(_tokenize(memory_text))) * 55)
    service = (extra.get("service") or "").lower()
    if service and service in query.lower():
        score += 22
    if extra.get("error") and str(extra["error"]).lower() in memory_text.lower():
        score += 12
    if extra.get("root_cause"):
        score += 5
    return max(8, min(97, score))


@dataclass
class RecalledItem:
    text: str
    incident_id: str | None
    relevance: int
    payload: dict[str, Any] = field(default_factory=dict)
    fact_type: str | None = None


class LocalMemoryIndex:
    """Deterministic local store for tests/dev. Not Hindsight."""

    def __init__(self) -> None:
        self.documents: dict[str, dict[str, Any]] = {}

    def retain(self, document_id: str, content: str, tags: list[str], payload: dict[str, Any]) -> None:
        self.documents[document_id] = {
            "content": content,
            "tags": tags,
            "payload": payload,
            "retained_at": datetime.now(timezone.utc).isoformat(),
        }

    def recall(self, query: str, limit: int = 8) -> list[RecalledItem]:
        scored: list[RecalledItem] = []
        for doc_id, doc in self.documents.items():
            payload = doc.get("payload") or {}
            rel = relevance_score(query, doc["content"], payload)
            scored.append(
                RecalledItem(
                    text=doc["content"],
                    incident_id=payload.get("incident_id") or doc_id,
                    relevance=rel,
                    payload=payload,
                )
            )
        scored.sort(key=lambda x: x.relevance, reverse=True)
        return [item for item in scored if item.relevance >= 18][:limit]


class HindsightService:
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()
        self.provider = "unavailable"
        self.available = False
        self.error: str | None = None
        self._client = None
        self._local: LocalMemoryIndex | None = None
        self.last_recall_at: str | None = None
        self.last_retain_at: str | None = None
        self.retained_count: int = 0
        self.recalled_count: int = 0
        self._init_backend()

    def _init_backend(self) -> None:
        provider = (self.settings.memory_provider or "hindsight").strip().lower()
        if provider == "local":
            self._local = LocalMemoryIndex()
            self.provider = "local-demo"
            self.available = True
            self.error = None
            logger.warning("MEMORY_PROVIDER=local — using development store, not Hindsight")
            return

        try:
            from hindsight_client import Hindsight

            kwargs: dict[str, Any] = {
                "base_url": self.settings.hindsight_base_url.rstrip("/"),
            }
            if self.settings.hindsight_api_key:
                kwargs["api_key"] = self.settings.hindsight_api_key
            self._client = Hindsight(**kwargs)
            self.provider = "hindsight"
            self.available = True
        except Exception as exc:  # pragma: no cover
            self.available = False
            self.provider = "unavailable"
            self.error = str(exc)
            logger.exception("Failed to initialize Hindsight client")

    async def ensure_bank(self) -> None:
        if not self._client:
            return
        bank_id = self.settings.hindsight_bank_id
        mission = (
            "Organizational incident memory for ResolveIQ. "
            "Retain what happened, the actual root cause, and what resolution worked."
        )
        try:
            if hasattr(self._client, "acreate_bank"):
                await self._client.acreate_bank(
                    bank_id=bank_id,
                    name="ResolveIQ Incidents",
                    mission=mission,
                )
            elif hasattr(self._client, "create_bank"):
                self._client.create_bank(
                    bank_id=bank_id,
                    name="ResolveIQ Incidents",
                    mission=mission,
                )
        except Exception as exc:
            logger.info("Hindsight bank ensure (may already exist): %s", exc)

    async def retain_memory(self, payload: dict[str, Any]) -> dict[str, Any]:
        if not self.available:
            raise MemoryUnavailableError(self.error or "Memory service unavailable")

        incident_id = payload["incident_id"]
        content = format_retain_content(payload)
        tags = list(payload.get("tags") or [])
        timestamp = payload.get("timestamp")
        now_str = datetime.now(timezone.utc).isoformat()
        self.last_retain_at = now_str
        self.retained_count += 1

        ts = None
        if timestamp:
            try:
                ts = datetime.fromisoformat(str(timestamp).replace("Z", "+00:00"))
            except ValueError:
                ts = None

        if self._local is not None:
            self._local.retain(incident_id, content, tags, payload)
            return {"provider": self.provider, "incident_id": incident_id, "ok": True}

        assert self._client is not None
        try:
            kwargs: dict[str, Any] = {
                "bank_id": self.settings.hindsight_bank_id,
                "content": content,
                "context": "engineering incident resolution — what happened and what actually worked",
                "document_id": incident_id,
                "tags": tags,
                "metadata": {
                    "source": "resolveiq",
                    "incident_id": incident_id,
                    "service": str(payload.get("service") or ""),
                },
                "retain_async": False,
            }
            if ts:
                kwargs["timestamp"] = ts
            if hasattr(self._client, "aretain"):
                await self._client.aretain(**kwargs)
            else:
                self._client.retain(**kwargs)
            logger.info("Hindsight retain succeeded for %s", incident_id)
            return {"provider": "hindsight", "incident_id": incident_id, "ok": True}
        except Exception as exc:
            logger.exception("Hindsight retain failed")
            raise MemoryUnavailableError(f"Hindsight retain failed: {exc}") from exc

    async def recall_memory(
        self,
        query: str,
        current: dict[str, Any] | None = None,
        tags: list[str] | None = None,
    ) -> dict[str, Any]:
        if not self.available:
            return {
                "ok": False,
                "available": False,
                "provider": self.provider,
                "error": self.error or "Memory service unavailable",
                "items": [],
            }

        now_str = datetime.now(timezone.utc).isoformat()
        self.last_recall_at = now_str
        self.recalled_count += 1
        current = current or {}
        if self._local is not None:
            items = self._local.recall(query)
            return {
                "ok": True,
                "available": True,
                "provider": self.provider,
                "error": None,
                "items": [self._item_to_dict(i, self.provider) for i in items],
            }

        assert self._client is not None
        try:
            kwargs: dict[str, Any] = {
                "bank_id": self.settings.hindsight_bank_id,
                "query": query,
                "budget": "high",
                "max_tokens": 4096,
            }
            if tags:
                kwargs["tags"] = tags
            if hasattr(self._client, "arecall"):
                response = await self._client.arecall(**kwargs)
            else:
                response = self._client.recall(**kwargs)
            raw_results = getattr(response, "results", None) or []
            items: list[RecalledItem] = []
            for result in raw_results:
                text = getattr(result, "text", None) or str(result)
                payload = parse_structured_from_text(text) or {}
                incident_id = payload.get("incident_id") or extract_incident_id(text)
                merged = {**current, **payload}
                items.append(
                    RecalledItem(
                        text=text,
                        incident_id=incident_id,
                        relevance=relevance_score(query, text, merged if payload else current),
                        payload=payload,
                        fact_type=getattr(result, "type", None),
                    )
                )
            items.sort(key=lambda x: x.relevance, reverse=True)
            logger.info("Hindsight recall returned %s results", len(items))
            return {
                "ok": True,
                "available": True,
                "provider": "hindsight",
                "error": None,
                "items": [self._item_to_dict(i, "hindsight") for i in items],
            }
        except Exception as exc:
            logger.exception("Hindsight recall failed")
            return {
                "ok": False,
                "available": False,
                "provider": "hindsight",
                "error": f"Hindsight recall failed: {exc}",
                "items": [],
            }

    @staticmethod
    def _item_to_dict(item: RecalledItem, provider: str = "local") -> dict[str, Any]:
        p = item.payload
        # As required by requirement 4: If Hindsight returns a relevance score display it, otherwise 'Retrieved by Hindsight'
        relevance_label = f"{item.relevance}% match" if provider != "hindsight" else "Retrieved by Hindsight"
        return {
            "incident_id": item.incident_id,
            "organization": p.get("organization"),
            "relevance": item.relevance,
            "relevance_label": relevance_label,
            "text": item.text,
            "service": p.get("service"),
            "root_cause": p.get("root_cause"),
            "resolution": p.get("resolution"),
            "outcome": p.get("outcome"),
            "source_url": p.get("source_url"),
            "source_title": p.get("source_title"),
            "tags": p.get("tags") or [],
            "payload": p,
            "is_corrected": bool(p.get("is_corrected") or len(p.get("versions") or []) > 1),
            "original_hypothesis": p.get("original_hypothesis"),
        }

    def build_recall_query(self, incident: dict[str, Any]) -> str:
        logs = (incident.get("logs") or "")[:800]
        return (
            "Find similar resolved engineering incidents. "
            f"Service: {incident.get('service')}. "
            f"Error: {incident.get('error')}. "
            f"Environment: {incident.get('environment')}. "
            f"Deployment: {incident.get('deployment')}. "
            f"Logs: {logs}. "
            "Prefer memories that include the actual root cause and the resolution that worked."
        )


_service: HindsightService | None = None


def get_memory_service() -> HindsightService:
    global _service
    if _service is None:
        _service = HindsightService()
    return _service


def reset_memory_service(service: HindsightService | None = None) -> HindsightService:
    global _service
    _service = service if service is not None else HindsightService()
    return _service
