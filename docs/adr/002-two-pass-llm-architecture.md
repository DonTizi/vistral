# ADR-002: Two-Pass LLM Architecture (Perception then Reasoning)

**Status:** Accepted
**Date:** 2026-02-28

## Context
Processing video content requires both perception (understanding what is said and shown) and reasoning (extracting insights, detecting contradictions). Research from VideoP2R (2025) demonstrates that separating these concerns achieves SOTA on 6/7 benchmarks. Validated by LLoVi, VideoStreaming, and SlowFocus approaches.

## Decision
Use a two-pass architecture with Mistral Small:
- **Pass A (Perception)**: Entity extraction, topic segmentation, speaker resolution from transcript. Runs in parallel with Pixtral vision analysis.
- **Pass B (Reasoning)**: Insight extraction from the serialized knowledge graph. Identifies action items, decisions, contradictions, KPIs with evidence chains.

## Alternatives Considered
- **Single-pass**: Send everything to one LLM call. Cheaper but worse quality -- mixing perception and reasoning degrades both.
- **Three+ passes**: More granular separation. Diminishing returns and slower processing for hackathon context.
- **Agent loop (multi-turn)**: LLM queries graph iteratively. More flexible but unpredictable latency and cost.

## Consequences
- Pass A can start as soon as transcript is ready (parallel with Pixtral, saving 15-20s)
- Clear separation of concerns: perception inputs != reasoning inputs
- Each pass has focused, optimized prompts (U-shaped for best results)
- Total LLM cost remains low (~$0.005 per video with Mistral Small)
