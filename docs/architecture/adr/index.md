# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the Positron project.

Each ADR documents a significant architectural decision with:
- **Context:** the problem being addressed
- **Decision:** the chosen approach
- **Consequences:** the resulting tradeoffs
- **Alternatives:** approaches considered and rejected

ADRs are immutable once accepted. To change a decision, create a new ADR that supersedes the old one.

## Index

| ADR | Title | Status | Date |
|---|---|---|---|
| [ADR-0004](0004-hybrid-test-architecture.md) | MCP-powered Hybrid Test Architecture | Proposed | 2026-05-25 |
| [ADR-0005](0005-sse-realtime-transport.md) | SSE for Real-time Transport | Proposed | 2026-05-26 |
| [ADR-0006](0006-http-cancel-in-memory-signal.md) | HTTP Cancel with In-Memory Signal | Proposed | 2026-05-28 |
| [ADR-0007](0007-docs-as-code-platform.md) | Docs-as-Code Platform (MkDocs) | Proposed | 2026-06-09 |

## Creating a New ADR

1. Choose the next sequential number (`NNNN`)
2. Copy the template from this document
3. Fill in Context, Decision, Consequences, Alternatives
4. Add to this index
5. Add to `mkdocs.yml` navigation

## ADR Status Values

- **Proposed:** Awaiting review and acceptance
- **Accepted:** Approved and active
- **Deprecated:** Superseded by a newer ADR
- **Rejected:** Considered and explicitly not chosen
