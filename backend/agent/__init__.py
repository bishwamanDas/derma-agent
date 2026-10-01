"""
DermaAgent — agentic clinical-triage pipeline for Helix Derm.

This package implements a multi-agent system rather than a single prompt:

    Orchestrator (supervisor)
      ├── TriageAgent    gathers clinical evidence with tools
      └── AdvisorAgent   turns that evidence into a care plan

Each agent runs a Thought -> Action -> Observation loop over a tool registry.
Two interchangeable planners drive the loop:

  * PolicyPlanner — deterministic state machine, no API key, always available.
  * OpenAIPlanner — real LLM function calling, any OpenAI-compatible endpoint
    (OpenAI, Groq, Azure, vLLM, Ollama's /v1 shim).

The planner is a strategy object behind one interface, so swapping them changes
nothing else in the codebase. See docs/AGENT.md for the design.
"""
from .core import Orchestrator, RunResult, Step
from .memory import Memory, ScanRecord
from .registry import Tool, ToolRegistry, build_registry

__all__ = [
    "Orchestrator",
    "RunResult",
    "Step",
    "Memory",
    "ScanRecord",
    "Tool",
    "ToolRegistry",
    "build_registry",
]
