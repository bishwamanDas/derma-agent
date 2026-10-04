"""
Tool registry for the triage agents.

A Tool is a callable with a JSON-schema description — the same shape an LLM
function-calling API expects, so the identical registry feeds both the
deterministic PolicyPlanner and a real LLM.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from diseases import DISEASES, SEVERITY_META
from agent.abcde import extract_abcde
from agent.knowledge import (
    search_knowledge,
    parse_symptoms,
    build_doctor_questions,
    CLINICAL_KNOWLEDGE,
)


@dataclass
class Tool:
    name: str
    description: str
    parameters: Dict[str, Any]  # JSON Schema
    fn: Callable[[Dict[str, Any], "ToolContext"], Dict[str, Any]]

    def to_function_schema(self) -> Dict[str, Any]:
        """OpenAI function-calling schema for this tool."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }


@dataclass
class ToolContext:
    """Per-session state handed to every tool call."""
    session_id: str
    memory: Any  # agent.memory.Memory (avoid circular import)
    pending_image: Optional[bytes] = None
    last_analysis: Optional[Dict[str, Any]] = None
    last_abcde: Optional[Dict[str, Any]] = None
    symptoms: List[str] = field(default_factory=list)


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: Dict[str, Tool] = {}

    def register(self, tool: Tool) -> None:
        self._tools[tool.name] = tool

    def get(self, name: str) -> Optional[Tool]:
        return self._tools.get(name)

    def names(self) -> List[str]:
        return list(self._tools)

    def call(self, name: str, args: Dict[str, Any], ctx: ToolContext) -> Dict[str, Any]:
        tool = self._tools.get(name)
        if tool is None:
            return {"ok": False, "error": f"unknown tool '{name}'"}
        try:
            out = tool.fn(args or {}, ctx)
            return {"ok": True, **out}
        except Exception as exc:  # tools must never kill the loop
            return {"ok": False, "error": f"{type(exc).__name__}: {exc}"}

    def schemas(self) -> List[Dict[str, Any]]:
        return [t.to_function_schema() for t in self._tools.values()]


# --------------------------------------------------------------------------
# risk model (mirrors the frontend Risk Check so chat and quiz agree)
# --------------------------------------------------------------------------
RISK_FACTORS = {
    "phototype": {
        "question": "Does your skin burn easily and rarely tan?",
        "weight": 3,
    },
    "sunburn": {
        "question": "Have you had one or more blistering sunburns?",
        "weight": 3,
    },
    "exposure": {
        "question": "Do you spend most days outdoors in strong sun?",
        "weight": 3,
    },
    "solarium": {
        "question": "Have you used tanning beds or sunlamps?",
        "weight": 3,
    },
    "family": {
        "question": "Is there skin cancer in your close family?",
        "weight": 3,
    },
    "moles": {
        "question": "Do you have many moles (50+), or any that look unusual?",
        "weight": 3,
    },
    "age": {
        "question": "Are you 50 or older?",
        "weight": 2,
    },
}
MAX_RISK = sum(f["weight"] for f in RISK_FACTORS.values())


def _risk_band(score: int) -> str:
    pct = score / MAX_RISK
    if pct < 0.25:
        return "low"
    if pct < 0.5:
        return "moderate"
    if pct < 0.75:
        return "elevated"
    return "high"


# --------------------------------------------------------------------------
# tool implementations
# --------------------------------------------------------------------------
def _analyze_image(args: Dict[str, Any], ctx: ToolContext) -> Dict[str, Any]:
    """Vision tool: runs the ISIC-2019 classifier over the attached photo."""
    import app as inference

    if ctx.pending_image is None:
        return {"status": "no_image", "message": "No image is attached to this session yet."}
    result = inference.classify(ctx.pending_image)
    ctx.last_analysis = result
    ctx.memory.add_scan(result)
    top = result["top"]
    return {
        "status": "classified",
        "top_prediction": top["code"],
        "top_name": top["name"],
        "top_probability": top["probability"],
        "summary": (f"Top match: {top['name']} at {top['probability']:.0%} confidence "
                    f"({top['severity']} concern)."),
        "alternatives": [
            {"code": p["code"], "name": p["name"], "probability": p["probability"]}
            for p in result["predictions"][1:]
        ],
        "severity": top["severity"],
        "inference_ms": result["inference_ms"],
    }


