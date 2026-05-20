// Positron — Workspace-Pfade und Branch-Namen

import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { generateBranchName } from '@positron/shared';

const WORKSPACE_ROOT = process.env.POSITRON_WORKSPACE_ROOT
  ? path.resolve(process.env.POSITRON_WORKSPACE_ROOT)
  : path.join(os.homedir(), '.positron', 'workspaces');

/** Validiert dass ein Pfad innerhalb des Workspace-Root liegt (kein Path-Traversal) */
export function validatePath(wsPath: string): void {
  const resolved = path.resolve(wsPath);
  const root = path.resolve(WORKSPACE_ROOT);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new GitWorkspacePathError(`Path outside workspace root: ${wsPath}`);
  }
  // Blockiere "../" und ".."
  if (wsPath.includes('..')) {
    throw new GitWorkspacePathError(`Path traversal detected: ${wsPath}`);
  }
}

/** Generiert Workspace-Pfad: .positron/workspaces/<owner>/<repo>/runs/issue-<n>-<runId> */
export function createWorkspacePath(owner: string, repo: string, issueNumber: number, runId: string): string {
  const safeOwner = sanitizeSegment(owner);
  const safeRepo = sanitizeSegment(repo);
  const safeRunId = sanitizeSegment(runId);
  return path.join(WORKSPACE_ROOT, safeOwner, safeRepo, 'runs', `issue-${issueNumber}-${safeRunId.slice(0, 8)}`);
}

/** Erzeugt Positron-Branch-Namen */
export function createPositronBranchName(issueNumber: number, issueTitle: string): string {
  return generateBranchName(issueNumber, issueTitle);
}

/** Sanitisiert ein einzelnes Pfadsegment */
function sanitizeSegment(segment: string): string {
  return segment
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.\./g, '_')
    .slice(0, 50);
}

/** Validiert GitHub Remote URL */
export function validateRemoteUrl(url: string): string {
  const trimmed = url.trim();
  // HTTPS
  const httpsMatch = trimmed.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (httpsMatch) {
    return `https://github.com/${httpsMatch[1]}/${httpsMatch[2]}.git`;
  }
  // SSH
  const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (sshMatch) {
    return `git@github.com:${sshMatch[1]}/${sshMatch[2]}.git`;
  }
  throw new GitRemoteInvalidError(`Invalid GitHub remote: ${trimmed}`);
}

// Re-export für convenience
import { GitWorkspacePathError } from './command-runner.js';
export class GitRemoteInvalidError extends Error {
  constructor(msg: string) { super(msg); this.name = 'GitRemoteInvalidError'; }
}
