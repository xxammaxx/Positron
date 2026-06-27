# Portfolio Gap Discovery — Missing Parts Roadmap

## Priority Levels

| Level | Risk | Description |
|-------|------|-------------|
| 1 — GREEN_SAFE | None | Documentation, hygiene, tests — no code risk |
| 2 — YELLOW_VALIDATE | Medium | Feature work with approval or dependencies |
| 3 — RED_HOLD | High | Safety-critical runtime gates, blocked by approval |

---

## Level 1: GREEN_SAFE — Do Immediately

These issues are low-risk, high-value, and mostly documentation/hygiene. They improve clarity for the owner and AI alike.

| # | Issue | Priority | Type | Risk |
|---|-------|----------|------|------|
| 1 | **#307** — Docs: Sync all status docs, README, API, changelog, evidence index | P2 | Docs | GREEN_SAFE |
| 2 | **#306** — Backlog Hygiene: Milestones, labels, taxonomy | P2 | Hygiene | GREEN_SAFE |
| 3 | **#304** — Post-299: Stabilize Playwright tracing lifecycle in E2E | P2 (existing) | Bug | GREEN_SAFE |
| 4 | **#305** — Evidence Portfolio: Automate post-run capability updates | P2 | Feature | GREEN_SAFE |
| 5 | **#251** — Update api-overview.md with #229 endpoints | P2 (existing) | Docs | GREEN_SAFE |
| 6 | **#250** — CT-120 Browser Evidence Smoke Test | P2 (existing) | Testing | GREEN_SAFE |
| 7 | **#211** — GitHub repo polish with screenshots | P2 (existing) | Docs | GREEN_SAFE |

**Rationale:** Fix the documentation drift first, then the E2E flake, then add automation, then tests, then polish. All GREEN_SAFE — no approval needed.

---

## Level 2: YELLOW_VALIDATE — Next Product Core

These issues add real product/runtime capabilities. Some need owner approval before starting.

| # | Issue | Priority | Type | Risk | Blocker |
|---|-------|----------|------|------|---------|
| 8 | **#248** — Display LivingEvidencePortfolio in Dashboard | P1 (existing) | Feature | GREEN_SAFE | — |
| 9 | **#249** — Auto-Populate Infrastructure State Stores | P1 (existing) | Feature | YELLOW | Needs decision |
| 10 | **#229** — MCP/OpenCode Provider Bootstrap sub-issues | P1 (existing) | Epic | YELLOW | Needs splitting |
| 11 | **#243** — Agentic/Vibe-Coding Baseline sub-issues | Epic (existing) | Epic | YELLOW | Needs splitting |
| 12 | **#247** — Trace and Eval Aggregation | P1 (existing) | Feature | YELLOW | Needs approval |
| 13 | **#224** — Tool Monitoring Dashboard integration | (existing) | Feature | YELLOW | — |
| 14 | **#308** — Supervised Full Real Mode validation pilot | P1 (new) | Research | YELLOW | BLOCKED |

**Rationale:** Start with dashboard features (#248, #249), then tackle epics by splitting into small GREEN_SAFE sub-issues. Trace/Eval (#247) needs approval. Real Mode pilot (#308) is last — blocked on P0 gates.

---

## Level 3: RED_HOLD — Safety-Critical Runtime Gates

These are P0 safety features that require explicit owner approval. They enable Full Real Mode.

| # | Issue | Priority | Type | Risk | Blocker |
|---|-------|----------|------|------|---------|
| 15 | **#215** — GATE_APPROVE runtime hook (PR #218 exists) | (existing) | Safety | RED | Owner merge decision |
| 16 | **#244** — Runtime Workspace Cleanup | P0 (existing) | Safety | RED | Needs approval |
| 17 | **#245** — Enforce requiresAuditLog | P0 (existing) | Safety | RED | Needs approval |
| 18 | **#246** — Enforce GateType Layers | P0 (existing) | Safety | RED | Needs approval |

**Rationale:** These are blocked on owner decisions. PR #218 for #215 exists and needs merge. #244-#246 are typed but not enforced. Owner should review and approve in dependency order.

---

## Recommended Build Order

```
Week 1:  #307 (Docs Sync) → #306 (Backlog Hygiene)
Week 2:  #304 (E2E Tracing Fix) → #305 (Portfolio Auto-Update)
Week 3:  #251 (API docs) + #250 (Smoke tests) + #211 (Repo polish)
Week 4:  #248 (Portfolio Display) → #249 (State Stores)
Week 5+: #229/#243 epic splitting → #247 (Trace/Eval) → #308 (Real Mode pilot)
When ready: #215/#244/#245/#246 (P0 safety) → merge PR #218
```

## Dependency Graph (simplified)

```
#307 ──► #306 ──► #304 ──► #305
                           │
#251 ──► #250 ──► #211    │
                           ▼
              #248 ──► #249 ──► #229/#243 split
                                    │
              #247 ◄────────────────┘
                │
                ▼
    #215 ──► #244 ──► #245 ──► #246
                │
                ▼
              #308 (Real Mode pilot)
```
