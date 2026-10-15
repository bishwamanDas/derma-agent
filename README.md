# DermaAgent — AI-Powered Skin Lesion Screening Platform

> A full-stack, production-grade clinical screening platform that combines **Agentic AI**, **Deep Learning (CNN)**, **LLM-powered conversational triage**, **NLP symptom analysis**, **Computer Vision morphometry**, and a **premium animated frontend** — built end-to-end from model training to cloud deployment.

**🔗 Live Demo:** [derma-agent.vercel.app](https://derma-agent.vercel.app)  
**📦 Backend API:** [derma-agent-api.onrender.com](https://derma-agent-api.onrender.com/api/health)

---

## ✨ Highlights

- **Multi-Agent Supervisor Architecture** — ReAct (Reason + Act) loop with Orchestrator, TriageAgent, and CareAdvisorAgent coordinating autonomously
- **9 Domain-Specific Clinical Tools** — tool registry with JSON-schema descriptions for both deterministic planning and LLM function calling
- **Fine-Tuned MobileNetV3-Large CNN** — transfer learning on 25,331 ISIC 2019 dermoscopy images across 8 lesion classes (75.6% test accuracy)
- **Gemini 2.0 Flash LLM Integration** — conversational follow-up Q&A with automatic fallback to deterministic clinical policy engine
- **Computer Vision ABCDE Engine** — real-time morphological feature extraction (Asymmetry, Border, Color, Diameter, Evolution)
- **NLP Symptom Parser** — extracts and scores clinical red flags (bleeding, rapid growth, itching, pain, crusting)
- **Knowledge Retrieval (RAG-style)** — searches AAD, BAD, and DermNet NZ clinical guidelines for evidence-based recommendations
- **Premium Animated UI** — glassmorphism, Framer Motion micro-animations, GSAP scroll effects, dark/light theme, fully responsive

---

## 🧠 Architecture

```
                 User (photo + text)
                        │
                        ▼
              ┌───────────────────┐
              │    Orchestrator   │  ← Supervisor: routes & manages agent lifecycle
              │    (Supervisor)   │
              └────────┬──────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
   ┌────────────┐ ┌──────────┐ ┌───────────────┐
   │ TriageAgent│ │  Advisor │ │ LLM Follow-up │
   │ (ReAct)    │ │  Agent   │ │ (Gemini 2.0)  │
   └─────┬──────┘ └──────────┘ └───────────────┘
         │
         ▼
   ┌─────────────────────────────────────┐
   │         Tool Registry (9 tools)     │
   │                                     │
   │  🔬 analyze_image (CNN)             │
   │  📐 extract_abcde_features (CV)     │
   │  ⚠️  assess_risk (7-factor scoring) │
   │  📖 lookup_condition (knowledge DB) │
   │  📊 compare_history (memory drift)  │
   │  🚨 check_urgency (decision fusion) │
   │  🔍 search_clinical_knowledge (RAG) │
   │  💬 analyze_symptoms (NLP parser)   │
   │  📋 generate_doctor_questions       │
   └─────────────────────────────────────┘
```

**ReAct Loop:** `Thought → Action (tool call) → Observation → ...` bounded at 14 steps with graceful failure handling — every tool error is absorbed as an observation, not a crash.

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 16** | React framework with App Router, SSR, and API route proxying |
| **TypeScript** | End-to-end type safety across all components and hooks |
| **Tailwind CSS v4** | Utility-first styling with custom dark/light theme tokens |
| **Framer Motion** | Scroll-triggered animations, micro-interactions, and page transitions |
| **GSAP** | High-performance text splitting and scroll-driven parallax effects |

### Backend
| Technology | Purpose |
|---|---|
| **FastAPI** | Async Python API server with automatic OpenAPI docs |
| **PyTorch** | Deep learning inference engine (MobileNetV3-Large, TorchScript) |
| **Pillow / NumPy** | Image preprocessing pipeline (resize, normalize, EXIF correction) |
| **Uvicorn** | ASGI production server with async event streaming (SSE) |

### AI / ML
| Technology | Purpose |
|---|---|
| **Agentic AI (ReAct)** | Multi-agent supervisor with autonomous tool-calling reasoning loop |
| **CNN (MobileNetV3-Large)** | Transfer learning on ISIC 2019 for 8-class lesion classification |
| **LLM (Gemini 2.0 Flash)** | Conversational follow-up, clinical Q&A, and function calling |
| **NLP** | Symptom red-flag extraction and clinical text parsing |
| **Computer Vision** | ABCDE morphological analysis (asymmetry IoU, border compactness, color entropy) |
| **RAG (Knowledge Retrieval)** | Clinical guideline search across AAD, BAD, and DermNet databases |

### DevOps & Deployment
| Technology | Purpose |
|---|---|
| **Docker** | Containerized backend with CPU-optimized PyTorch for cloud deployment |
| **Render** | Free-tier backend hosting with health checks and auto-deploy |
| **Vercel** | Frontend hosting with edge network, automatic HTTPS, and API proxying |
| **Git / GitHub** | Version control with conventional commits and clean `.gitignore` |

---

## 🏥 Features

### AI Agent Chat
- **Autonomous clinical triage** — upload a photo and the agent runs a full multi-step analysis automatically
- **1-click test samples** — instant `Melanoma`, `Nevus`, and `Basal Cell` buttons for zero-friction demos
- **Live reasoning trace** — watch the agent's Thought → Action → Observation loop in real-time via SSE streaming
- **ABCDE morphological scorecard** — visual breakdown with colored severity bars for each criterion
- **Interactive doctor checklist** — prioritized questions for your dermatologist visit with copy-all
- **Quick-reply suggestion chips** — context-aware response buttons so users don't have to type
- **Printable consultation slip** — formatted clinical summary for in-person appointments

### Skin Analysis
- **Drag-and-drop, file picker, or camera capture** — multiple upload methods
- **Top-3 predictions** with animated confidence bars and severity triage (low / moderate / high)
- **Per-condition care tips** and clinical guidance
- **Scan history** persisted in localStorage
- **Model transparency card** with live accuracy metrics from the API

### Risk Assessment
- **7-question interactive assessment** — Fitzpatrick phototype, UV exposure, sunburn history, family history, mole burden, and age
- **Explainable scoring** — each answer shows its point contribution and rationale
- **Personalized risk band** — low / moderate / elevated / high with tailored advice

### Premium UI/UX
- **Dark / light theme** — persisted to localStorage, respects `prefers-color-scheme`, no flash on load
- **Glassmorphism design** — frosted glass cards, gradient backgrounds, glowing hover effects
- **GPU-composited animations** — `will-change: transform`, `translate3d`, respects `prefers-reduced-motion`
- **Fully responsive** — mobile-first design that works across all screen sizes
- **Partners marquee** — scrolling logos of real data sources (ISIC Archive, HAM10000, DermNet, PyTorch)

---

## 🔬 Model Performance

**Architecture:** MobileNetV3-Large (ImageNet-pretrained, fine-tuned)  
**Dataset:** ISIC 2019 — 25,331 dermoscopy images across 8 lesion classes  
**Training:** Two-phase schedule — frozen-backbone head warm-up → discriminative-LR full fine-tune

| Metric | Value |
|---|---|
| Test Accuracy | **75.6%** |
| Balanced Accuracy | **74.5%** |
| Classes | AK · BCC · BKL · DF · MEL · NV · SCC · VASC |
| Inference Time | **< 150 ms** |

Per-class recall (test): AK 65.5 · BCC 79.4 · BKL 69.0 · DF 75.0 · MEL 71.6 · NV 78.4 · SCC 62.7 · VASC 94.1

---

## 📂 Project Structure

```
derma-agent/
├── src/                           # Next.js Frontend
│   ├── app/                       #   Layout, page, globals.css (theme tokens)
│   ├── components/
│   │   ├── AgentChat.tsx          #   Agentic AI chat with live reasoning trace
│   │   ├── SkinAnalysis.tsx       #   CNN diagnosis UI + report download
│   │   ├── RiskCheck.tsx          #   7-question risk assessment
│   │   ├── ThemeToggle.tsx        #   Dark/light theme switch
│   │   ├── Hero.tsx               #   Animated hero with floating stat cards
│   │   ├── Nav.tsx                #   Responsive navigation
│   │   └── ...                    #   Tech, Stats, Services, About, Footer, etc.
│   └── hooks/                     #   Custom React hooks (useCounter, useMagnetic)
│
├── backend/                       # FastAPI + PyTorch Backend
│   ├── app.py                     #   API server: /predict, /agent/*, /model-info
│   ├── agent/                     #   Multi-Agent System
│   │   ├── core.py                #     Orchestrator, TriageAgent, AdvisorAgent, SSE
│   │   ├── planners.py            #     PolicyPlanner (Clinical AI) + LLM Planner
│   │   ├── registry.py            #     Tool registry with 9 clinical tools
│   │   ├── abcde.py               #     Computer vision ABCDE engine
│   │   ├── knowledge.py           #     Clinical knowledge DB + symptom NLP
│   │   ├── llm_chat.py            #     Gemini 2.0 Flash integration
│   │   └── memory.py              #     Conversation + factual memory store
│   ├── diseases.py                #   Per-condition descriptions, tips, severity
│   ├── models/                    #   skin_model.pt (TorchScript) + model_card.json
│   ├── Dockerfile                 #   Production container (CPU-optimized PyTorch)
│   └── requirements.txt           #   Python dependencies
│
├── training/                      # Model Training Pipeline
│   └── train.py                   #   convert → extract → head → finetune → export
│
├── docs/
│   └── AGENT.md                   #   Multi-agent architecture documentation
│
├── next.config.ts                 #   API proxy rewrites (/api/ai/* → backend)
├── render.yaml                    #   Render Blueprint for 1-click backend deploy
└── Dockerfile                     #   Root Dockerfile for cloud deployment
```

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+** and **Node.js 20+**

### Quick Start

**Windows (PowerShell):**
```powershell
.\run-dev.ps1
```

**macOS / Linux:**
```bash
./run-dev.sh
```

This starts both the FastAPI backend (port 8000) and Next.js frontend (port 3000). Open **http://localhost:3000**.

### Manual Setup

```bash
# Terminal 1 — Backend
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000

# Terminal 2 — Frontend
npm install
npm run dev
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Optional | Enables LLM-powered conversational follow-up via Gemini 2.0 Flash. Without it, the deterministic clinical policy engine handles all planning. |

---

## ☁️ Deployment

### Backend → [Render](https://render.com) (Free)
1. Connect your GitHub repo → select **Docker** → root directory: leave blank
2. Add env var: `GEMINI_API_KEY`
3. Deploy — Render auto-detects the `Dockerfile`

### Frontend → [Vercel](https://vercel.com) (Free)
1. Import your GitHub repo
2. Add env var: `BACKEND_API_URL` = `https://your-backend.onrender.com`
3. Deploy — Next.js rewrites proxy all `/api/ai/*` requests to your backend

---

## ⚖️ Disclaimer

This is an **educational screening aid** built on public research data. It does not replace examination by a qualified dermatologist. The application displays appropriate disclaimers throughout the UI.

---

## 📄 License

Built by **Bishwaman Das** — [GitHub](https://github.com/bishwamanDas)
