# ADR-003: Mistral Small 3 as Primary LLM over Mistral Large

**Status:** Accepted
**Date:** 2026-02-28

## Context
The pipeline needs an LLM for entity extraction (Pass A) and insight reasoning (Pass B). Mistral offers Small ($0.25/M tokens) and Large ($2-3/M tokens) models. Budget and latency matter for a hackathon demo with live processing.

## Decision
Use Mistral Small 3 (`mistral-small-latest`) as the primary LLM for both passes. Fall back to Mistral Large only if Small produces insufficient quality on a specific task.

## Alternatives Considered
- **Mistral Large for everything**: 10x more expensive. Higher latency. Marginal quality improvement for structured extraction tasks.
- **Mistral Small for Pass A, Large for Pass B**: Reasonable compromise but adds complexity. Test Small first.
- **External models (GPT-4, Claude)**: Not allowed -- 100% Mistral stack is required for the hackathon.

## Consequences
- 90% cost reduction ($0.005 vs $0.05 per video for LLM calls)
- Lower latency (smaller model = faster inference)
- 85-90% quality of Large for structured extraction with good prompts
- Risk: may need to switch Pass B to Large if insights are weak (easy swap, same API)
