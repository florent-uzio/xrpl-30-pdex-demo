# Domain docs

This repo uses a **single-context** layout:

- `CONTEXT.md` at the repo root — domain language and terminology
- `docs/adr/` at the repo root — architecture decision records

## Reading CONTEXT.md

Skills like `improve-codebase-architecture` and `diagnose` read `CONTEXT.md` to understand the project's language and constraints. Keep it updated as the domain evolves.

## Reading ADRs

Past decisions live in `docs/adr/`. Each file should follow the format:

```
# ADR-NNN: Title

**Status:** Accepted|Pending|Superseded

**Context:** Problem statement

**Decision:** What we chose

**Rationale:** Why

**Consequences:** Tradeoffs
```
