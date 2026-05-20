// Positron GitHub Adapter — Barrel Export
export { createGitHubClient, createSafeLogger } from './client.js';
export type { GitHubClientOptions } from './client.js';
export { pollIssues, filterByLabel, isPullRequest } from './issues.js';
export type { PollState, PolledIssue } from './issues.js';
export { syncManagedLabels } from './labels.js';
export { writeComment, commentMarker } from './comments.js';
