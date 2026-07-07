# Security analysis: ReadOnly GitHub Adapter Capability Layer

Date: 2026-07-07

Scope: static design review of the proposed ReadOnly capability boundary for `packages/github-adapter`.

## Evidence collected

Read-before-sketch inputs reviewed:

- `.specify/memory/constitution.md`
- `packages/github-adapter/src/adapter.ts`
- `packages/github-adapter/src/real-adapter.ts`
- `packages/github-adapter/src/client.ts`
- `packages/github-adapter/src/errors.ts`
- Requested `packages/opencode-adapter/src/opencode-policy.ts` was not present. Actual match found: `packages/sandbox/src/opencode-policy.ts`.
- `apps/server/src/real-mode-check.ts`
- Supporting logging paths: `packages/github-adapter/src/sync-service.ts`, `packages/github-adapter/src/labels.ts`
- Server gates in `apps/server/src/index.ts`

Environment/token scan evidence:

- `glob("**/.env*")` returned only `/home/xxammaxx/Schreibtisch/Positron/.env.example`.
- `git status --short -- '.env*' '**/.env*'` returned no output; no untracked/modified env file was reported by that check.
- `grep("GITHUB_TOKEN|GH_TOKEN|GITHUB_MODE|POSITRON_GITHUB_MODE", packages/github-adapter)` found only:
  - `client.ts:14` reads `options?.token ?? process.env['GITHUB_TOKEN'] ?? ''`.
  - `client.ts:16` warns when no token is set.
  - `errors.ts:12` mentions `GITHUB_TOKEN` in an auth error message.
- `grep("ghp_|github_pat_", repository)` found template/test/documentation hits including `docker-compose.yml` defaults `ghp_fake`, test fixture values, documentation audit notes, and dependency README examples. No real-looking hardcoded production token was identified in the reviewed output.

No live exploitation was performed and no CVSS score is assigned; findings below are design/security review risks backed by static evidence.

## Findings

### F-01: Interface-only readonly is bypassable

Risk: HIGH design risk

Evidence:

- `GitHubAdapter` includes read and write methods in one interface: `createIssueComment`, `addIssueLabels`, `removeIssueLabel`, `claimIssue`, `createPullRequest`, `mergePullRequest`, `requestReviewers`, `closeIssue`.
- `RealGitHubAdapter implements GitHubAdapter` and executes all write methods when called.

Assessment:

- A TypeScript-only `Readonly<GitHubAdapter>` or narrowed interface is not a security boundary. `as any`, `unknown as GitHubAdapter`, or direct use of `RealGitHubAdapter` bypasses compile-time readonly intent.

Recommendation:

- Implement a runtime wrapper that exposes only read methods, or implements all write methods as explicit denials.
- Do not rely on TypeScript types alone for capability enforcement.

### F-02: Wrapper can be bypassed if it exposes or weakly stores the inner adapter

Risk: HIGH design risk

Evidence:

- `RealGitHubAdapter` has public `getClient(): Octokit` at `real-adapter.ts:275-277`, which exposes the raw Octokit client if a caller obtains a `RealGitHubAdapter` reference.

Assessment:

- If `ReadOnlyGitHubAdapter` extends `RealGitHubAdapter`, inherits `getClient`, exposes an `inner` property, or stores `private inner` using TypeScript `private`, callers can likely recover write capability at runtime through JavaScript property access or public inherited APIs.

Recommendation:

- Prefer composition, not inheritance.
- Store the wrapped adapter in an ECMAScript `#inner` private field or closure-local variable.
- Do not implement `getClient` on readonly objects.
- Do not export factory APIs that return both readonly and real references to untrusted code.
- Consider a separate `GitHubReadAdapter` interface containing only: `getRepository`, `listOpenIssues`, `getIssue`, `listIssueComments`, `listPullRequests`, `listPullRequestFiles`, `getPullRequest`.

### F-03: Write denials need runtime behavior, not just missing methods

