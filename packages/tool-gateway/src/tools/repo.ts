// Built-in Tools: Repository Operations
// Issue #219
// repo.read_file, repo.list_files, repo.get_diff

import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { ToolDefinition, ToolHandler, ToolResult } from '../types.js';

// ─── Tool Definitions ────────────────────────────────────────────────

export const repoReadFileDef: ToolDefinition = {
	id: 'repo.read_file',
	title: 'Read File',
	description: 'Read the contents of a file within the workspace.',
	inputSchema: {
		type: 'object',
		properties: {
			path: { type: 'string', maxLength: 1024 },
		},
		required: ['path'],
	},
	outputSchema: {
		type: 'object',
		properties: {
			content: { type: 'string' },
			path: { type: 'string' },
		},
	},
	riskLevel: 'read',
	requiredAutonomyLevel: 0,
	approvalMode: 'none',
	allowedPhases: [],
	allowedWorkspaceRoots: [],
	egressPolicy: { allowedHosts: [], allowedPorts: [] },
	evidenceRequirements: {
		logArguments: true,
		logOutput: false,
		requireArtifact: false,
	},
};

export const repoListFilesDef: ToolDefinition = {
	id: 'repo.list_files',
	title: 'List Files',
	description: 'List files in a directory within the workspace.',
	inputSchema: {
		type: 'object',
		properties: {
			directory: { type: 'string', maxLength: 1024 },
		},
		required: [],
	},
	outputSchema: {
		type: 'object',
		properties: {
			files: { type: 'array' },
			directory: { type: 'string' },
		},
	},
	riskLevel: 'read',
	requiredAutonomyLevel: 0,
	approvalMode: 'none',
	allowedPhases: [],
	allowedWorkspaceRoots: [],
	egressPolicy: { allowedHosts: [], allowedPorts: [] },
	evidenceRequirements: {
		logArguments: true,
		logOutput: false,
		requireArtifact: false,
	},
};

export const repoGetDiffDef: ToolDefinition = {
	id: 'repo.get_diff',
	title: 'Get Git Diff',
	description: 'Get the current git diff in the workspace.',
	inputSchema: {
		type: 'object',
		properties: {},
		required: [],
	},
	outputSchema: {
		type: 'object',
		properties: {
			diff: { type: 'string' },
			staged: { type: 'boolean' },
		},
	},
	riskLevel: 'read',
	requiredAutonomyLevel: 0,
	approvalMode: 'none',
	allowedPhases: [],
	allowedWorkspaceRoots: [],
	egressPolicy: { allowedHosts: [], allowedPorts: [] },
	evidenceRequirements: {
		logArguments: false,
		logOutput: false,
		requireArtifact: false,
	},
};

// ─── Tool Handlers ───────────────────────────────────────────────────

export const repoReadFileHandler: ToolHandler = async (call): Promise<ToolResult> => {
	try {
		const filePathArg = call.arguments.path as string;
		const resolvedPath = path.resolve(call.workspaceRoot, filePathArg);

		const content = await fs.readFile(resolvedPath, 'utf-8');

		return {
			success: true,
			output: {
				content,
				path: filePathArg,
			},
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			success: false,
			output: null,
			error: `Failed to read file: ${message}`,
		};
	}
};

export const repoListFilesHandler: ToolHandler = async (call): Promise<ToolResult> => {
	try {
		const dirArg = (call.arguments.directory as string) || '.';
		const resolvedPath = path.resolve(call.workspaceRoot, dirArg);

		const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
		const files = entries.map((entry) => ({
			name: entry.name,
			type: entry.isDirectory() ? 'directory' : 'file',
		}));

		return {
			success: true,
			output: {
				files,
				directory: dirArg,
			},
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			success: false,
			output: null,
			error: `Failed to list files: ${message}`,
		};
	}
};

export const repoGetDiffHandler: ToolHandler = async (call): Promise<ToolResult> => {
	try {
		let diff: string;
		let staged = false;

		try {
			// Try staged diff first
			diff = execSync('git diff --staged', {
				cwd: call.workspaceRoot,
				encoding: 'utf-8',
				timeout: 30000,
			});
			staged = true;

			if (!diff.trim()) {
				// Fall back to unstaged diff
				diff = execSync('git diff', {
					cwd: call.workspaceRoot,
					encoding: 'utf-8',
					timeout: 30000,
				});
				staged = false;
			}
		} catch {
			// If git commands fail, return empty diff
			diff = execSync('git diff', {
				cwd: call.workspaceRoot,
				encoding: 'utf-8',
				timeout: 30000,
			});
			staged = false;
		}

		return {
			success: true,
			output: {
				diff,
				staged,
			},
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			success: false,
			output: null,
			error: `Failed to get diff: ${message}`,
		};
	}
};
