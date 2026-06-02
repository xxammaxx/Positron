/**
 * GitHub Adapter Contract Tests (QA-023)
 *
 * Verifies the PUBLIC API contract of the GitHub Adapter interface.
 * Tests that FakeGitHubAdapter implements the full GitHubAdapter interface
 * and that the contract is consistent between implementations.
 *
 * Contract guarantees:
 * - All 15 methods exist with correct signatures
 * - Fake adapter implements all interface methods
 * - Methods return stable shapes (not specific values)
 * - No real API calls, no real tokens
 * - Idempotency where documented
 */

import { describe, it, expect, beforeEach } from "vitest";
import type {
	GitHubAdapter,
	GitHubIssueRef,
	GitHubIssueSummary,
	GitHubCommentResult,
	GitHubRepositorySummary,
	GitHubIssueClaimResult,
	GitHubPullRequest,
	GitHubPRFile,
	MergePRResult,
	RequestReviewersResult,
	ClaimOptions,
} from "@positron/github-adapter";
import { FakeGitHubAdapter } from "@positron/github-adapter";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ref: GitHubIssueRef = {
	owner: "test-owner",
	repo: "test-repo",
	issueNumber: 42,
};

const repoSummary: GitHubRepositorySummary = {
	id: 1,
	owner: "test-owner",
	name: "test-repo",
	fullName: "test-owner/test-repo",
	defaultBranch: "main",
};

function makeIssue(
	overrides: Partial<GitHubIssueSummary> = {},
): GitHubIssueSummary {
	return {
		id: 42,
		number: 42,
		title: "Test Issue",
		body: null,
		state: "open",
		labels: ["positron:ready"],
		assignees: [],
		htmlUrl: "https://github.com/test-owner/test-repo/issues/42",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		isPullRequest: false,
		...overrides,
	};
}

const issueSummary = makeIssue();

const claimOpts: ClaimOptions = {
	runId: "run-123",
	claimLabel: "positron:running",
	runningLabel: "positron:running",
	readyLabel: "positron:ready",
	commentBody: "Starting work...",
};

