# ADR-001: Temporal Knowledge Graph over Flat Transcript

**Status:** Accepted
**Date:** 2026-02-28

## Context
Most video analysis tools send raw transcripts to an LLM and get a generic summary back. This approach loses temporal relationships, cross-modal signals (audio vs visual), and makes contradiction detection impossible. The Temporal Scene Graph research (2025) shows that structured graph representations achieve 65% accuracy with 3.47k tokens vs 62.5% with 40.39k tokens for flat event logs.

## Decision
Build a Temporal Knowledge Graph (TKG) as the core data structure. Nodes represent entities (speakers, topics, KPIs, slides, decisions, claims). Edges represent temporal relations (said_by, shown_during, contradicts, decided, committed_to). Mistral Small reasons on this serialized graph, not on raw transcript text.

## Alternatives Considered
- **Raw transcript to LLM**: Simple but loses structure. No contradiction detection. Token-expensive for long videos.
- **Structured JSON events**: Better than raw text but still flat. No native graph relationships.
- **Full database (Neo4j)**: Too heavy for a hackathon. Overkill for the data volume.

## Consequences
- Native contradiction detection (conflicting edges between claims)
- 91% more token-efficient than flat event logs
- Every insight is traceable to source evidence (timestamp + quote)
- Graph visualization becomes a natural feature (nodes + edges -> force-directed graph)
- Requires a dedicated graph builder step in the pipeline
