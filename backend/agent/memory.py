"""
Agent memory.

Two layers, both scoped to a chat session:

  * conversation — the chat transcript the planners reason over
  * factual      — structured evidence: scans (long-term style records) and
                   risk-factor answers, queryable by tools mid-run

In-memory only by design (no server-side persistence of medical images);
swap MemoryStore for Redis/SQLite to make it durable.
"""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


@dataclass
class ScanRecord:
    top_code: str
    top_name: str
    top_probability: float
    severity: str
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def as_dict(self) -> Dict[str, Any]:
        return {
            "top_code": self.top_code,
            "top_name": self.top_name,
            "top_probability": self.top_probability,
            "severity": self.severity,
            "timestamp": self.timestamp.isoformat(),
        }


@dataclass
class Memory:
    session_id: str
    conversation: List[Dict[str, str]] = field(default_factory=list)
    scans: List[ScanRecord] = field(default_factory=list)
    risk_answers: Dict[str, bool] = field(default_factory=dict)
    evidence: Dict[str, Any] = field(default_factory=dict)       # tool outputs, persists across turns
    pending_questions: List[Dict[str, str]] = field(default_factory=list)
    created: float = field(default_factory=time.time)

    # ---- conversation ----
    def say(self, role: str, content: str) -> None:
        self.conversation.append({"role": role, "content": content})

    def transcript(self, max_turns: int = 24) -> List[Dict[str, str]]:
        return self.conversation[-max_turns:]

    # ---- factual ----
    def add_scan(self, result: Dict[str, Any]) -> ScanRecord:
        top = result["top"]
        rec = ScanRecord(
            top_code=top["code"],
            top_name=top["name"],
            top_probability=float(top["probability"]),
            severity=top["severity"],
        )
        self.scans.append(rec)
        return rec

    def summary(self) -> Dict[str, Any]:
        """Compact factual snapshot planners can be handed."""
        return {
            "scans": [s.as_dict() for s in self.scans],
            "risk_answers": dict(self.risk_answers),
            "n_messages": len(self.conversation),
        }


class MemoryStore:
    """Session store. In-process; a durable backend slots in behind this API."""

    def __init__(self, ttl_seconds: int = 3600) -> None:
        self._sessions: Dict[str, Memory] = {}
        self._ttl = ttl_seconds

    def create(self) -> Memory:
        sid = uuid.uuid4().hex[:12]
        mem = Memory(session_id=sid)
        self._sessions[sid] = mem
        self._gc()
        return mem

    def get(self, session_id: str) -> Optional[Memory]:
        mem = self._sessions.get(session_id)
        if mem is None:
            return None
        if time.time() - mem.created > self._ttl:
            del self._sessions[session_id]
            return None
        return mem

    def _gc(self) -> None:
        now = time.time()
        for sid in [s for s, m in self._sessions.items() if now - m.created > self._ttl]:
            del self._sessions[sid]
