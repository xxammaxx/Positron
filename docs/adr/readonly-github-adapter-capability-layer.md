# ADR: ReadOnly GitHub Adapter Capability Layer

## Status

Proposed — July 2026

## Context

`packages/github-adapter/` currently exposes a single `GitHubAdapter` interface that mixes read and write operations. `RealGitHubAdapter` implements every method directly against Octokit and has no adapter-level capability guard. `FakeGitHubAdapter` implements the same full surface for tests. `GitHubStatusSyncService` accepts `GitHubAdapter` and performs write operations through comments and labels.

The current technical boundary is therefore only social/conventional: any caller that receives a `RealGitHubAdapter` can invoke any read or write method and the adapter will execute it. This conflicts with Positron's security-by-default model, trust-tier model, and fake-by-default posture for external write-capable automation.

Current source review also shows that the interface contains seven read-shaped methods and eight write/composite-write methods:

- Read-shaped: `getRepository`, `listOpenIssues`, `getIssue`, `listIssueComments`, `listPullRequests`, `listPullRequestFiles`, `getPullRequest`.
- Write/composite-write: `createIssueComment`, `addIssueLabels`, `removeIssueLabel`, `claimIssue`, `createPullRequest`, `mergePullRequest`, `requestReviewers`, `closeIssue`.

The design goal is to let readonly consumers depend on a smaller, safer interface while retaining backward compatibility for existing full-write consumers and existing `FakeGitHubAdapter` tests.

## Decision

Adopt a two-layer approach:

1. Extract a `ReadOnlyGitHubAdapter` interface containing only read methods.
2. Make `GitHubAdapter extends ReadOnlyGitHubAdapter` for backward compatibility.
3. Add a small runtime capability layer/wrapper for legacy or untyped boundaries that delegates reads and fails closed for writes with a dedicated capability error.

Type-level separation is the default boundary for new code. Runtime denial is defense in depth where a full `GitHubAdapter` shape is still required or where JavaScript/untyped consumers may cross the boundary.

## Alternatives Considered

### Option A — Type-level separation

Extract `ReadOnlyGitHubAdapter` from `GitHubAdapter`, then define `GitHubAdapter extends ReadOnlyGitHubAdapter`.

Benefits:

- Strong TypeScript guidance: readonly consumers cannot call write methods at compile time.
- Minimal change to existing implementations: `RealGitHubAdapter` and `FakeGitHubAdapter` can continue implementing `GitHubAdapter`.
- Backward compatible for consumers importing `GitHubAdapter`.
- High cohesion: read-only workflow code declares a read-only dependency.
- Easy to test with existing fake adapter because a full fake is structurally assignable to the read-only interface.

Limitations:

- Type safety is not a runtime security boundary.
- Existing consumers typed as `GitHubAdapter` remain write-capable until migrated.
- JavaScript consumers or unsafe casts can still invoke writes on a real adapter instance.

### Option B — Wrapper/decorator pattern

Create a `ReadOnlyGitHubAdapterWrapper` around a full adapter. It delegates read methods and blocks write methods at runtime.

Benefits:

- Provides a runtime fail-closed boundary.
- Useful for capability boundaries that cross package edges, dependency injection containers, dynamic plugin/MCP-like surfaces, or legacy code still expecting a full adapter shape.
- Testable with `FakeGitHubAdapter` without real GitHub calls.

Limitations:

- If implemented as a full `GitHubAdapter`, TypeScript still exposes write methods; they fail only at runtime.
- If implemented as only `ReadOnlyGitHubAdapter`, attempted writes are blocked by absence rather than by a typed method error.
- Adds another object to reason about and must avoid exposing the wrapped adapter.

### Option C — Capability object pattern

Pass a capabilities object such as `{ issues: { read: true, write: false }, pullRequests: { read: true, merge: false } }` and check it at method entry.

Benefits:

- Fine-grained runtime control per operation.
- Can support future roles such as `issue-comment-only`, `pr-read-only`, or `merge-disabled`.
- Centralizes authorization checks inside adapter methods.

Limitations:

- More invasive: every write and possibly every read method needs a capability check.
- More complex test matrix and higher risk of inconsistent checks.
- Weakens separation of concerns by mixing transport behavior with policy evaluation.
- Backward compatibility is harder because constructors/factories need capability state.
- Overkill for the immediate readonly boundary requirement.

## Recommended Approach and Rationale

Recommend Option A as the primary design, with a minimal Option B runtime wrapper for defense in depth.

Rationale:

- **TypeScript type safety:** New readonly consumers depend on `ReadOnlyGitHubAdapter`, so write calls fail at compile time.
- **Runtime enforcement:** The wrapper/capability layer provides a fail-closed object for places where type-only restrictions are insufficient.
- **Backward compatibility:** `GitHubAdapter extends ReadOnlyGitHubAdapter`; existing classes and consumers do not need immediate rewrites.
- **Testability:** Existing `FakeGitHubAdapter` can be injected wherever `ReadOnlyGitHubAdapter` is required. Wrapper tests can assert that fake-backed write attempts throw without touching GitHub.
- **Minimal code changes:** The interface extraction is small; existing method implementations remain unchanged.
- **Clear separation of concerns:** Interfaces express consumer needs, while the runtime wrapper handles boundary enforcement. Adapter transport logic remains separate from orchestration policy.

