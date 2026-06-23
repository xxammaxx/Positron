// Tool Registry — Central allowlist of registered tools
// Issue #219

import type { Phase } from '@positron/shared';
import { scanToolDefinition } from './scanner.js';
import type { ToolDefinition, ToolHandler } from './types.js';

/**
 * Error thrown when a tool is already registered.
 */
export class ToolAlreadyRegisteredError extends Error {
	constructor(toolId: string) {
		super(`Tool "${toolId}" is already registered`);
		this.name = 'ToolAlreadyRegisteredError';
	}
}

/**
 * Error thrown when attempting to register after seal.
 */
export class RegistrySealedError extends Error {
	constructor() {
		super('Registry is sealed — no further registrations allowed');
		this.name = 'RegistrySealedError';
	}
}

/**
 * Error thrown when a tool is not found.
 */
export class ToolNotFoundError extends Error {
	constructor(toolId: string) {
		super(`Tool "${toolId}" not found in registry`);
		this.name = 'ToolNotFoundError';
	}
}

/**
 * Internal registry entry storing definition + handler.
 */
interface RegistryEntry {
	definition: ToolDefinition;
	handler: ToolHandler;
}

/**
 * Central tool registry. All tool calls must reference a registered tool.
 * Registration validates tool definitions and scans for prompt injection.
 */
export class ToolRegistry {
	private tools: Map<string, RegistryEntry> = new Map();
	private _sealed = false;

	/**
	 * Register a tool definition and its handler.
	 * Fails if: already registered, scan fails, or registry is sealed.
	 */
	register(definition: ToolDefinition, handler: ToolHandler): void {
		if (this._sealed) {
			throw new RegistrySealedError();
		}

		// Validate tool ID
		this.validateToolId(definition.id);

		// Check for duplicates
		if (this.tools.has(definition.id)) {
			throw new ToolAlreadyRegisteredError(definition.id);
		}

		// Scan for prompt injection / poisoning
		const scanResult = scanToolDefinition(definition);
		if (scanResult.blocked) {
			throw new Error(
				`Tool "${definition.id}" blocked by scanner: ${scanResult.reasons.join('; ')}`,
			);
		}

		// Validate risk level
		this.validateRiskLevel(definition.riskLevel);

		// Validate schema presence
		if (!definition.inputSchema || typeof definition.inputSchema !== 'object') {
			throw new Error(`Tool "${definition.id}" must have a valid inputSchema`);
		}

		this.tools.set(definition.id, { definition, handler });
	}

	/**
	 * Retrieve a tool's definition and handler.
	 * Returns null if not found.
	 */
	get(toolId: string): RegistryEntry | null {
		return this.tools.get(toolId) ?? null;
	}

	/**
	 * Check if a tool is registered.
	 */
	has(toolId: string): boolean {
		return this.tools.has(toolId);
	}

	/**
	 * List all registered tool definitions (without handlers).
	 */
	list(): ToolDefinition[] {
		return Array.from(this.tools.values()).map((entry) => entry.definition);
	}

	/**
	 * List tool definitions allowed for a specific phase.
	 */
	listForPhase(phase: Phase): ToolDefinition[] {
		return this.list().filter((def) => def.allowedPhases.includes(phase));
	}

	/**
	 * Seal the registry. After sealing, no new tools can be registered
	 * and all existing definitions are frozen to prevent mutation.
	 * Recommended after all startup registrations are complete.
	 */
	seal(): void {
		this._sealed = true;

		// Freeze all stored tool definitions to prevent post-seal mutation.
		// A frozen definition cannot have riskLevel, approvalMode, allowedPhases,
		// or any other security-critical property changed after sealing.
		for (const [_id, entry] of this.tools) {
			Object.freeze(entry.definition);
			Object.freeze(entry.definition.inputSchema);
			Object.freeze(entry.definition.outputSchema);
			Object.freeze(entry.definition.egressPolicy);
			// Also freeze the nested arrays inside egressPolicy
			Object.freeze(entry.definition.egressPolicy.allowedHosts);
			Object.freeze(entry.definition.egressPolicy.allowedPorts);
			Object.freeze(entry.definition.evidenceRequirements);
			// allowedPhases and allowedWorkspaceRoots are arrays — freeze them too
			Object.freeze(entry.definition.allowedPhases);
			Object.freeze(entry.definition.allowedWorkspaceRoots);
		}
	}

	/**
	 * Whether the registry is sealed.
	 */
	get sealed(): boolean {
		return this._sealed;
	}

	/**
	 * Number of registered tools.
	 */
	get size(): number {
		return this.tools.size;
	}

	/**
	 * Validate tool ID follows naming conventions:
	 * - ASCII only
	 * - Lowercase alphanumeric + dot + underscore + hyphen
	 * - At least 3 characters
	 * - Must contain at least one dot (namespace.tool convention)
	 */
	private validateToolId(id: string): void {
		if (typeof id !== 'string' || id.length < 3) {
			throw new Error(`Tool ID must be a string with at least 3 characters, got: "${id}"`);
		}

		// ASCII-only check (no non-ASCII characters).
		// The \x00 control character in the range is intentional — it defines
		// the full ASCII range 0x00–0x7F for tool ID validation.
		// biome-ignore lint/suspicious/noControlCharactersInRegex: security-required ASCII range check for tool ID validation
		if (!/^[\x00-\x7F]+$/.test(id)) {
			throw new Error(`Tool ID must be ASCII-only, got: "${id}"`);
		}

		// Format: namespace.tool_name
		if (!/^[a-z][a-z0-9]*\.[a-z][a-z0-9_.-]*$/.test(id)) {
			throw new Error(
				`Tool ID must match pattern "namespace.tool_name" (lowercase, ASCII), got: "${id}"`,
			);
		}
	}

	/**
	 * Validate risk level is a known value.
	 */
	private validateRiskLevel(level: string): void {
		const validLevels = ['read', 'write', 'network', 'secret_sensitive', 'destructive'];
		if (!validLevels.includes(level)) {
			throw new Error(`Invalid risk level: "${level}". Must be one of: ${validLevels.join(', ')}`);
		}
	}
}