// ---------------------------------------------------------------------------
// Contract: FakeGitHubAdapter implements full GitHubAdapter interface
// ---------------------------------------------------------------------------
describe("FakeGitHubAdapter implements GitHubAdapter contract", () => {
	let adapter: GitHubAdapter;

	beforeEach(() => {
		const fake = new FakeGitHubAdapter();
		fake.addRepo(repoSummary);
		fake.addIssue(issueSummary);
		adapter = fake;
	});

	it("getRepository() returns a repository summary with stable shape", async () => {
		const repo = await adapter.getRepository("test-owner", "test-repo");

		expect(repo).toHaveProperty("owner");
		expect(repo).toHaveProperty("name");
		expect(repo).toHaveProperty("defaultBranch");
		expect(repo).toHaveProperty("fullName");
		expect(repo.owner).toBe("test-owner");
		expect(repo.name).toBe("test-repo");
	});

	it("listOpenIssues() returns array of issues", async () => {
		const issues = await adapter.listOpenIssues("test-owner", "test-repo");

		expect(Array.isArray(issues)).toBe(true);
		expect(issues.length).toBeGreaterThanOrEqual(0);
		if (issues.length > 0) {
			const first = issues[0];
			expect(first).toHaveProperty("number");
			expect(first).toHaveProperty("title");
			expect(first).toHaveProperty("state");
			expect(first!.state).toBe("open");
		}
	});

	it("listOpenIssues() supports limit option", async () => {
		const adapter2 = new FakeGitHubAdapter();
		adapter2.addRepo(repoSummary);
		for (let i = 1; i <= 5; i++) {
			adapter2.addIssue(makeIssue({ number: i, title: `Issue ${i}` }));
		}

		const all = await adapter2.listOpenIssues("test-owner", "test-repo");
		const limited = await adapter2.listOpenIssues("test-owner", "test-repo", {
			limit: 2,
		});

		expect(all.length).toBe(5);
		expect(limited.length).toBe(2);
	});

	it("listOpenIssues() supports labels filter option", async () => {
		const adapter2 = new FakeGitHubAdapter();
		adapter2.addRepo(repoSummary);
		adapter2.addIssue(makeIssue({ number: 1, labels: ["bug"] }));
		adapter2.addIssue(makeIssue({ number: 2, labels: ["feature"] }));

		const withBug = await adapter2.listOpenIssues("test-owner", "test-repo", {
			labels: ["bug"],
		});
		const withFeature = await adapter2.listOpenIssues(
			"test-owner",
			"test-repo",
			{ labels: ["feature"] },
		);

		expect(withBug.length).toBe(1);
		expect(withBug[0]!.number).toBe(1);
		expect(withFeature.length).toBe(1);
		expect(withFeature[0]!.number).toBe(2);
	});

	it("getIssue() returns issue summary with stable shape", async () => {
		const issue = await adapter.getIssue(ref);

		expect(issue).toHaveProperty("number");
		expect(issue).toHaveProperty("title");
		expect(issue).toHaveProperty("state");
		expect(issue).toHaveProperty("labels");
		expect(issue.number).toBe(42);
	});

	it("listIssueComments() returns array", async () => {
		const comments = await adapter.listIssueComments(ref);
		expect(Array.isArray(comments)).toBe(true);
	});

	it("createIssueComment() returns comment result with stable shape", async () => {
		const result: GitHubCommentResult = await adapter.createIssueComment(
			ref,
			"Test comment",
		);

		expect(result).toHaveProperty("id");
		expect(result).toHaveProperty("htmlUrl");
		expect(result).toHaveProperty("createdAt");
		expect(result.htmlUrl).toContain("issuecomment");
	});

	it("addIssueLabels() resolves without error", async () => {
		await expect(
			adapter.addIssueLabels(ref, ["positron:running"]),
		).resolves.toBeUndefined();
	});

	it("removeIssueLabel() resolves without error", async () => {
		await adapter.addIssueLabels(ref, ["positron:running"]);
		await expect(
			adapter.removeIssueLabel(ref, "positron:running"),
		).resolves.toBeUndefined();
	});

	it("claimIssue() returns claim result with stable shape", async () => {
		const result: GitHubIssueClaimResult = await adapter.claimIssue(
			ref,
			claimOpts,
		);

		expect(result).toHaveProperty("status");
		expect(["claimed", "not_ready", "already_claimed"]).toContain(
			result.status,
		);
	});

	it("claimIssue() is idempotent — second claim returns already_claimed", async () => {
		const opts: ClaimOptions = {
			...claimOpts,
			runId: "run-456",
		};

		// First claim: may be 'claimed' or 'already_claimed' depending on prior state
		const first = await adapter.claimIssue(ref, opts);
		expect(["claimed", "already_claimed"]).toContain(first.status);

		// Second claim with same runId: must be already_claimed (idempotency contract)
		const second = await adapter.claimIssue(ref, opts);
		expect(second.status).toBe("already_claimed");
	});

	// --- Pull Request Methods ---

	it("createPullRequest() returns PR with stable shape", async () => {
		const pr: GitHubPullRequest = await adapter.createPullRequest({
			owner: "test-owner",
			repo: "test-repo",
			title: "Test PR",
			head: "positron/issue-42-test",
			base: "main",
		});

		expect(pr).toHaveProperty("number");
		expect(pr).toHaveProperty("title");
		expect(pr).toHaveProperty("state");
		expect(pr).toHaveProperty("head");
		expect(pr).toHaveProperty("base");
		expect(pr.state).toBe("open");
		expect(pr.title).toBe("Test PR");
	});

	it("createPullRequest() is idempotent for same head ref", async () => {
		const opts = {
			owner: "test-owner" as const,
			repo: "test-repo" as const,
			title: "Idempotent PR",
			head: "positron/issue-99-idempotent",
			base: "main",
		};

		const pr1 = await adapter.createPullRequest(opts);
		const pr2 = await adapter.createPullRequest(opts);

		expect(pr1.number).toBe(pr2.number);
		expect(pr1.title).toBe(pr2.title);
	});

	it("listPullRequests() returns array of PRs", async () => {
		await adapter.createPullRequest({
			owner: "test-owner",
			repo: "test-repo",
			title: "PR for listing",
			head: "positron/issue-100-list",
			base: "main",
		});

		const prs = await adapter.listPullRequests({
			owner: "test-owner",
			repo: "test-repo",
		});

		expect(Array.isArray(prs)).toBe(true);
		expect(prs.length).toBeGreaterThan(0);
	});

	it("listPullRequests() supports head filter", async () => {
		await adapter.createPullRequest({
			owner: "test-owner",
			repo: "test-repo",
			title: "PR A",
			head: "positron/issue-1-a",
			base: "main",
		});
		await adapter.createPullRequest({
			owner: "test-owner",
			repo: "test-repo",
			title: "PR B",
			head: "positron/issue-2-b",
			base: "main",
		});

		const filtered = await adapter.listPullRequests({
			owner: "test-owner",
			repo: "test-repo",
			head: "positron/issue-1-a",
		});

		expect(filtered.length).toBe(1);
		expect(filtered[0]!.title).toBe("PR A");
	});

	it("listPullRequestFiles() returns file list with stable shape", async () => {
		const files: GitHubPRFile[] = await adapter.listPullRequestFiles(
			"test-owner",
			"test-repo",
			1,
		);

		expect(Array.isArray(files)).toBe(true);
		expect(files.length).toBeGreaterThan(0);
		const first = files[0];
		expect(first).toHaveProperty("sha");
		expect(first).toHaveProperty("filename");
		expect(first).toHaveProperty("status");
		expect(first).toHaveProperty("additions");
		expect(first).toHaveProperty("deletions");
		expect(first).toHaveProperty("changes");
	});

	// --- Merge Methods ---

	it("getPullRequest() returns PR by number", async () => {
		const created = await adapter.createPullRequest({
			owner: "test-owner",
			repo: "test-repo",
			title: "PR to get",
			head: "positron/issue-200-get",
			base: "main",
		});

		const fetched = await adapter.getPullRequest(
			"test-owner",
			"test-repo",
			created.number,
		);
		expect(fetched.number).toBe(created.number);
		expect(fetched.title).toBe("PR to get");
	});

	it("mergePullRequest() returns merge result", async () => {
		const created = await adapter.createPullRequest({
			owner: "test-owner",
			repo: "test-repo",
			title: "PR to merge",
			head: "positron/issue-300-merge",
			base: "main",
		});

		const result: MergePRResult = await adapter.mergePullRequest({
			owner: "test-owner",
			repo: "test-repo",
			prNumber: created.number,
		});

		expect(result).toHaveProperty("merged");
		expect(result.merged).toBe(true);
	});

	it("mergePullRequest() returns merged:false for already merged PR", async () => {
		const created = await adapter.createPullRequest({
			owner: "test-owner",
			repo: "test-repo",
			title: "PR to double-merge",
			head: "positron/issue-301-double",
			base: "main",
		});

		await adapter.mergePullRequest({
			owner: "test-owner",
			repo: "test-repo",
			prNumber: created.number,
		});

		const secondResult = await adapter.mergePullRequest({
			owner: "test-owner",
			repo: "test-repo",
			prNumber: created.number,
		});

		expect(secondResult.merged).toBe(false);
	});

	// --- Reviewers ---

	it("requestReviewers() returns requested:true when reviewers provided", async () => {
		const result: RequestReviewersResult = await adapter.requestReviewers({
			owner: "test-owner",
			repo: "test-repo",
			prNumber: 1,
			reviewers: ["user1"],
		});

		expect(result.requested).toBe(true);
		expect(result.reviewers).toContain("user1");
	});

	it("requestReviewers() returns requested:false when no reviewers", async () => {
		const result = await adapter.requestReviewers({
			owner: "test-owner",
			repo: "test-repo",
			prNumber: 1,
		});

		expect(result.requested).toBe(false);
	});

	// --- Issue Lifecycle ---

	it("closeIssue() resolves without error for existing issue", async () => {
		const adapter2 = new FakeGitHubAdapter();
		adapter2.addRepo(repoSummary);
		adapter2.addIssue(makeIssue({ number: 99, state: "open" }));

		await expect(
			adapter2.closeIssue("test-owner", "test-repo", 99),
		).resolves.toBeUndefined();
	});

	it("closeIssue() throws for non-existent issue", async () => {
		await expect(
			adapter.closeIssue("test-owner", "test-repo", 99999),
		).rejects.toThrow();
	});
});