This is not a complete authorization framework. It is a capability boundary that prevents accidental and unauthorized write access for read-only consumers.

## API Surface Design

### `ReadOnlyGitHubAdapter`

Define in `packages/github-adapter/src/adapter.ts` or a new `readonly-adapter.ts` re-exported from `adapter.ts`:

```ts
export interface ReadOnlyGitHubAdapter {
	getRepository(owner: string, repo: string): Promise<GitHubRepositorySummary>;

	listOpenIssues(
		owner: string,
		repo: string,
		options?: {
			labels?: string[];
			since?: string;
			limit?: number;
		},
	): Promise<GitHubIssueSummary[]>;

	getIssue(ref: GitHubIssueRef): Promise<GitHubIssueSummary>;

	listIssueComments(ref: GitHubIssueRef): Promise<GitHubIssueComment[]>;

	listPullRequests(options: PRListOptions): Promise<GitHubPullRequest[]>;

	listPullRequestFiles(owner: string, repo: string, prNumber: number): Promise<GitHubPRFile[]>;

	getPullRequest(owner: string, repo: string, prNumber: number): Promise<GitHubPullRequest>;
}

export interface GitHubAdapter extends ReadOnlyGitHubAdapter {
	createIssueComment(ref: GitHubIssueRef, body: string): Promise<GitHubCommentResult>;
	addIssueLabels(ref: GitHubIssueRef, labels: string[]): Promise<void>;
	removeIssueLabel(ref: GitHubIssueRef, label: string): Promise<void>;
	claimIssue(ref: GitHubIssueRef, options: ClaimOptions): Promise<GitHubIssueClaimResult>;
	createPullRequest(options: CreatePROptions): Promise<GitHubPullRequest>;
	mergePullRequest(options: MergePROptions): Promise<MergePRResult>;
	requestReviewers(options: RequestReviewersOptions): Promise<RequestReviewersResult>;
	closeIssue(owner: string, repo: string, issueNumber: number): Promise<void>;
}
```

### Runtime write blocking

Add `packages/github-adapter/src/readonly-adapter.ts`:

- `createReadOnlyGitHubAdapter(adapter: ReadOnlyGitHubAdapter): ReadOnlyGitHubAdapter` returns a read-only facade exposing only read methods.
- `ReadOnlyGitHubAdapterWrapper` delegates read methods to the wrapped adapter.
- For legacy boundaries that require a full adapter shape, provide an explicit `createBlockedWriteGitHubAdapter(adapter: GitHubAdapter): GitHubAdapter` or equivalent class whose write methods throw.

The default recommendation is to inject the read-only facade as `ReadOnlyGitHubAdapter`, not as `GitHubAdapter`.

### Error type

Add a dedicated error in `packages/github-adapter/src/errors.ts`:

```ts
export class GitHubCapabilityError extends GitHubPermissionError {
	readonly operation: string;
	readonly requiredCapability = 'github:write';

	constructor(operation: string) {
		super(`GitHub operation '${operation}' requires write capability`);
		this.name = 'GitHubCapabilityError';
		this.operation = operation;
	}
}
```

If subclassing `GitHubPermissionError` is not compatible with its current constructor shape, subclass `GitHubError` directly while preserving redaction-safe messages.

Blocked operations must fail closed before calling Octokit or the wrapped adapter write method.

## Implementation Plan

### New files

- `packages/github-adapter/src/readonly-adapter.ts`
  - `ReadOnlyGitHubAdapterWrapper`
  - `createReadOnlyGitHubAdapter(...)`
  - optional `createBlockedWriteGitHubAdapter(...)` for legacy full-shape boundaries
- `packages/github-adapter/src/__tests__/readonly-adapter.test.ts`
  - verifies read delegation
  - verifies writes are unavailable on the read-only facade at type level where possible
  - verifies blocked full-shape writes throw `GitHubCapabilityError`

### Existing files to modify

- `packages/github-adapter/src/adapter.ts`
  - extract `ReadOnlyGitHubAdapter`
  - make `GitHubAdapter extends ReadOnlyGitHubAdapter`
- `packages/github-adapter/src/errors.ts`
  - add `GitHubCapabilityError`
- `packages/github-adapter/src/index.ts`
  - export `ReadOnlyGitHubAdapter`
  - export runtime wrapper/factory
  - export `GitHubCapabilityError`
- `packages/github-adapter/src/real-adapter.ts`
  - no behavior change required; optionally annotate that it is full write-capable
- `packages/github-adapter/src/fake-adapter.ts`
  - no behavior change required; it remains a full fake and can satisfy both interfaces
