"""
Planners: the interchangeable decision-making core of the agents.

A planner answers one question per loop iteration:
"given the transcript and evidence, what should the agent do next?"

  * PolicyPlanner  — deterministic intelligent clinical engine with natural
                     language understanding, symptom parsing, knowledge retrieval,
                     and ABCDE morphological analysis. Zero external deps.
  * OpenAIPlanner  — real LLM function calling against any OpenAI-compatible
                     /chat/completions endpoint (OpenAI, Groq, Ollama /v1).
"""
from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .registry import RISK_FACTORS, ToolRegistry

YES_RE = re.compile(r"\b(yes|yeah|yep|y|true|often|sometimes|definitely|sure|correct)\b", re.I)
NO_RE = re.compile(r"\b(no|nope|n|never|false|not really|rarely|none)\b", re.I)

QUESTION_PATTERNS = [
    r"\b(what|why|how|when|where|who|which|is it|can i|should i|tell me about|explain)\b",
    r"\b(melanoma|carcinoma|bcc|scc|actinic|keratosis|nevus|mole|biopsy|mohs|sunscreen|spf|abcde|dermoscopy)\b",
]


@dataclass
class Decision:
    """What the agent should do next."""
    kind: str                      # "tool" | "message" | "final"
    thought: str = ""              # the 'Thought' shown in the trace
    tool: Optional[str] = None     # for kind == "tool"
    args: Dict[str, Any] = field(default_factory=dict)
    text: str = ""                 # for kind == "message"
    suggestions: List[str] = field(default_factory=list)  # clickable quick-reply chips
    payload: Dict[str, Any] = field(default_factory=dict)  # for kind == "final"
    planner: str = ""


@dataclass
class AgentState:
    """Everything a planner is allowed to see."""
    transcript: List[Dict[str, str]]
    evidence: Dict[str, Any]        # tool outputs collected this session
    pending_questions: List[Dict[str, str]] = field(default_factory=list)
    asked_about_image: bool = False
    has_attached_image: bool = False   # image waiting on THIS turn