def _extract_abcde_features(args: Dict[str, Any], ctx: ToolContext) -> Dict[str, Any]:
    """Computer vision tool: extracts ABCDE morphological features from the image."""
    if ctx.pending_image is None:
        return {"status": "no_image", "message": "No image attached for ABCDE analysis."}
    
    hist = None
    if len(ctx.memory.scans) >= 2:
        hist = _compare_history({}, ctx)
        
    abcde_res = extract_abcde(ctx.pending_image, history_scan=hist)
    ctx.last_abcde = abcde_res
    return abcde_res


def _assess_risk(args: Dict[str, Any], ctx: ToolContext) -> Dict[str, Any]:
    """Scores answered risk factors; returns band + still-missing factors."""
    answers: Dict[str, bool] = ctx.memory.risk_answers
    answers.update({k: bool(v) for k, v in (args.get("answers") or {}).items()
                    if k in RISK_FACTORS})
    ctx.memory.risk_answers = answers

    score = sum(RISK_FACTORS[k]["weight"] for k, v in answers.items() if v)
    missing = [
        {"key": k, "question": RISK_FACTORS[k]["question"]}
        for k in RISK_FACTORS if k not in answers
    ]
    band = _risk_band(score) if not missing else "provisional"
    answered_n = len(answers)
    remaining_n = len(missing)
    return {
        "score": score,
        "max_score": MAX_RISK,
        "band": band,
        "summary": (f"I've scored {answered_n} of the {len(RISK_FACTORS)} risk factors"
                    + (f" — your risk band is {band}." if band != "provisional"
                       else f"; {remaining_n} question{'' if remaining_n == 1 else 's'} "
                            f"still to go.")),
        "answered": sorted(answers),
        "missing": missing,
    }


def _lookup_condition(args: Dict[str, Any], ctx: ToolContext) -> Dict[str, Any]:
    """Knowledge-base tool: clinical description, red flags and care tips."""
    code = str(args.get("condition", "")).upper()
    if code not in DISEASES:
        return {"status": "not_found", "known": sorted(DISEASES)}
    meta = DISEASES[code]
    sev = SEVERITY_META[meta["severity"]]
    clin = CLINICAL_KNOWLEDGE.get(code, {})
    return {
        "code": code,
        "name": meta["name"],
        "severity": meta["severity"],
        "summary": f"{meta['name']} — {sev['label'].lower()}. {meta['description']}",
        "severity_label": sev["label"],
        "description": meta["description"],
        "tips": meta["tips"],
        "category": clin.get("category", "Cutaneous Lesion"),
        "dermoscopy_hallmarks": clin.get("dermoscopy_hallmarks", []),
        "biopsy": clin.get("biopsy_recommendation", ""),
        "pearl": clin.get("clinical_pearl", ""),
    }


def _compare_history(args: Dict[str, Any], ctx: ToolContext) -> Dict[str, Any]:
    """Memory tool: how does this scan relate to previous scans in the session?"""
    scans = ctx.memory.scans
    if len(scans) < 2 or ctx.last_analysis is None:
        return {
            "status": "no_history",
            "summary": "No earlier scan in this conversation to compare against yet.",
        }
    current = scans[-1]
    previous = scans[-2]
    same_top = current.top_code == previous.top_code
    drift = abs(current.top_probability - previous.top_probability)
    days = (current.timestamp - previous.timestamp).total_seconds() / 86400
    return {
        "status": "compared",
        "previous_top": previous.top_code,
        "previous_probability": round(previous.top_probability, 3),
        "current_top": current.top_code,
        "current_probability": round(current.top_probability, 3),
        "top_class_changed": not same_top,
        "confidence_drift": round(drift, 3),
        "days_between_scans": round(days, 3),
        "summary": ("Your result changed since your previous scan."
                    if not same_top else
                    "Your result is stable compared with your previous scan."),
        "note": (
            "Your result changed since your previous scan — worth clinical review."
            if not same_top
            else "Your result is stable compared with your previous scan."
        ),
    }