- Consumers in `apps/server/`, `packages/opencode-adapter/`, or orchestration code
  - migrate read-only flows to accept `ReadOnlyGitHubAdapter`
  - keep write flows on `GitHubAdapter`

### Interface changes

- Non-breaking addition of `ReadOnlyGitHubAdapter`.
- Non-breaking redefinition of `GitHubAdapter` as an extension of `ReadOnlyGitHubAdapter`.
- No method signatures need to change.

### Test strategy

- Unit tests only; no real GitHub calls and no tokens.
- Use `FakeGitHubAdapter` as the wrapped adapter.
- Assert read methods return the same fake data through the read-only facade.
- Assert each write method on the blocked full-shape adapter throws `GitHubCapabilityError` and does not mutate fake state.
- Add TypeScript-level checks through `tsc -b`/package typecheck to ensure consumers typed as `ReadOnlyGitHubAdapter` cannot call write methods.
- Existing `GitHubStatusSyncService` tests should continue to use `GitHubAdapter` because the service is intentionally write-capable.

## Integration Points

### `packages/opencode-adapter/`

No current direct import of `@positron/github-adapter` was found in `packages/opencode-adapter/src`. Future OpenCode-facing read-only features should receive `ReadOnlyGitHubAdapter` or a read-only facade instead of `RealGitHubAdapter`/`GitHubAdapter`.

If OpenCode execution ever needs GitHub context, the integration boundary should be:

- Read-only issue/PR/repository context: `ReadOnlyGitHubAdapter`.
- Any comment, label, PR creation, reviewer request, merge, or close operation: not allowed through OpenCode directly; route through orchestrator services with explicit gates.

This preserves the trust-tier distinction between readonly context access and write-capable automation.

### `GitHubStatusSyncService`

`GitHubStatusSyncService` is a write service by design. It should continue to require the full `GitHubAdapter` because it calls:

- `listIssueComments` for deduplication,
- `createIssueComment` for status comments,
- `addIssueLabels` and `removeIssueLabel` for lifecycle labels.

Do not inject `ReadOnlyGitHubAdapter` into this service. Instead, keep its write capability explicit and ensure callers instantiate it only in phases that have passed write gates.

### Existing consumers

- Existing consumers typed as `GitHubAdapter` continue to compile.
- New read-only consumers must accept `ReadOnlyGitHubAdapter`.
- Existing consumers that only read should be migrated opportunistically within scoped issues, not by broad refactor.
- Factories may expose both full and readonly creation paths, for example `createRealGitHubAdapter()` and `createReadOnlyGitHubAdapter(createRealGitHubAdapter())`.

## Migration Path

1. Add `ReadOnlyGitHubAdapter` and exports without changing implementations.
2. Add runtime wrapper and `GitHubCapabilityError`.
3. Add package unit tests and run package typecheck/tests.
4. Migrate obvious read-only consumers from `GitHubAdapter` to `ReadOnlyGitHubAdapter` in small, issue-scoped changes.
5. Keep `GitHubStatusSyncService` and other write services on full `GitHubAdapter`.
6. For external/untrusted or OpenCode-facing boundaries, pass only a read-only facade.

Breaking changes: none required for this ADR's recommended first implementation. A later cleanup could make some constructors accept narrower interfaces, but that should be done as separate scoped work.

## Consequences

### Positive

- Read-only data flow becomes explicit and reviewable.
- Compile-time coupling decreases for read-only consumers.
- Runtime wrapper provides defense in depth for capability boundaries.
- Existing fake adapter remains usable for tests.
- No dependency changes are required.

### Negative / Tradeoffs

- Two concepts must be documented: readonly interface and runtime blocked wrapper.
- Type-level separation alone is not sufficient as a security boundary.
- Existing write-capable consumers remain write-capable until migrated.
- Fine-grained write roles are deferred.

### Security impact

- Reduces accidental writes by narrowing consumer types.
- Supports fail-closed behavior at package boundaries.
- Does not replace token scoping, GitHub App permissions, human approval gates, or orchestration-level policy checks.

## Architecture Review Checklist

- [x] New dependency justified: no new dependency needed.
- [x] Module coupling acceptable: read-only consumers depend on a narrower interface; write services remain explicit.
- [x] Data flow documented and secure: read-only vs write-capable flow is separated.
- [x] Error handling strategy consistent: blocked writes use a GitHub adapter error type.
- [x] Scaling bottlenecks identified: no runtime bottleneck beyond trivial wrapper delegation.
- [x] Security boundaries clearly defined: type-level boundary plus runtime fail-closed wrapper.
- [x] Testing strategy adequate: fake-backed unit tests and typecheck, no real GitHub calls.

## Follow-up

- Implement the interface extraction and wrapper in `packages/github-adapter`.
- Add tests for every blocked write method.
- Audit server/orchestrator consumers and migrate read-only flows incrementally.
- Document which orchestration phases may receive full `GitHubAdapter`.
