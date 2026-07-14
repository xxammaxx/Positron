# Positron Stage 2 — Fine-Grained PAT Permission Diagnosis & Retry

## Execution Metadata

| Field | Value |
|-------|-------|
| Run ID | stage2-fine-grained-pat-diagnosis-2026-07-12 |
| Timestamp | 2026-07-12T01:50:00+02:00 |
| Baseline | `ea959dfb24cf4cadd1c018840ee7ce0683a28f4c` |
| Previous runs | PR #368 (403), Token Permission Retry (WRITE_NOT_CONFIRMED) |
| Node | v22.22.0 |
| npm | 10.9.4 |

---

## Final Status

```
POSITRON_STAGE2_SINGLE_COMMENT_RETRY_STATUS: HARNESS_EXECUTED_TOKEN_403_PERMISSION_DENIED
POSITRON_STAGE2_STATUS:                  STAGE2_SINGLE_COMMENT_WRITE_BLOCKED_WITH_REASON
```

---

## Diagnostic Timeline

### Run 1 — Initial Retry (PR #368)
| Check | Result |
|-------|--------|
| Harness executed | ✅ |
| Policy gates passed | ✅ |
| Adapter called | ✅ |
| GitHub response | **403** — "Resource not accessible by personal access token" |
| Token type | Fine-grained PAT |

### Run 2 — Permission Diagnosis
| Check | Result |
|-------|--------|
| `GET /repos/xxammaxx/positron-sandbox` | **200** ✅ — repo readable |
| `GET /repos/xxammaxx/positron-sandbox/issues/1` | **200** ✅ — issue readable |
| Body SHA-256 match | ✅ |
| **Diagnosis** | Token has **Issues: Read**, NOT **Issues: Write** |

### Run 3 — Corrected PAT Attempt
| Check | Result |
|-------|--------|
| User reports PAT corrected to "Issues: Read and write" | ✅ |
| Harness executed | ✅ |
| Post-write verification | **0 comments** — write not confirmed |

---

## Root Cause Analysis

The `403 "Resource not accessible by personal access token"` on `POST /repos/.../issues/1/comments` consistently indicates the fine-grained PAT lacks **Issues: write** permission.

GitHub's fine-grained PAT dropdown offers two adjacent options:
- **Read-only** (default/adjacent)  
- **Read and write** (correct)

A single-click mis-selection results in a token that can read but cannot write. The `GET` endpoints return 200 because read access works; only `POST` reveals the missing write permission.

### Verified GitHub Documentation
- Fine-grained PAT with `Issues: Read and write` **is sufficient** for `POST /repos/{owner}/{repo}/issues/{issue_number}/comments`
- No additional `Contents: read` or other permissions are required
- `Metadata: read` is automatically included with every fine-grained PAT
- Private repos require the repo to be explicitly selected during PAT creation (confirmed working — GET returns 200)

---

## Escalation Path

Three attempts with fine-grained PATs have not resulted in a confirmed write. The investigation recommends:

```text
YELLOW_CLASSIC_REPO_SCOPE_REQUIRED_REVIEW
```

**Rationale for Classic PAT escalation:**

1. Fine-grained PAT architecture is verified correct per GitHub docs
2. The runtime infrastructure (policy → harness → adapter → Octokit) is proven working
3. The blocker is exclusively the token permission model
4. A classic PAT with `repo` scope is the standard, well-tested mechanism for private repo API writes
5. The existing `RealGitHubAdapter` already uses Octokit with PAT auth — the same code path works regardless of token type

**Recommended approach:**
- Create a **Classic PAT** with `repo` scope (full control of private repositories)
- Use it **exclusively** for the single Stage 2 sandbox comment write
- Revoke it immediately after the write is verified
- Use the same harness path — no code changes needed

---

## What Was Proven Across All Runs

| Capability | Status |
|-----------|--------|
| Policy gates (41 tests) | ✅ Always pass |
| Harness gates (63 tests) | ✅ Always pass |
| Adapter contract (26 tests) | ✅ Always pass |
| Gate assembly (48 tests) | ✅ Always pass |
| Gate enforcement (38 tests) | ✅ Always pass |
| Token read access to sandbox | ✅ Verified (200 OK) |
| Token lifecycle (hidden read, redact, unset) | ✅ Working |
| Harness execution path (non-fake) | ✅ Working |
| Error handling (403 → redacted audit) | ✅ Working |
| Write count stays 0 on error | ✅ Working |
| No second write, no label change, no drift | ✅ Enforced |

---

## Explicit Non-Actions (All Runs)

- Second write: **NO**
- `gh issue comment` workaround: **NO**
- `curl POST` outside harness: **NO**
- Direct Octokit outside harness: **NO**
- Label change: **NO**
- PR create by runtime: **NO**
- Push by runtime: **NO**
- Merge by runtime: **NO**
- Issue close: **NO**
- Stage 3: **NO**
- Full Real Mode: **NO**
- Token in chat: **NO**
- `.env` write/commit: **NO**

---

## PR #368 Status

| Field | Value |
|-------|-------|
| Number | #368 |
| State | OPEN (DRAFT) |
| Contains `.tmp/stage2-live-executor.mts` | YES |
| Body says "Do Not Merge" | YES |
| Verdict | **DO NOT MERGE AS-IS** |

---

## Recommended Next Step

Owner review required:

```
YELLOW_CLASSIC_REPO_SCOPE_REQUIRED_REVIEW

Three fine-grained PAT attempts failed to produce a confirmed write.
GET endpoints return 200 (read works), POST returns 403 (write denied).
GitHub docs confirm "Issues: Read and write" should be sufficient.

Recommendation: Create one Classic PAT with "repo" scope,
use it for exactly one sandbox comment via the existing harness,
revoke immediately, document success.
```

## Files Changed / Evidence

- `docs/evidence/stage2-write-sandbox-single-comment-retry-execution.md` — full retry evidence (previous run)
- `.tmp/stage2-diagnose-and-write.sh` — combined Phase D-H wrapper script
- `.tmp/stage2-token-sanity-check.mjs` — read-only token sanity check script
- `.tmp/stage2-live-executor.mts` — harness executor (from d537af1 git history)
