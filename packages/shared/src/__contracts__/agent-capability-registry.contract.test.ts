/**
 * Agent Capability Registry Contract Tests (QA-xxx)
 *
 * Verifies the PUBLIC API contract of @positron/shared's agent capability
 * registry types, validators, and the in-memory registry class.
 *
 * Contract guarantees:
 * - isValidCapability() rejects invalid strings and accepts all canonical IDs
 * - validateAgentDeclaration() returns [] for valid declarations, error messages otherwise
 * - AgentCapabilityRegistry correctly registers, retrieves, unregisters, and finds agents
 * - CodingAgentAdapter interface contract is structurally verifiable at runtime
 * - Fake adapters are detectable via the isFake flag
 */

import { describe, it, expect } from "vitest";
import {
	ALL_CAPABILITIES,
	isValidCapability,
	validateAgentDeclaration,
	AgentCapabilityRegistry,
} from "@positron/shared";
import type {
	AgentDeclaration,
	AgentHealth,
	CodingPhaseInput,
	CodingAgentResult,
	CodingAgentAdapter,
} from "@positron/shared";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a minimal valid AgentDeclaration for testing. */
function createMinimalDeclaration(
	overrides: Partial<AgentDeclaration> = {},
): AgentDeclaration {
	return {
		name: "test-agent",
		type: "cli",
		version: "1.0.0",
		deployment: "local",
		runtime: "node",
		capabilities: ["repo_read"],
		requiredSecrets: [],
		requiredEnvVars: [],
		allowedPaths: [],
		deniedPaths: [],
		allowedActions: [],
		deniedActions: [],
		riskLevel: "low",
		trustTier: 1,
		evidenceRequirements: {
			logOutput: false,
			captureDiff: false,
			captureTests: false,
			requireScreenshot: false,
			requireTrace: false,
		},
		maxConcurrency: 1,
		timeoutMs: 30000,
		...overrides,
	};
}

/** Creates a mock CodingAgentAdapter for registry and contract tests. */
function createMockAdapter(
	overrides: Partial<AgentDeclaration> = {},
): CodingAgentAdapter {
	const decl = createMinimalDeclaration(overrides);
	return {
		declaration: decl,
		async healthCheck(_workspacePath: string): Promise<AgentHealth> {
			return { available: true, version: decl.version };
		},
		async runPhase(_input: CodingPhaseInput): Promise<CodingAgentResult> {
			return {
				status: "success",
				command: "echo hello",
				summary: "Mock phase completed",
				durationMs: 42,
				cwd: "/fake/workspace",
			};
		},
	};
}