class PolicyPlanner:
    """
    Intelligent clinical policy engine with symptom parsing, ABCDE computer
    vision integration, and conversational dermatology question-answering.
    """

    name = "policy-engine (Clinical AI)"

    def _report_already_generated(self, ev: Dict[str, Any]) -> bool:
        """True when the full pipeline has run and a report was already shown."""
        return all(k in ev for k in ("analysis", "abcde", "risk", "condition", "urgency", "doctor_questions"))

    def _conversational_followup(self, state: AgentState, last_user: str) -> Decision:
        """
        Answer follow-up questions conversationally using existing evidence.
        Uses regex-based intent detection to pick the right response style.
        """
        ev = state.evidence
        analysis = ev.get("analysis", {})
        cond = ev.get("condition", {})
        abcde = ev.get("abcde", {})
        risk = ev.get("risk", {})
        urgency_info = ev.get("urgency", {})

        top_name = analysis.get("top_name", "the identified condition")
        confidence = analysis.get("top_probability", 0)
        abcde_score = abcde.get("composite_score", "N/A")
        abcde_band = abcde.get("overall_band", "")
        urgency = urgency_info.get("urgency", "routine")
        description = cond.get("description", "")
        tips = cond.get("tips", [])
        pearl = cond.get("pearl", "")
        risk_band = risk.get("band", "unknown")

        lower = last_user.lower().strip()

        # ---- Intent regexes ----
        IS_ACK = re.compile(r"^(ok|okay|oh ok|got it|cool|thanks|thank you|thx|ty|alright|fine|good|great|nice|perfect|understood|roger|noted|sure|k|kk|hmm|hm|oh|ah|i see|right|yep|yup|aight|bet)[\.\!\?\s]*$", re.I)
        IS_SAFE = re.compile(r"\b(safe|i.?m (fine|ok|good|alright)|am i (ok|fine|safe|good|alright)|nothing to worry|no worries|relieved|reassur|not dangerous|not harmful|not bad)\b", re.I)
        IS_WORRY = re.compile(r"\b(harmful|dangerous|serious|worried|concern|cancer|bad|scary|malignant|die|fatal|deadly|threat|afraid|nervous|anxious|freak|scare|terrif)\b", re.I)
        IS_NEXTSTEP = re.compile(r"\b(what (should|can|do) i do|next step|do next|what now|action|should i|treat|cure|remed|medicine|cream|ointment|doctor|dermatolog|appoint|visit|go see|check.?up|biopsy|remov|surgery|what do i|what to do)\b", re.I)
        IS_ABCDE = re.compile(r"\b(abcde|score|asymmetr|border|color|colour|diameter|evolution|morpholog|rating|what.?s the score)\b", re.I)
        IS_EXPLAIN = re.compile(r"\b(what is|what.?s|tell me|explain|meaning|mean|definition|understand|don.?t get|don.?t understand|i don.?t|confused|confusing|unclear|elaborate|detail|more info|break.?down|simplif|simpler|dumb it down|eli5|layman)\b", re.I)
        IS_RISK = re.compile(r"\b(risk factor|my risk|chance|likelihood|probabilit|odds|how likely|recur|spread|family|genetic|heredit|sun exposure|uv)\b", re.I)
        IS_BYE = re.compile(r"^(bye|goodbye|see ya|later|cya|good night|gn|take care|that.?s all|done|nothing else|no more|peace)[\.\!\?\s]*$", re.I)
        IS_HI = re.compile(r"^(hi|hello|hey|sup|yo|whats up|how are you)[\.\!\?\s]*$", re.I)

        # 1) Acknowledgment: "ok", "thanks", "got it"
        if IS_ACK.match(lower):
            return Decision(
                kind="message", thought="Patient acknowledged. Offering continued help.",
                text="Glad I could help! 😊 If you have more questions about your results or want to scan another spot, I'm right here.",
                suggestions=["Scan another photo", "What should I do?", "Explain ABCDE score"],
                planner=self.name,
            )

        # 2) Goodbye
        if IS_BYE.match(lower):
            return Decision(
                kind="message", thought="Patient is ending the session.",
                text="Take care! Remember to keep an eye on any spots that change over time. You can always come back and scan again. 👋",
                suggestions=["Start a new session"],
                planner=self.name,
            )

        # 3) Greeting
        if IS_HI.match(lower):
            return Decision(
                kind="message", thought="Patient greeted. Reminding them of the active analysis.",
                text=f"Hey! I still have your analysis — **{top_name}** ({confidence:.0%} match), ABCDE **{abcde_score}/10** ({abcde_band}). What would you like to know?",
                suggestions=["Is this harmful?", "What should I do?", "Scan another photo"],
                planner=self.name,
            )

        # 4) Reassurance: "am i safe", "so i'm fine"
        if IS_SAFE.search(lower):
            if urgency == "routine":
                text = (
                    f"Yes — your spot looks reassuring. **{top_name}** with **{confidence:.0%}** confidence "
                    f"is typically benign, and your ABCDE score of **{abcde_score}/10** is in the **{abcde_band}** range.\n\n"
                    "Just keep an eye on it — photograph it every few months and see a dermatologist if anything changes."
                )
            elif urgency == "soon":
                text = (
                    "Your results aren't alarming, but I wouldn't ignore them entirely. "
                    f"A professional opinion within the next few weeks would be wise — just to be thorough."
                )
            else:
                text = (
                    "I'd hold off on the all-clear for now. Your results suggest a dermatologist visit soon "
                    "would be the safest choice. It may well be fine, but better to check."
                )
            return Decision(
                kind="message", thought="Providing calibrated reassurance.",
                text=text,
                suggestions=["What should I do next?", "Explain ABCDE score", "Scan another photo"],
                planner=self.name,
            )

        # 5) Worry: "is it harmful", "could it be cancer"
        if IS_WORRY.search(lower):
            if urgency == "routine":
                text = (
                    f"I understand the concern — but **{top_name}** ({confidence:.0%} match) is classified as "
                    f"**low clinical concern**. {description}\n\n"
                    f"ABCDE score: **{abcde_score}/10** ({abcde_band}), risk index: **{risk_band}**. "
                    "This doesn't appear dangerous, but do watch for any changes."
                )
            elif urgency == "soon":
                text = (
                    f"**{top_name}** isn't an emergency, but your ABCDE score of **{abcde_score}/10** "
                    "does suggest getting a dermatologist's opinion in the coming weeks.\n\n"
                    "Many lesions at this level turn out fine — the key is not to ignore it."
                )
            else:
                text = (
                    f"I want to be straightforward — **{top_name}** with an ABCDE of **{abcde_score}/10** "
                    "does show features worth professional attention.\n\n"
                    "Please schedule a dermatologist appointment soon. Early evaluation leads to the best outcomes."
                )
            return Decision(
                kind="message", thought="Addressing patient worry with empathy.",
                text=text,
                suggestions=["What should I do?", "Explain ABCDE score", "Scan another lesion"],
                planner=self.name,
            )

        # 6) Next steps: "what should i do"
        if IS_NEXTSTEP.search(lower):
            tips_text = "\n".join(f"• {t}" for t in tips[:4]) if tips else "• Monitor for changes in size, shape, or color."
            text = f"**Here's what I'd recommend:**\n\n{tips_text}\n\n"
            if pearl:
                text += f"💡 **Tip**: {pearl}\n\n"
            if urgency == "routine":
                text += "Since this is low concern, routine self-monitoring with periodic photos is enough. No rush to see a doctor unless something changes."
            elif urgency == "soon":
                text += "I'd suggest booking a dermatologist appointment in the coming weeks — not urgent, but worth a professional look."
            else:
                text += "Please prioritize seeing a dermatologist promptly."
            return Decision(
                kind="message", thought="Providing actionable next steps.",
                text=text,
                suggestions=["Is this harmful?", "Explain ABCDE score", "Scan another photo"],
                planner=self.name,
            )

        # 7) ABCDE score
        if IS_ABCDE.search(lower):
            features = abcde.get("features", {})
            lines = []
            for key, label in [("A", "Asymmetry"), ("B", "Border"), ("C", "Color"), ("D", "Diameter"), ("E", "Evolution")]:
                feat = features.get(key, {})
                sc = feat.get("score", "?")
                desc = feat.get("description", "")
                lines.append(f"**{key} — {label}**: {sc}/10 — {desc}")
            text = (
                f"**Your ABCDE Breakdown** (overall: **{abcde_score}/10**, {abcde_band}):\n\n"
                + "\n".join(lines) + "\n\n"
                "Higher individual scores = more features worth attention. "
                "The ABCDE rule covers **A**symmetry, **B**order, **C**olor, **D**iameter, and **E**volution."
            )
            return Decision(
                kind="message", thought="Breaking down ABCDE scores.",
                text=text,
                suggestions=["Is this harmful?", "What should I do?", "Scan another photo"],
                planner=self.name,
            )

        # 8) Risk factors
        if IS_RISK.search(lower):
            risk_score = risk.get("score", 0)
            risk_max = risk.get("max_score", 20)
            text = (
                f"**Your risk profile**: **{risk_band}** ({risk_score}/{risk_max} pts)\n\n"
                "Skin cancer risk depends on UV exposure, skin type, family history, and mole count. "
                "Regular self-checks and annual dermatologist visits are recommended for everyone."
            )
            return Decision(
                kind="message", thought="Explaining personal risk profile.",
                text=text,
                suggestions=["Is this harmful?", "What should I do?", "Scan another photo"],
                planner=self.name,
            )

        # 9) Confusion: "i don't understand", "what does this mean"
        if IS_EXPLAIN.search(lower):
            if urgency == "routine":
                simple = "your spot looks normal and not concerning"
            elif urgency == "soon":
                simple = "your spot has some features worth getting checked by a skin doctor"
            else:
                simple = "your spot has features that a skin doctor should look at soon"
            first_sentence = description.split('.')[0].lower() if description else "a common skin finding"
            text = (
                f"Let me simplify: **{simple}**.\n\n"
                f"Our AI scanned your photo and thinks it's a **{top_name}** — that's {first_sentence}.\n\n"
                f"We also checked its shape, edges, color, and size (the 'ABCDE' score). "
                f"Yours got **{abcde_score}/10**, which means **{abcde_band}**.\n\n"
                "Want me to explain any specific part in more detail?"
            )
            return Decision(
                kind="message", thought="Simplifying results for the patient.",
                text=text,
                suggestions=["What's the ABCDE score?", "Is this harmful?", "What should I do?"],
                planner=self.name,
            )

        # 10) Generic fallback — helpful guide, NOT a data dump
        text = (
            f"I'm here to help! Your spot was identified as **{top_name}** "
            f"({confidence:.0%} match, urgency: **{urgency}**).\n\n"
            "Here's what you can ask me:\n"
            "• **\"Is this harmful?\"** — I'll explain the risk level\n"
            "• **\"What should I do?\"** — clear next steps\n"
            "• **\"Explain ABCDE score\"** — feature-by-feature breakdown\n"
            "• **\"I don't understand\"** — I'll simplify everything\n\n"
            "Or just ask in your own words!"
        )
        return Decision(
            kind="message", thought="Patient message didn't match a specific intent. Offering a helpful guide.",
            text=text,
            suggestions=["Is this harmful?", "What should I do?", "Explain ABCDE score", "Scan another photo"],
            planner=self.name,
        )

    def next_action(self, state: AgentState, registry: ToolRegistry) -> Decision:
        ev = state.evidence
        last_user = next((m["content"] for m in reversed(state.transcript)
                          if m["role"] == "user"), "").strip()

        # -------------------------------------------------------------
        # 0. FOLLOW-UP CONVERSATION after report is already generated
        # If all evidence exists and no new image is attached, this is
        # a follow-up question — answer it conversationally.
        # -------------------------------------------------------------
        if self._report_already_generated(ev) and not state.has_attached_image:
            # The user sent a new text message after the report was shown
            report_shown = any("[report]" in m.get("content", "") for m in state.transcript if m["role"] == "assistant")
            if report_shown and last_user and not last_user.startswith("[attached"):
                return self._conversational_followup(state, last_user)

        # -------------------------------------------------------------
        # A. USER HAS ATTACHED AN IMAGE -> RUN VISION + ABCDE PIPELINE
        # -------------------------------------------------------------
        if state.has_attached_image and "analysis" not in ev:
            return Decision(
                kind="tool", tool="analyze_image", args={},
                thought="A clinical photo is attached. Running the ISIC-2019 MobileNetV3 deep learning classifier first.",
                planner=self.name,
            )

        if "analysis" in ev:
            analysis = ev["analysis"]
            top = analysis["top_prediction"]

            # 2. Extract ABCDE morphological features from the image
            if "abcde" not in ev:
                return Decision(
                    kind="tool", tool="extract_abcde_features", args={},
                    thought="Image classified. Now running computer vision contour, border irregularity, and color variegation analysis (ABCDE).",
                    planner=self.name,
                )

            # 3. Analyze symptoms if user sent text along with the photo
            if "symptoms" not in ev and last_user and not last_user.startswith("[attached"):
                return Decision(
                    kind="tool", tool="analyze_symptoms", args={"text": last_user},
                    thought="Checking the patient's message for clinical red-flag symptoms (itching, bleeding, growth, pain).",
                    planner=self.name,
                )

            # 4. Compare against remembered scans in session
            if "history" not in ev:
                return Decision(
                    kind="tool", tool="compare_history", args={},
                    thought=f"Top visual classification is {analysis['top_name']} ({analysis['top_probability']:.0%}). Comparing with session history to assess evolution.",
                    planner=self.name,
                )

            # 5. Risk factor questionnaire: ask what's missing
            risk = ev.get("risk", {})
            missing = risk.get("missing", [])
            if missing and not state.pending_questions:
                ask = missing[:3]
                lines = [f"• {q['question']}" for q in ask]
                return Decision(
                    kind="message",
                    thought="Clinical image analysis complete. To calibrate urgency, asking the patient for key personal skin cancer risk factors.",
                    text=(
                        f"I've completed the visual scan for your spot (most consistent with **{analysis['top_name']}**).\n\n"
                        "To accurately calculate your overall triage urgency, could you answer these brief risk questions?\n"
                        + "\n".join(lines)
                    ),
                    suggestions=["Yes to all", "No to all", "Skip risk check"],
                    planner=self.name,
                ), ask

            # 6. Score newly arrived answers
            if state.pending_questions and last_user:
                answers: Dict[str, bool] = {}
                lower_ans = last_user.lower()
                if "yes to all" in lower_ans:
                    for q in state.pending_questions:
                        answers[q["key"]] = True
                elif "no to all" in lower_ans:
                    for q in state.pending_questions:
                        answers[q["key"]] = False
                elif "skip" in lower_ans:
                    pass  # leave default
                else:
                    lines = [l for l in re.split(r"[\n;,]| \d+\.", last_user) if l.strip()]
                    for i, q in enumerate(state.pending_questions):
                        frag = lines[i] if len(lines) == len(state.pending_questions) else last_user
                        yes = bool(YES_RE.search(frag))
                        no = bool(NO_RE.search(frag))
                        answers[q["key"]] = yes and not (no and not yes)
                state.pending_questions = []
                return Decision(
                    kind="tool", tool="assess_risk", args={"answers": answers},
                    thought="Scoring patient risk factor answers to integrate into clinical decision matrix.",
                    planner=self.name,
                )

            if "risk" not in ev:
                return Decision(
                    kind="tool", tool="assess_risk", args={},
                    thought="Calculating baseline clinical risk factor score.",
                    planner=self.name,
                )

            # 7. Clinical knowledge lookup for condition
            if ev.get("condition", {}).get("code") != top:
                return Decision(
                    kind="tool", tool="lookup_condition", args={"condition": top},
                    thought=f"Retrieving dermoscopy hallmarks, biopsy protocols, and clinical pearls for {top}.",
                    planner=self.name,
                )

            # 8. Check urgency (decision fusion)
            if "urgency" not in ev:
                changed = bool(ev.get("history", {}).get("top_class_changed"))
                return Decision(
                    kind="tool", tool="check_urgency", args={"history_changed": changed},
                    thought="Fusing vision classification, ABCDE morphological score, patient risk profile, and symptom flags into final triage urgency.",
                    planner=self.name,
                )

            # 9. Generate doctor consultation questions
            if "doctor_questions" not in ev:
                urg = ev.get("urgency", {}).get("urgency", "soon")
                return Decision(
                    kind="tool", tool="generate_doctor_questions", args={"condition": top, "urgency": urg},
                    thought="Generating tailored consultation question checklist for the patient's dermatologist visit.",
                    planner=self.name,
                )

            # 10. Handover to Care Advisor for final report
            return Decision(
                kind="final",
                thought="All multi-modal clinical evidence synthesized. Handing to CareAdvisorAgent to compile the structured patient triage report.",
                planner=self.name,
            )

        # -------------------------------------------------------------
        # B. NO PHOTO YET -> HANDLE CLINICAL QUESTIONS OR SYMPTOMS
        # -------------------------------------------------------------
        # Check if user is asking a general medical question or topic
        is_question = any(re.search(pat, last_user, re.I) for pat in QUESTION_PATTERNS) if last_user else False

        if is_question and "knowledge_query" not in ev:
            return Decision(
                kind="tool", tool="search_clinical_knowledge", args={"query": last_user},
                thought=f"The patient is inquiring about dermatology topics ({last_user[:50]}...). Searching clinical knowledge database.",
                planner=self.name,
            )

        if "knowledge_query" in ev:
            kdata = ev.pop("knowledge_query")
            summary = kdata.get("summary", "")
            return Decision(
                kind="message",
                thought="Sharing retrieved dermatology guidance and inviting photo for specific lesion workup.",
                text=(
                    f"{summary}\n\n"
                    "💡 **Tip**: If you have a specific spot or lesion you are concerned about, "
                    "attach a clear, well-lit photo using the paperclip button, and I'll run "
                    "our MobileNetV3 deep learning classifier and ABCDE morphometric scan for you."
                ),
                suggestions=["Attach a photo", "Check ABCDE rules", "Assess my risk factors"],
                planner=self.name,
            )

        # Check if user is describing symptoms (e.g. 'my mole itches and bleeds')
        if last_user and any(re.search(w, last_user, re.I) for w in ["itch", "bleed", "grow", "hurt", "pain", "spot", "bump", "mole"]):
            if "symptoms" not in ev:
                return Decision(
                    kind="tool", tool="analyze_symptoms", args={"text": last_user},
                    thought="Patient is describing lesion symptoms. Parsing clinical red-flags.",
                    planner=self.name,
                )
            sym = ev.get("symptoms", {})
            flags = sym.get("symptoms_detected", [])
            flag_text = f"I've noted: **{', '.join(flags)}**." if flags else "I've noted your description."
            return Decision(
                kind="message",
                thought="Acknowledging symptoms and requesting photo for full multi-modal workup.",
                text=(
                    f"{flag_text}\n\n"
                    "Symptoms like these are valuable clinical signals. To evaluate this properly, "
                    "please **attach a close-up photo** of the spot. I'll classify the lesion morphology, "
                    "evaluate its ABCDE features, and assemble a clinical care plan."
                ),
                suggestions=["Attach photo now", "Assess my risk factors", "What are melanoma red flags?"],
                planner=self.name,
            )

        # Default initial greeting
        if not state.asked_about_image:
            return Decision(
                kind="message",
                thought="Welcoming the patient and explaining our multi-agent diagnostic capabilities.",
                text=(
                    "Hello! I'm **DermaAgent**, your AI clinical dermatology triage assistant.\n\n"
                    "I can evaluate suspicious spots using our ISIC-trained neural network, "
                    "perform computer vision **ABCDE feature analysis**, calculate your skin cancer "
                    "risk profile, and answer clinical dermatology questions.\n\n"
                    "To begin, **attach a clear close-up photo** of your spot or ask any skin health question."
                ),
                suggestions=["Scan a lesion photo", "What are the ABCDE signs?", "Assess my skin cancer risk"],
                planner=self.name,
            )

        return Decision(
            kind="message",
            thought="Standing by for user question or photo upload.",
            text="I'm ready whenever you are — attach a photo of the spot or ask me any question about skin conditions.",
            suggestions=["Scan a lesion photo", "What is melanoma?", "Check risk factors"],
            planner=self.name,
        )

    def plan(self, state: AgentState, registry: ToolRegistry,
             context: Optional[Dict[str, Any]] = None) -> Decision:
        result = self.next_action(state, registry)
        if isinstance(result, tuple):
            decision, ask = result
            state.pending_questions = ask
            return decision
        return result


