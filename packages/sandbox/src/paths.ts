// Positron — Sandbox Pfad-Hilfsfunktionen

import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

/** Standard-Workspace-Root */
const DEFAULT_WORKSPACE_ROOT = path.join(os.homedir(), '.positron', 'workspaces');

/**
 * Erzeugt den Workspace-Pfad für eine Run-ID.
 */
export function createWorkspacePath(runId: string, workspaceRoot?: string): string {
	const root = workspaceRoot ?? process.env['POSITRON_WORKSPACE_ROOT'] ?? DEFAULT_WORKSPACE_ROOT;
	return path.join(root, runId.slice(0, 8));
}

/**
 * Erzeugt einen Positron-Branch-Namen.
 * Format: positron/issue-<number>-<slug>
 */
export function createPositronBranchName(issueNumber: number, title: string): string {
	const slug = title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 50);
	return `positron/issue-${issueNumber}-${slug}`;
}

/**
 * Validiert einen Workspace-Pfad.
 * Wirft Error wenn der Pfad unsicher ist.
 */
export function validatePath(workspacePath: string): void {
	if (!workspacePath || typeof workspacePath !== 'string') {
		throw new GitWorkspacePathError('Workspace path must be a non-empty string');
	}
	if (workspacePath.includes('..')) {
		throw new GitWorkspacePathError('Workspace path must not contain ".."');
	}
	if (!path.isAbsolute(workspacePath)) {
		throw new GitWorkspacePathError('Workspace path must be absolute');
	}
}

/**
 * Validiert eine Remote-URL.
 * Wirft Error wenn die URL ungültig ist.
 */
export function validateRemoteUrl(url: string): void {
	if (!url || typeof url !== 'string') {
		throw new GitRemoteInvalidError('Remote URL must be a non-empty string');
	}
	try {
		new URL(url);
	} catch {
		throw new GitRemoteInvalidError(`Invalid remote URL: "${url}"`);
	}
}

/**
 * Fehler: Ungültiger Workspace-Pfad.
 */
export class GitWorkspacePathError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'GitWorkspacePathError';
	}
}

/**
 * Fehler: Ungültige Remote-URL.
 */
export class GitRemoteInvalidError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'GitRemoteInvalidError';
	}
}
