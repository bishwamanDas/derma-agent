from __future__ import annotations

import json
import os
import time as _time
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional

GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai"
GEMINI_MODELS = ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.8-flash"]
_REQ_TIMEOUT = 5
_TOTAL_BUDGET = 8

FOLLOWUP_SYSTEM_PROMPT = """\
You are DermaAgent, a friendly and knowledgeable AI dermatology triage assistant.

A patient has already received their triage report. You are now in follow-up
conversation mode. The patient's clinical evidence is provided below — use it
to answer their questions naturally, empathetically, and concisely.

RULES:
- Be conversational and warm, like a caring nurse explaining results.
- Keep answers SHORT (2-4 sentences max for simple questions, up to a paragraph for complex ones).
- Use the evidence data to give accurate, personalized answers — don't make up numbers.
- Use **bold** for key terms. Use simple language a non-medical person can understand.
- NEVER re-dump the entire report. Only mention the specific info the patient asked about.
- If the patient says "ok", "thanks", etc., respond briefly and warmly.
- If the patient says something unrelated to dermatology, gently redirect.
- Always emphasize you are a screening aid, not a definitive diagnosis.
- Suggest 2-3 short follow-up actions the patient can take (as a suggestions list).
- NEVER use markdown headers (# or ##). Just flowing text with **bold** highlights.

EVIDENCE:
{evidence_json}

CONVERSATION SO FAR:
{transcript}
"""


def _get_config() -> Optional[Dict[str, Any]]:
    # 1. Gemini (free)
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        user_model = os.environ.get("GEMINI_MODEL")
        models = [user_model] if user_model else list(GEMINI_MODELS)
        return {
            "api_key": gemini_key,
            "api_base": GEMINI_BASE,
            "models": models,
        }

    # 2. Generic OpenAI-compat
    key = os.environ.get("DERM_AGENT_API_KEY") or os.environ.get("OPENAI_API_KEY")
    if key:
        base = (os.environ.get("DERM_AGENT_API_BASE")
                or os.environ.get("OPENAI_API_BASE")
                or "https://api.openai.com/v1")
        model = os.environ.get("DERM_AGENT_MODEL") or "gpt-4o-mini"
        return {"api_key": key, "api_base": base.rstrip("/"), "models": [model]}

    return None


def _call_chat_once(config: Dict[str, Any], messages: List[Dict[str, Any]],
                    model: str, timeout: int = _REQ_TIMEOUT) -> Optional[str]:
    body = {
        "model": model,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 512,
    }
    data_bytes = json.dumps(body).encode()

    req = urllib.request.Request(
        f"{config['api_base']}/chat/completions",
        data=data_bytes,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {config['api_key']}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode())
            return (data.get("choices", [{}])[0]
                    .get("message", {}).get("content", "").strip()) or None
    except urllib.error.HTTPError as e:
        err_body = ""
        try:
            err_body = e.read().decode()[:200]
        except Exception:
            pass
        print(f"[llm_chat] {model} HTTP {e.code}: {err_body}")
        return None
    except Exception as e:
        print(f"[llm_chat] {model} error: {e}")
        return None


def llm_followup(evidence: Dict[str, Any],
                 transcript: List[Dict[str, str]],
                 user_message: str) -> Optional[str]:
    config = _get_config()
    if config is None:
        return None

    t_start = _time.monotonic()

    # Build concise evidence summary (strip raw image bytes etc.)
    safe_evidence = {}
    for key in ("analysis", "abcde", "risk", "condition", "urgency",
                "symptoms", "doctor_questions"):
        if key in evidence:
            safe_evidence[key] = evidence[key]

    evidence_json = json.dumps(safe_evidence, indent=2, default=str)[:4000]

    # Build transcript (last 10 messages)
    recent = transcript[-10:]
    transcript_text = "\n".join(
        f"{'Patient' if m['role'] == 'user' else 'DermaAgent'}: {m['content']}"
        for m in recent
        if not m["content"].startswith("[report]")
    )

    system = FOLLOWUP_SYSTEM_PROMPT.format(
        evidence_json=evidence_json,
        transcript=transcript_text,
    )

    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_message},
    ]

    # Try each model in the fallback chain — bail on total budget
    for model in config["models"]:
        elapsed = _time.monotonic() - t_start
        if elapsed >= _TOTAL_BUDGET:
            print(f"[llm_chat] Total budget ({_TOTAL_BUDGET}s) exceeded after {elapsed:.1f}s, bailing")
            break

        remaining = max(3, int(_TOTAL_BUDGET - elapsed))
        timeout = min(_REQ_TIMEOUT, remaining)

        print(f"[llm_chat] Trying {model} (timeout={timeout}s, elapsed={elapsed:.1f}s)...")
        result = _call_chat_once(config, messages, model=model, timeout=timeout)
        if result:
            print(f"[llm_chat] [OK] {model} succeeded ({_time.monotonic() - t_start:.1f}s)")
            return result
        print(f"[llm_chat] [FAIL] {model} failed, trying next...")

    total = _time.monotonic() - t_start
    print(f"[llm_chat] All models failed in {total:.1f}s, falling back to deterministic")
    return None


def is_llm_available() -> bool:
    return _get_config() is not None