class OpenAIPlanner:
    """
    LLM planner using OpenAI-style function calling over plain HTTP (stdlib urllib).
    Supports all 9 clinical domain tools.
    """

    def __init__(self, api_key: str, api_base: str, model: str, timeout: int = 60):
        self.name = f"llm:{model}"
        self.api_key = api_key
        self.api_base = api_base.rstrip("/")
        self.model = model
        self.timeout = timeout

    @staticmethod
    def from_env() -> Optional["OpenAIPlanner"]:
        key = os.environ.get("DERM_AGENT_API_KEY") or os.environ.get("OPENAI_API_KEY")
        if not key:
            return None
        base = os.environ.get("DERM_AGENT_API_BASE") or \
               os.environ.get("OPENAI_API_BASE") or "https://api.openai.com/v1"
        model = os.environ.get("DERM_AGENT_MODEL") or "gpt-4o-mini"
        return OpenAIPlanner(key, base, model)

    def _chat(self, messages: List[Dict[str, Any]],
              tools: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        body: Dict[str, Any] = {"model": self.model, "messages": messages, "temperature": 0.2}
        if tools:
            body["tools"] = tools
            body["tool_choice"] = "auto"
        req = urllib.request.Request(
            f"{self.api_base}/chat/completions",
            data=json.dumps(body).encode(),
            headers={"Content-Type": "application/json",
                     "Authorization": f"Bearer {self.api_key}"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=self.timeout) as resp:
            return json.loads(resp.read().decode())

    def plan(self, state: AgentState, registry: ToolRegistry,
             context: Optional[Dict[str, Any]] = None) -> Decision:
        system = (
            "You are DermaAgent, an AI clinical dermatology triage assistant. "
            "You have access to 9 clinical tools: analyze_image, extract_abcde_features, "
            "assess_risk, lookup_condition, compare_history, check_urgency, "
            "search_clinical_knowledge, analyze_symptoms, generate_doctor_questions. "
            "Rules:\n"
            "- If the patient attached a photo, call analyze_image, then extract_abcde_features, "
            "then assess_risk and check_urgency.\n"
            "- If the patient asks medical questions, call search_clinical_knowledge.\n"
            "- If the patient describes symptoms (bleeding, itching, growth), call analyze_symptoms.\n"
            "- Always explain clinical concepts empathetically, and emphasize that you are an "
            "educational screening aid, not a definitive diagnosis.\n"
            "- When all evidence is gathered, stop calling tools so the triage report can compile."
        )
        messages: List[Dict[str, Any]] = [{"role": "system", "content": system}]
        for m in state.transcript:
            messages.append({"role": m["role"], "content": m["content"]})
        if state.evidence:
            messages.append({
                "role": "system",
                "content": "Evidence gathered so far (JSON):\n"
                           + json.dumps(state.evidence, default=str)[:4000],
            })
        if state.has_attached_image and "analysis" not in state.evidence:
            messages.append({
                "role": "system",
                "content": "A lesion photo is attached to this turn. Call analyze_image.",
            })

        resp = self._chat(messages, tools=registry.schemas())
        msg = resp["choices"][0]["message"]
        tool_calls = msg.get("tool_calls") or []
        thought = (msg.get("content") or "").strip()

        if tool_calls:
            call = tool_calls[0]
            try:
                args = json.loads(call["function"].get("arguments") or "{}")
            except json.JSONDecodeError:
                args = {}
            return Decision(kind="tool", thought=thought or f"Calling {call['function']['name']}.",
                            tool=call["function"]["name"], args=args, planner=self.name)

        text = thought or "I'm ready to evaluate your lesion photo or answer any questions."
        return Decision(kind="message", thought="Responding to the patient with clinical guidance.",
                        text=text, planner=self.name)


def build_planner() -> Any:
    """LLM planner when configured, deterministic policy otherwise."""
    llm = OpenAIPlanner.from_env()
    return llm or PolicyPlanner()
