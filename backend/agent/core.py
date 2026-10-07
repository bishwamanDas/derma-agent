"""
Agent core: supervisor orchestration over intake, triage, and care advisor agents.

Multi-Agent Clinical Pipeline:
1. Intake: extracts patient symptoms and conversational queries.
2. Vision Specialist: runs MobileNetV3 CNN + morphological ABCDE extraction.
3. Clinical Triage: fuses vision, risk factors, symptoms, and temporal history into urgency.
4. Care Advisor: writes structured clinical triage report, doctor questions, and recommendations.
5. Follow-up: LLM-powered (Gemini) conversational Q&A using gathered evidence.

Every step is emitted as an event so the frontend can render the live reasoning trace.
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any, Dict, Iterator, List, Optional

from .memory import Memory
from .llm_chat import is_llm_available, llm_followup
from .planners import AgentState, Decision, PolicyPlanner, build_planner
from .registry import ToolContext, ToolRegistry, build_registry

MAX_STEPS = 14

DISCLAIMER = (
    "Helix Derm is an educational screening aid, not a medical device or a definitive "
    "diagnosis. Any lesion that is new, changing, bleeding or concerning should be "
    "examined in person by a board-certified dermatologist."
)


@dataclass
class Step:
    type: str
    data: Dict[str, Any]


@dataclass
class RunResult:
    events: List[Dict[str, Any]]
    report: Optional[Dict[str, Any]]


@dataclass
class TriageAgent:
    """Gathers clinical evidence using the tool registry."""
    name: str = "triage-agent"
    planner: Any = None
    allowed_tools: List[str] = field(default_factory=lambda: [
        "analyze_image", "extract_abcde_features", "assess_risk",
        "lookup_condition", "compare_history", "check_urgency",
        "search_clinical_knowledge", "analyze_symptoms", "generate_doctor_questions",
    ])


@dataclass
class AdvisorAgent:
    """Turns multi-modal clinical evidence into a patient-facing care plan."""
    name: str = "care-advisor"
    llm: Any = None

    def compose(self, evidence: Dict[str, Any], memory: Memory) -> Dict[str, Any]:
        base = self._deterministic_plan(evidence)
        if self.llm is not None:
            written = self._llm_plan(evidence, base)
            if written:
                base["care_plan"]["narrative"] = written
        return base

    def _deterministic_plan(self, ev: Dict[str, Any]) -> Dict[str, Any]:
        urg = ev.get("urgency", {})
        cond = ev.get("condition", {})
        analysis = ev.get("analysis", {})
        abcde = ev.get("abcde", {})
        risk = ev.get("risk", {})
        history = ev.get("history", {})
        symptoms = ev.get("symptoms", {})
        doctor_qs = ev.get("doctor_questions", {}).get("questions", [])

        urgency = urg.get("urgency", "routine")
        headline = {
            "routine": "Routine Monitoring — Low Clinical Concern",
            "soon": "Non-Urgent Dermatologist Review Advised",
            "urgent": "Prompt Dermatologist Evaluation Strongly Recommended",
        }.get(urgency, "Clinical Triage Complete")

        narrative_parts = []
        if cond.get("name") and analysis:
            conf = analysis.get("top_probability")
            conf_txt = f" ({conf:.0%} certainty)" if isinstance(conf, (int, float)) else ""
            narrative_parts.append(
                f"Our ISIC-2019 neural network classified your lesion most consistently with "
                f"**{cond.get('name')}**{conf_txt}."
            )
            if cond.get("description"):
                narrative_parts.append(cond["description"])

        if abcde.get("composite_score"):
            narrative_parts.append(
                f"Morphological computer vision evaluated an ABCDE score of **{abcde['composite_score']}/10** "
                f"({abcde.get('overall_band')})."
            )

        if symptoms.get("symptoms_detected"):
            narrative_parts.append(
                f"Noted patient symptoms: {', '.join(symptoms['symptoms_detected'])}."
            )

        if history.get("status") == "compared":
            if history.get("top_class_changed"):
                narrative_parts.append(
                    "⚠️ Noticeable diagnostic shift detected compared to your previous scan record."
                )
            else:
                narrative_parts.append(
                    "Reassuringly, this reading remains stable compared with your earlier session scan."
                )

        if risk.get("band") not in (None, "provisional"):
            narrative_parts.append(
                f"Personal skin cancer risk index: **{risk['band']}** ({risk.get('score', 0)}/{risk.get('max_score', 20)} pts)."
            )

        return {
            "headline": headline,
            "urgency": urgency,
            "care_plan": {
                "text": " ".join(narrative_parts),
                "tips": list(cond.get("tips", [])),
                "reasons": urg.get("reasons", []),
                "doctor_questions": doctor_qs,
                "biopsy_recommendation": cond.get("biopsy", ""),
                "clinical_pearl": cond.get("pearl", ""),
                "dermoscopy_hallmarks": cond.get("dermoscopy_hallmarks", []),
            },
            "abcde": abcde,
        }

    def _llm_plan(self, ev: Dict[str, Any], base: Dict[str, Any]) -> Optional[str]:
        """Ask LLM to summarize care plan in compassionate, patient-friendly language."""
        import json
        try:
            resp = self.llm._chat([
                {"role": "system", "content":
                    "You are a clinical care advisor in a dermatology screening assistant. "
                    "Write a clear, calm, professional summary (max ~100 words) in first-person "
                    "('After analyzing your lesion and symptoms...'). Include recommended timeline. "
                    "Never claim a definitive diagnosis. No markdown headers."},
                {"role": "user", "content": json.dumps(
                    {"care_plan": base, "urgency": base.get("urgency"),
                     "condition": ev.get("condition", {}).get("name")},
                    default=str)[:3000]},
            ])
            return resp["choices"][0]["message"]["content"].strip() or None
        except Exception:
            return None


class Orchestrator:
    """Supervisor: coordinates intake, triage, and advisor agents."""

    def __init__(self, registry: Optional[ToolRegistry] = None):
        self.registry = registry or build_registry()
        self.planner = build_planner()
        llm = self.planner if hasattr(self.planner, "_chat") else None
        self.triage = TriageAgent(planner=self.planner)
        self.advisor = AdvisorAgent(llm=llm)

    @property
    def backend_name(self) -> str:
        return self.planner.name

    def run(self, memory: Memory, user_message: str,
            image_bytes: Optional[bytes] = None) -> Iterator[Dict[str, Any]]:
        ctx = ToolContext(session_id=memory.session_id, memory=memory,
                          pending_image=image_bytes)
        memory.say("user", user_message or ("[attached a photo]" if image_bytes else ""))

        state = AgentState(
            transcript=memory.transcript(),
            evidence=dict(memory.evidence),
            pending_questions=list(memory.pending_questions),
            asked_about_image=any(m["role"] == "assistant" for m in memory.conversation),
            has_attached_image=image_bytes is not None,
        )

        # -----------------------------------------------------------------
        # LLM-POWERED FOLLOW-UP: if report was already shown and user is
        # just chatting (no new image), try the LLM for a natural response.
        # Falls back to the deterministic PolicyPlanner if LLM unavailable.
        # -----------------------------------------------------------------
        if (image_bytes is None
            and self._report_already_shown(memory)
            and self._all_evidence_gathered(memory.evidence)
            and user_message
            and not user_message.startswith("[attached")):

            yield self._ev("thought", {
                "agent": self.triage.name,
                "planner": "llm-followup" if is_llm_available() else "policy-engine",
                "text": "Follow-up question detected. Generating a contextual response from the clinical evidence.",
            })

            llm_reply = llm_followup(
                evidence=memory.evidence,
                transcript=memory.transcript(),
                user_message=user_message,
            )

            if llm_reply:
                memory.say("assistant", llm_reply)
                yield self._ev("message", {
                    "agent": self.triage.name,
                    "text": llm_reply,
                    "suggestions": ["Is this harmful?", "What should I do?",
                                    "Explain ABCDE score", "Scan another photo"],
                })
                yield self._ev("done", {"finished": False, "backend": self.backend_name})
                return
            # else: LLM not available or failed, fall through to PolicyPlanner

        planner = self.triage.planner
        finished = False

        for step in range(MAX_STEPS):
            try:
                decision: Decision = planner.plan(
                    state, self.registry,
                    context={"has_attached_image": state.has_attached_image},
                )
            except Exception as exc:
                if planner is not self.__class__._policy:
                    yield self._ev("error", {
                        "message": f"LLM planner failed ({exc}); switching to the deterministic clinical policy engine."})
                    planner = self.__class__._policy
                    continue
                yield self._ev("error", {"message": f"Planner error: {exc}"})
                break

            if decision.thought:
                yield self._ev("thought", {"agent": self.triage.name,
                                           "planner": decision.planner,
                                           "text": decision.thought})

            if decision.kind == "tool":
                if decision.tool not in self.triage.allowed_tools:
                    yield self._ev("observation", {
                        "tool": decision.tool, "ok": False,
                        "error": "tool not permitted for the triage agent"})
                    continue
                yield self._ev("tool", {"agent": self.triage.name,
                                        "tool": decision.tool, "args": decision.args})
                t0 = time.perf_counter()
                obs = self.registry.call(decision.tool, decision.args, ctx)
                obs["ms"] = round((time.perf_counter() - t0) * 1000, 1)
                yield self._ev("observation", {"tool": decision.tool, **obs})
                self._absorb(state, decision.tool, obs)
                continue

            if decision.kind == "message":
                memory.say("assistant", decision.text)
                payload: Dict[str, Any] = {
                    "agent": self.triage.name,
                    "text": decision.text,
                }
                if decision.suggestions:
                    payload["suggestions"] = decision.suggestions
                yield self._ev("message", payload)
                break

            if decision.kind == "final":
                finished = True
                break

        self._sync(memory, state)

        if finished:
            yield self._ev("thought", {
                "agent": self.advisor.name, "planner": "supervisor",
                "text": "All diagnostic evidence gathered. Compiling clinical report, ABCDE analysis, and consultation questions."
            })
            report = self.advisor.compose(state.evidence, memory)
            report["disclaimer"] = DISCLAIMER
            report["session_id"] = memory.session_id
            report["backend"] = self.backend_name
            report["evidence"] = {
                k: state.evidence.get(k) for k in
                ("analysis", "abcde", "risk", "history", "symptoms", "condition", "doctor_questions", "urgency")
            }
            memory.say("assistant", f"[report] {report.get('headline', '')}")
            yield self._ev("report", report)

        yield self._ev("done", {"finished": finished, "backend": self.backend_name})

    _policy = PolicyPlanner()

    @staticmethod
    def _report_already_shown(memory: Memory) -> bool:
        """True when the triage report has already been emitted in the conversation."""
        return any("[report]" in m.get("content", "")
                   for m in memory.conversation if m["role"] == "assistant")

    @staticmethod
    def _all_evidence_gathered(evidence: Dict[str, Any]) -> bool:
        """True when all pipeline stages have run."""
        return all(k in evidence for k in
                   ("analysis", "abcde", "risk", "condition", "urgency", "doctor_questions"))

    @staticmethod
    def _ev(type_: str, data: Dict[str, Any]) -> Dict[str, Any]:
        return {"type": type_, **data}

    @staticmethod
    def _absorb(state: AgentState, tool: str, obs: Dict[str, Any]) -> None:
        if not obs.get("ok"):
            return
        key_map = {
            "analyze_image": "analysis",
            "extract_abcde_features": "abcde",
            "assess_risk": "risk",
            "lookup_condition": "condition",
            "compare_history": "history",
            "check_urgency": "urgency",
            "search_clinical_knowledge": "knowledge_query",
            "analyze_symptoms": "symptoms",
            "generate_doctor_questions": "doctor_questions",
        }
        key = key_map.get(tool)
        if key:
            state.evidence[key] = {k: v for k, v in obs.items() if k not in ("ok", "ms")}

    @staticmethod
    def _sync(memory: Memory, state: AgentState) -> None:
        memory.evidence = dict(state.evidence)
        memory.pending_questions = list(state.pending_questions)
