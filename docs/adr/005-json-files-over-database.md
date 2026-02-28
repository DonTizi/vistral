# ADR-005: JSON File Storage over Database

**Status:** Accepted
**Date:** 2026-02-28

## Context
Hackathon project with 48h time constraint. Need to store job results (transcripts, knowledge graphs, insights) and pre-computed demo data. Single-user, single-machine deployment.

## Decision
Store all data as JSON files on disk, organized by job ID under `backend/data/jobs/`. Pre-computed demos stored under `precompute/demos/`.

## Alternatives Considered
- **SQLite**: Lightweight but adds ORM/query complexity. Schema migrations are overhead.
- **PostgreSQL/Redis**: Production-grade but massive setup overhead for a hackathon.
- **In-memory only**: Fast but data lost on restart. Can't persist between demo sessions.

## Consequences
- Zero setup time: no database to install or configure
- Human-readable: can inspect/debug results directly in JSON files
- Pre-computed demos are just JSON files, trivially loadable
- No concurrent write issues (single pipeline per job)
- Trade-off: no querying capability, but we don't need it (access by job ID only)
