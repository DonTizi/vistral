# ADR-004: Server-Sent Events for Real-Time Progress

**Status:** Accepted
**Date:** 2026-02-28

## Context
Video processing takes 30-50 seconds for a 10-minute video. Users need real-time feedback about pipeline progress. The demo needs to show the knowledge graph being built progressively.

## Decision
Use Server-Sent Events (SSE) from FastAPI backend to Next.js frontend. Each pipeline step emits progress events. The frontend renders pipeline animation and progressively builds the timeline/graph visualization.

## Alternatives Considered
- **WebSockets**: Bidirectional, but we only need server-to-client. More complex setup. Overkill.
- **Polling**: Simple but high latency (100-500ms intervals). Poor UX for a smooth animation.
- **Long polling**: Marginally better than polling but still suboptimal for continuous progress updates.

## Consequences
- Native browser support (EventSource API), no extra dependencies
- One-directional: backend pushes, frontend listens
- Automatic reconnection built into the protocol
- Clean integration with FastAPI's `sse-starlette` package
- Frontend can show smooth, progressive pipeline animation