def _check_urgency(args: Dict[str, Any], ctx: ToolContext) -> Dict[str, Any]:
    """Decision tool: fuses vision output, ABCDE criteria, risk band, symptoms into urgency."""
    analysis = ctx.last_analysis
    top = None
    if analysis is not None:
        top = analysis.get("top")
    elif ctx.memory.scans:
        rec = ctx.memory.scans[-1]
        top = {"code": rec.top_code, "name": rec.top_name,
               "probability": rec.top_probability, "severity": rec.severity}
    if top is None:
        return {"status": "insufficient_evidence",
                "message": "Run analyze_image before deciding urgency."}
    
    sev = top["severity"]
    conf = float(top["probability"])
    top_code = top["code"]
    top_name = top["name"]
    band = _risk_band(sum(RISK_FACTORS[k]["weight"]
                          for k, v in ctx.memory.risk_answers.items() if v)) \
        if ctx.memory.risk_answers else "unknown"
    history_note = args.get("history_changed", False)

    # Base severity score: low=0, moderate=1, high=2
    score = {"low": 0, "moderate": 1, "high": 2}[sev]
    reasons = {
        "low": ["What I identified is clinically classified as usually harmless."],
        "moderate": ["What I identified is dysplastic/precancerous and can progress if ignored."],
        "high": ["What I identified is an aggressive cutaneous malignancy."],
    }[sev]

    if conf < 0.5:
        score += 1
        reasons.append(f"Model certainty is moderate ({conf:.0%}), applying clinical precautionary principle.")
    if band in ("elevated", "high"):
        score += 1
        reasons.append(f"Patient risk factors indicate {band} vulnerability profile.")
    if history_note:
        score += 1
        reasons.append("Morphological change detected versus previous session scan (evolution is a key red flag).")

    # Factor in ABCDE findings if available
    abcde = ctx.last_abcde or {}
    if abcde.get("overall_band") == "High Concern":
        score += 1
        reasons.append("Computer vision detected marked ABCDE asymmetry and border/color variegation.")

    # Factor in symptoms
    if ctx.symptoms:
        score += 1
        reasons.append(f"Reported patient symptoms: {', '.join(ctx.symptoms[:2])}.")

    urgency = ["routine", "soon", "urgent"][min(score, 2)]
    return {
        "urgency": urgency,
        "summary": f"Clinical Urgency: {urgency.upper()}.",
        "severity": sev,
        "top_code": top_code,
        "top_name": top_name,
        "risk_band": band,
        "confidence": round(conf, 4),
        "reasons": reasons,
    }


def _search_clinical_knowledge(args: Dict[str, Any], ctx: ToolContext) -> Dict[str, Any]:
    """Retrieval tool: searches clinical dermatology database and guidelines."""
    query = str(args.get("query", ""))
    cond = str(args.get("condition", "")) or None
    return search_knowledge(query, cond)


def _analyze_symptoms(args: Dict[str, Any], ctx: ToolContext) -> Dict[str, Any]:
    """Symptom tool: parses patient-reported symptoms and red flags."""
    text = str(args.get("text", ""))
    res = parse_symptoms(text)
    if res.get("symptoms_detected"):
        ctx.symptoms = list(res["symptoms_detected"])
    return res


def _generate_doctor_questions(args: Dict[str, Any], ctx: ToolContext) -> Dict[str, Any]:
    """Guidance tool: formulates prioritized checklist for dermatologist visit."""
    cond = str(args.get("condition", ""))
    if not cond and ctx.last_analysis:
        cond = ctx.last_analysis.get("top", {}).get("code", "")
    urg = str(args.get("urgency", "soon"))
    qs = build_doctor_questions(cond, urg, ctx.symptoms)
    return {
        "questions": qs,
        "condition": cond,
        "urgency": urg,
        "summary": f"Generated {len(qs)} tailored doctor consultation questions.",
    }