Risk: MEDIUM design risk

Assessment:

- If the readonly adapter is typed as a read-only interface with missing write methods, accidental calls fail as `TypeError: adapter.createIssueComment is not a function`. That is less auditable than an intentional capability-denied error.

Recommendation:

- If consumers may still receive a `GitHubAdapter`, implement every write method and return a rejected promise with a dedicated error.
- Suggested error: add `GitHubCapabilityError extends GitHubError` with a message like `GitHub write capability denied: <method>`.
- Because adapter methods are async and the interface returns `Promise`, denial should be returned as a rejected promise by an `async` method throwing `GitHubCapabilityError`.

### F-04: Token handling is mostly safe, but some error/log paths should redact all thrown values

Risk: MEDIUM design risk

Evidence:

- `client.ts:14` reads token from `options?.token` or `process.env['GITHUB_TOKEN']`.
- `client.ts:16` logs only absence of token, not token value.
- `real-mode-check.ts:29` logs token length only, not token value.
- `real-adapter.ts:77,79` redacts `RequestError` validation/unknown messages.
- `real-adapter.ts` has multiple non-RequestError paths using `String(err)` without `redactSecrets`, e.g. `getRepository`, `listOpenIssues`, `getIssue`, `listIssueComments`, `createIssueComment`, `addIssueLabels`, `removeIssueLabel`, `closeIssue`.
- `labels.ts:26` logs `String(err)` without redaction.

Assessment:

- No direct `console.log` of `GITHUB_TOKEN` was found in reviewed GitHub adapter files.
- Token leakage is unlikely in normal Octokit `RequestError` handling, but unredacted generic error/string logging is not a safe invariant.

Recommendation:

- Apply `redactSecrets(String(err))` in all GitHub adapter error/log paths before storing, returning, or logging error text.
- Replace `labels.ts:26` with a redacted log message.
- Avoid logging token length in security-sensitive diagnostics if not operationally required.

### F-05: Existing kill switches do not replace readonly adapter enforcement

Risk: MEDIUM design risk

Evidence:

- `apps/server/src/index.ts:1087-1129` gates workspace push on `POSITRON_ENABLE_PUSH === 'true'`.
- `apps/server/src/index.ts:1293-1296` checks merge flags and kill switch.
- `apps/server/src/index.ts:1491-1502` blocks merge when `POSITRON_MERGE_KILL_SWITCH !== 'false'`.
- `docker-compose.yml` scan output showed `POSITRON_ENABLE_PUSH=${POSITRON_ENABLE_PUSH:-false}` and hardcoded `POSITRON_MERGE_KILL_SWITCH=true`.

Assessment:

- Push and merge gates protect specific orchestration paths.
- They do not block all GitHub write methods: comments, labels, reviewer requests, PR creation, issue closing, or direct calls to a `RealGitHubAdapter` reference.

Recommendation:

- Treat readonly adapter as a separate mandatory capability boundary.
- Keep kill switches as defense-in-depth for orchestration, not as adapter-level authorization.

## Go / No-Go

Decision: GO WITH CONDITIONS.

The capability layer design is acceptable only if it is implemented as a runtime-enforced composition boundary with no exposed raw `RealGitHubAdapter` or Octokit client. TypeScript-only narrowing is NO-GO as a security boundary.

Minimum acceptance criteria:

1. Add a separate read interface or a runtime `ReadOnlyGitHubAdapter` with explicit write denials.
2. Use composition with `#inner`/closure-private storage; no inheritance from `RealGitHubAdapter`.
3. Do not expose `getClient` or raw Octokit from the readonly adapter.
4. Add tests proving every write method rejects with `GitHubCapabilityError` and no mocked Octokit write endpoint is called.
5. Redact all generic GitHub adapter error/log strings.
6. Keep `POSITRON_ENABLE_PUSH` and `POSITRON_MERGE_KILL_SWITCH` as additional gates, but do not rely on them for readonly enforcement.
