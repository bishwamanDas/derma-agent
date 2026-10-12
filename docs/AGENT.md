# DermaAgent 2.0 — Multi-Agent Architecture

An agentic clinical-triage pipeline for Helix Derm. This document describes the
system as built, so every claim can be traced to code.

```
backend/agent/
├── __init__.py     package exports
├── core.py         Orchestrator (supervisor), TriageAgent, AdvisorAgent, event stream
├── planners.py     PolicyPlanner (Clinical AI) + OpenAIPlanner (LLM function calling)
├── registry.py     Tool dataclass + ToolRegistry + 9 domain clinical tools
├── abcde.py        Computer vision ABCDE morphological feature extraction engine
├── knowledge.py    Clinical dermatology database, symptom parser, doctor checklist generator
└── memory.py       Memory (conversation + factual) and MemoryStore (sessions)
```

---

## 1. Multi-Agent Supervisor Architecture

A direct call to a classifier answers one question: *"what does this photo look
like?"* A clinician does more: they evaluate morphology across ABCDE criteria,
extract symptoms (pruritus, bleeding, evolution), compare with historical scans,
weigh risk factors, query clinical guidelines, fuse evidence into urgency, and
compile actionable questions for a dermatologist visit.

DermaAgent makes that loop explicit, transparent, and machine-executable:

```
        user turn (text + optional photo)
                │
                ▼
        ┌───────────────┐      routes       ┌──────────────┐
        │  Orchestrator │ ────────────────► │ TriageAgent  │
        │  (supervisor) │                   │              │
        └───────┬───────┘                   │  ReAct loop: │
                │                           │  Thought     │
                │ evidence complete         │  → Action    │──► ToolRegistry
                ▼                           │  → Observation     (9 tools)
        ┌───────────────┐                   │  … ≤14 steps │
        │  AdvisorAgent │ ◄──────────────── └──────────────┘
        │  care plan +  │
        │  ABCDE review │
        │  consult slip │
        └───────┬───────┘
                ▼
     structured report (streamed as SSE events)
```

## 2. The 9 Clinical Domain Tools

All tools live in `ToolRegistry` with JSON-schema descriptions — feeding both the
deterministic clinical policy engine and LLM function calling.

| Tool | Capability | Description |
|---|---|---|
| `analyze_image` | Deep Learning CNN | Runs fine-tuned MobileNetV3 (ISIC 2019, 8 classes) over the attached photo; records scan in memory |
| `extract_abcde_features` | Computer Vision Morphometry | Extracts numerical (0–10) & qualitative metrics: Asymmetry (reflection overlap), Border irregularity (compactness $P^2/4\pi A$), Color variegation (entropy & 6 dermatological shades), Diameter, and Evolution |
| `assess_risk` | Risk Stratification | Scores 7 clinical risk factors (Fitzpatrick phototype, UV history, blistering sunburns, mole burden, family history, age) into low/moderate/elevated/high bands |
| `lookup_condition` | Clinical Profile | Retrieves definition, dermoscopy hallmark patterns, biopsy indications, and clinical pearls for lesion classes |
| `compare_history` | Longitudinal Memory | Compares current scan with previous session scans (top-class change, confidence drift, days elapsed) |
| `check_urgency` | Decision Fusion | Fuses vision classification, ABCDE composite score, symptom red flags, and risk band into explainable `routine / soon / urgent` triage |
| `search_clinical_knowledge` | Knowledge Retrieval | Searches clinical dermatology guidelines (AAD, BAD, DermNet NZ), biopsy techniques (punch vs shave vs excisional), Mohs surgery indications, and SPF recommendations |
| `analyze_symptoms` | Symptom NLP | Parses patient-reported symptoms (bleeding, itching, rapid growth, pain, crusting) and computes a symptom red-flag score (0–100) |
| `generate_doctor_questions` | Care Navigator | Formulates a prioritized, condition-specific checklist of questions for the patient's dermatologist visit |

## 3. Computer Vision ABCDE Engine (`backend/agent/abcde.py`)

- **Asymmetry (A)**: Measures lesion mask reflection symmetry across horizontal and vertical centroid axes using intersection-over-union (IoU).
- **Border Irregularity (B)**: Evaluates contour perimeter gradients and fractal compactness ratio $P^2 / (4\pi A)$ to detect scalloped or notched borders.
- **Color Variegation (C)**: Quantifies color entropy and identifies the presence of recognized dermatological pigment shades: Light Brown, Dark Brown, Black, Erythema/Red, Slate Blue/Grey.
- **Diameter (D)**: Evaluates lesion pixel coverage relative to frame (equivalent to <4mm, 4–6mm, or >6mm).
- **Evolution (E)**: Evaluates temporal drift from historical session memory.

## 4. Frontend Interactive Capabilities (`AgentChat.tsx`)

- **1-Click Clinical Test Samples**: Instant buttons for `Melanoma`, `Nevus`, and `Basal Cell` samples for zero-friction demonstrations.
- **Interactive Suggestion Pills**: Quick-reply chips (`Yes to all`, `No to all`, `Skip risk check`, etc.) so users don't have to type repetitive answers.
- **ABCDE Morphological Scorecard**: Visual breakdown with colored severity bars for each criterion.
- **Dermatologist Consultation Checklist**: Interactive checkbox list of questions with a 1-click "Copy all" button.
- **Print / Export Consultation Sheet**: Formats a formal clinical screening summary for patients to bring to their in-person clinical appointment.