def build_registry() -> ToolRegistry:
    reg = ToolRegistry()
    reg.register(Tool(
        name="analyze_image",
        description=(
            "Classify the skin lesion photo attached to this session using the "
            "fine-tuned MobileNetV3 model (8 ISIC 2019 classes). Returns the top "
            "prediction with confidence, alternatives and severity. Requires an image."
        ),
        parameters={"type": "object", "properties": {}, "required": []},
        fn=_analyze_image,
    ))
    reg.register(Tool(
        name="extract_abcde_features",
        description=(
            "Computer vision tool: Extracts Asymmetry, Border irregularity, Color "
            "variegation, Diameter scale, and Evolution metrics from the attached image."
        ),
        parameters={"type": "object", "properties": {}, "required": []},
        fn=_extract_abcde_features,
    ))
    reg.register(Tool(
        name="assess_risk",
        description=(
            "Score the patient's skin-cancer risk factors. Pass any newly "
            "learned answers as a map of factor->boolean using keys: "
            + ", ".join(RISK_FACTORS) + ". Returns score, risk band and missing factors."
        ),
        parameters={
            "type": "object",
            "properties": {
                "answers": {
                    "type": "object",
                    "description": "factor key -> true/false",
                    "additionalProperties": {"type": "boolean"},
                }
            },
            "required": [],
        },
        fn=_assess_risk,
    ))
    reg.register(Tool(
        name="lookup_condition",
        description=(
            "Fetch clinical knowledge for one lesion class code "
            "(AK, BCC, BKL, DF, MEL, NV, SCC, VASC): description, dermoscopy hallmarks, "
            "biopsy recommendations, and care guidance."
        ),
        parameters={
            "type": "object",
            "properties": {"condition": {"type": "string"}},
            "required": ["condition"],
        },
        fn=_lookup_condition,
    ))
    reg.register(Tool(
        name="compare_history",
        description=(
            "Compare the most recent scan with the previous scan stored in this "
            "session's memory. Reports whether the top prediction changed and drift."
        ),
        parameters={"type": "object", "properties": {}, "required": []},
        fn=_compare_history,
    ))
    reg.register(Tool(
        name="check_urgency",
        description=(
            "Fuse all gathered evidence (predicted severity, ABCDE score, symptoms, "
            "personal risk band, change-vs-history) into clinical urgency: routine | soon | urgent."
        ),
        parameters={
            "type": "object",
            "properties": {
                "history_changed": {
                    "type": "boolean",
                    "description": "set true if compare_history reported a change",
                }
            },
            "required": [],
        },
        fn=_check_urgency,
    ))
    reg.register(Tool(
        name="search_clinical_knowledge",
        description=(
            "Search clinical dermatology guidelines, biopsy techniques (shave/punch/excisional), "
            "Mohs surgery, sunscreen/SPF advice, and differential diagnoses."
        ),
        parameters={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "search query or topic"},
                "condition": {"type": "string", "description": "optional condition code"}
            },
            "required": ["query"],
        },
        fn=_search_clinical_knowledge,
    ))
    reg.register(Tool(
        name="analyze_symptoms",
        description=(
            "Extract patient-reported symptoms (bleeding, itching, rapid growth, pain, crusting) "
            "and compute a clinical red-flag score."
        ),
        parameters={
            "type": "object",
            "properties": {"text": {"type": "string", "description": "patient message"}},
            "required": ["text"],
        },
        fn=_analyze_symptoms,
    ))
    reg.register(Tool(
        name="generate_doctor_questions",
        description=(
            "Formulates a prioritized, tailored checklist of questions for the patient "
            "to ask their dermatologist at their appointment."
        ),
        parameters={
            "type": "object",
            "properties": {
                "condition": {"type": "string", "description": "condition code"},
                "urgency": {"type": "string", "description": "routine, soon, or urgent"}
            },
            "required": [],
        },
        fn=_generate_doctor_questions,
    ))
    return reg