// ---------------------------------------------------------------------------
// 1. AgentCapability Validation
// ---------------------------------------------------------------------------
describe("AgentCapability validation", () => {
	it("rejects invalid capability", () => {
		expect(isValidCapability("nonexistent_cap")).toBe(false);
		expect(isValidCapability("fly_to_moon")).toBe(false);
		expect(isValidCapability(" ")).toBe(false);
	});

	it("accepts all canonical capabilities", () => {
		for (const cap of ALL_CAPABILITIES) {
			expect(isValidCapability(cap)).toBe(true);
		}
	});

	it("invalid capability returns false from isValidCapability", () => {
		expect(isValidCapability("code_write_evil")).toBe(false);
		expect(isValidCapability("repo_delete")).toBe(false);
		expect(isValidCapability("unknown_cap_666")).toBe(false);
	});

	it("empty string is not a valid capability", () => {
		expect(isValidCapability("")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// 2. AgentDeclaration Validation
// ---------------------------------------------------------------------------
describe("validateAgentDeclaration", () => {
	it("accepts a valid minimal declaration", () => {
		const decl = createMinimalDeclaration();
		const errors = validateAgentDeclaration(decl);
		expect(errors).toEqual([]);
	});

	it("rejects declaration with empty name", () => {
		const decl = createMinimalDeclaration({ name: "" });
		const errors = validateAgentDeclaration(decl);
		expect(errors).toContain("name must be a non-empty string");
	});

	it("rejects declaration with empty capabilities array", () => {
		const decl = createMinimalDeclaration({ capabilities: [] });
		const errors = validateAgentDeclaration(decl);
		expect(errors).toContain("capabilities must be a non-empty array");
	});

	it("rejects declaration with invalid capability", () => {
		const decl = createMinimalDeclaration({
			capabilities: ["repo_read", "fly_to_moon"],
		});
		const errors = validateAgentDeclaration(decl);
		expect(errors).toContain('unknown capability: "fly_to_moon"');
	});

	it("rejects declaration with invalid riskLevel", () => {
		const decl = createMinimalDeclaration({
			riskLevel: "unknown" as AgentDeclaration["riskLevel"],
		});
		const errors = validateAgentDeclaration(decl);
		expect(errors).toContain(
			"riskLevel must be one of: low, medium, high, critical",
		);
	});

	it("rejects declaration with invalid trustTier", () => {
		const decl = createMinimalDeclaration({
			trustTier: 5 as AgentDeclaration["trustTier"],
		});
		const errors = validateAgentDeclaration(decl);
		expect(errors).toContain("trustTier must be 0, 1, or 2");
	});

	it("rejects declaration with maxConcurrency <= 0", () => {
		const decl = createMinimalDeclaration({ maxConcurrency: 0 });
		const errors = validateAgentDeclaration(decl);
		expect(errors).toContain("maxConcurrency must be > 0");
	});

	it("rejects declaration with timeoutMs <= 0", () => {
		const decl = createMinimalDeclaration({ timeoutMs: 0 });
		const errors = validateAgentDeclaration(decl);
		expect(errors).toContain("timeoutMs must be > 0");
	});

	it("rejects declaration with invalid type", () => {
		const decl = createMinimalDeclaration({
			type: "invalid-type" as AgentDeclaration["type"],
		});
		const errors = validateAgentDeclaration(decl);
		expect(errors).toContain(
			"type must be one of: cli, api, ide, service, human",
		);
	});

	it("accepts declaration with all optional fields", () => {
		const decl: AgentDeclaration = {
			name: "full-agent",
			type: "service",
			version: "2.0.0",
			deployment: "cloud",
			runtime: "container",
			capabilities: ["repo_read", "code_write", "test_run"],
			requiredSecrets: ["GITHUB_TOKEN"],
			requiredEnvVars: ["POSITRON_WORKSPACE_ROOT"],
			allowedPaths: ["/workspace/**"],
			deniedPaths: ["/workspace/.secrets/**"],
			allowedActions: ["git.commit", "git.push"],
			deniedActions: ["git.push:main"],
			riskLevel: "high",
			trustTier: 0,
			evidenceRequirements: {
				logOutput: true,
				captureDiff: true,
				captureTests: true,
				requireScreenshot: false,
				requireTrace: false,
			},
			fallbackAgent: "fallback-agent",
			maxConcurrency: 5,
			timeoutMs: 120000,
			retryPolicy: { maxRetries: 3, backoffMs: 1000 },
			isFake: false,
			isMock: false,
			isDemo: true,
		};
		const errors = validateAgentDeclaration(decl);
		expect(errors).toEqual([]);
	});

	it("fake adapter must not be in production profile", () => {
		const decl = createMinimalDeclaration({ isFake: true });
		const errors = validateAgentDeclaration(decl);
		// validateAgentDeclaration accepts isFake (it's a valid optional boolean flag)
		expect(errors).toEqual([]);
		// The isFake flag must be detectable for production-code filtering
		expect(decl.isFake).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 3. AgentCapabilityRegistry
// ---------------------------------------------------------------------------
describe("AgentCapabilityRegistry", () => {
	it("register and retrieve agent by name", () => {
		const registry = new AgentCapabilityRegistry();
		const adapter = createMockAdapter({ name: "alpha" });
		registry.register(adapter);

		const retrieved = registry.getAgent("alpha");
		expect(retrieved).toBeDefined();
		expect(retrieved!.declaration.name).toBe("alpha");
	});

	it("unregister removes agent", () => {
		const registry = new AgentCapabilityRegistry();
		const adapter = createMockAdapter({ name: "beta" });
		registry.register(adapter);
		registry.unregister("beta");

		expect(registry.getAgent("beta")).toBeUndefined();
	});

	it("listAgents returns all registered agents", () => {
		const registry = new AgentCapabilityRegistry();
		registry.register(createMockAdapter({ name: "agent-1" }));
		registry.register(createMockAdapter({ name: "agent-2" }));
		registry.register(createMockAdapter({ name: "agent-3" }));

		const agents = registry.listAgents();
		expect(agents).toHaveLength(3);
		const names = agents.map((a) => a.name);
		expect(names).toContain("agent-1");
		expect(names).toContain("agent-2");
		expect(names).toContain("agent-3");
	});

	describe("findAgentsForCapabilities", () => {
		it("returns matching agents", () => {
			const registry = new AgentCapabilityRegistry();
			registry.register(
				createMockAdapter({
					name: "writer",
					capabilities: ["repo_read", "code_write"],
				}),
			);
			registry.register(
				createMockAdapter({
					name: "reader",
					capabilities: ["repo_read"],
				}),
			);
			registry.register(
				createMockAdapter({
					name: "tester",
					capabilities: ["test_run"],
				}),
			);

			const result = registry.findAgentsForCapabilities([
				"repo_read",
				"code_write",
			]);
			expect(result).toHaveLength(1);
			expect(result[0]!.declaration.name).toBe("writer");
		});

		it("returns empty when no match", () => {
			const registry = new AgentCapabilityRegistry();
			registry.register(
				createMockAdapter({
					name: "reader",
					capabilities: ["repo_read"],
				}),
			);

			const result = registry.findAgentsForCapabilities([
				"code_write",
				"test_run",
			]);
			expect(result).toEqual([]);
		});
	});

	it("register throws or ignores when registering same name twice", () => {
		const registry = new AgentCapabilityRegistry();
		registry.register(createMockAdapter({ name: "duplicate" }));

		// Second registration with same name silently replaces per implementation
		expect(() => {
			registry.register(createMockAdapter({ name: "duplicate" }));
		}).not.toThrow();

		// The registry should still have exactly one entry after replacement
		const agents = registry.listAgents();
		expect(agents).toHaveLength(1);
	});

	it("getAgent returns undefined for unknown name", () => {
		const registry = new AgentCapabilityRegistry();
		expect(registry.getAgent("ghost")).toBeUndefined();
	});

	describe("findAgentsForPhase", () => {
		it("returns agents with required capabilities for IMPLEMENT", () => {
			const registry = new AgentCapabilityRegistry();
			registry.register(
				createMockAdapter({
					name: "writer",
					capabilities: ["repo_read", "code_write"],
				}),
			);
			registry.register(
				createMockAdapter({
					name: "reader-only",
					capabilities: ["repo_read"],
				}),
			);
			registry.register(
				createMockAdapter({
					name: "tester",
					capabilities: ["test_run"],
				}),
			);

			// IMPLEMENT phase requires 'code_write' per getPhaseCapability mapping
			const result = registry.findAgentsForPhase("IMPLEMENT");
			expect(result).toHaveLength(1);
			expect(result[0]!.declaration.name).toBe("writer");
		});
	});
});

// ---------------------------------------------------------------------------
// 4. CodingAgentAdapter Contract
// ---------------------------------------------------------------------------
describe("CodingAgentAdapter contract", () => {
	it("every registered adapter must have a declaration", () => {
		const adapter = createMockAdapter({ name: "contract-test" });
		expect(adapter.declaration).toBeDefined();
		expect(adapter.declaration.name).toBe("contract-test");
		expect(typeof adapter.declaration).toBe("object");
	});

	it("adapter must implement healthCheck", () => {
		const adapter = createMockAdapter();
		expect(adapter.healthCheck).toBeDefined();
		expect(typeof adapter.healthCheck).toBe("function");
	});

	it("adapter must implement runPhase", () => {
		const adapter = createMockAdapter();
		expect(adapter.runPhase).toBeDefined();
		expect(typeof adapter.runPhase).toBe("function");
	});

	it("healthCheck must return AgentHealth structure", async () => {
		const adapter = createMockAdapter();
		const health = await adapter.healthCheck("/some/workspace");

		expect(health).toBeDefined();
		expect(typeof health).toBe("object");
		expect(typeof health.available).toBe("boolean");
		// version is set by the mock adapter; other optional fields (commandPath,
		// reason) are not required when the adapter doesn't provide them
		if (health.version !== undefined) {
			expect(typeof health.version).toBe("string");
		}
	});

	it("runPhase result must contain expected fields", async () => {
		const adapter = createMockAdapter();
		const input: CodingPhaseInput = {
			runId: "test-run-001",
			workspacePath: "/fake/workspace",
			issueTitle: "Test issue",
		};
		const result = await adapter.runPhase(input);

		expect(result).toBeDefined();
		expect(typeof result).toBe("object");
		expect(["success", "failed", "blocked", "skipped"]).toContain(
			result.status,
		);
		expect(typeof result.command).toBe("string");
		expect(typeof result.summary).toBe("string");
		expect(typeof result.durationMs).toBe("number");
		expect(typeof result.cwd).toBe("string");
		// Optional fields (blockedReason, evidencePaths) are not required
		// when the adapter doesn't provide them
	});
});

// ---------------------------------------------------------------------------
// 5. Fake Adapter Detection
// ---------------------------------------------------------------------------
describe("Fake adapter detection", () => {
	/** Returns true if the adapter is marked as fake/dry-run. */
	function isFake(adapter: CodingAgentAdapter): boolean {
		return adapter.declaration.isFake === true;
	}

	it("fake adapter sets isFake: true", () => {
		const fake = createMockAdapter({ isFake: true });
		expect(fake.declaration.isFake).toBe(true);
		expect(isFake(fake)).toBe(true);
	});

	it("non-fake adapter does not have isFake set to true", () => {
		const real = createMockAdapter({ isFake: false });
		expect(isFake(real)).toBe(false);
	});

	it("production code must not use fake adapters", () => {
		const fake = createMockAdapter({ isFake: true });
		const real = createMockAdapter({ isFake: false });

		// Production code should be able to filter out fake adapters
		const adapters: CodingAgentAdapter[] = [fake, real];
		const productionSafe = adapters.filter((a) => !isFake(a));

		expect(productionSafe).toHaveLength(1);
		expect(productionSafe[0]!.declaration.isFake).toBe(false);
	});
});
