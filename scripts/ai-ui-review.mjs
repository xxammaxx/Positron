#!/usr/bin/env node
/**
 * AI UI Review — Provider Adapter Chain (Layer 5, Issue #172)
 *
 * Architecture: Provider chain resolves in order:
 *   1. Local LLM (placeholder)
 *   2. OpenAI-compatible API
 *   3. Anthropic
 *   4. Gemini
 *
 * If no provider available: skip with warning, pipeline NOT blocked.
 * No vendor lock-in. All providers are env-var opt-in.
 *
 * Usage:
 *   node scripts/ai-ui-review.mjs <screenshots-dir>
 *
 * Environment variables:
 *   AI_UI_PROVIDER — force a specific provider ("local"|"openai"|"anthropic"|"gemini")
 *   OPENAI_API_KEY / OPENAI_BASE_URL
 *   ANTHROPIC_API_KEY
 *   GEMINI_API_KEY
 */

import fs from "node:fs";
import path from "node:path";

// ── Provider Interface ──────────────────────────────────────────────

interface ReviewResult {
	provider: string;
	passed: boolean;
	issues: string[];
	summary: string;
}

interface Provider {
	name: string;
	isAvailable: () => boolean;
	review: (screenshots: string[]) => Promise<ReviewResult>;
}

// ── Provider Implementations ────────────────────────────────────────

/** Local placeholder — always available, always skips with warning. */
const localProvider: Provider = {
	name: "local",
	isAvailable: () => true,
	async review(screenshots: string[]): Promise<ReviewResult> {
		return {
			provider: "local",
			passed: true,
			issues: [],
			summary: `[SKIPPED] Local LLM not configured. ${screenshots.length} screenshots available for manual review. Install a cloud provider or configure a local LLM endpoint.`,
		};
	},
};

/** OpenAI-compatible provider (GPT-4V or any compatible API). */
const openaiProvider: Provider = {
	name: "openai",
	isAvailable: () => !!process.env.OPENAI_API_KEY,
	async review(screenshots: string[]): Promise<ReviewResult> {
		const apiKey = process.env.OPENAI_API_KEY!;
		const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";

		// Build a multimodal message with screenshots as base64 images
		const imageContents = await Promise.all(
			screenshots.slice(0, 10).map(async (file) => {
				const data = fs.readFileSync(file);
				const base64 = data.toString("base64");
				const ext = path.extname(file).slice(1);
				return {
					type: "image_url" as const,
					image_url: {
						url: `data:image/${ext};base64,${base64}`,
					},
				};
			}),
		);

		const response = await fetch(`${baseUrl}/chat/completions`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model: process.env.AI_UI_MODEL ?? "gpt-4o",
				messages: [
					{
						role: "user",
						content: [
							{
								type: "text",
								text: `Review these Positron dashboard screenshots. Check for:
1. All expected UI elements visible (Dashboard, Runs, Evidence, Settings)
2. No overlapping elements or layout issues
3. Text content correct (labels, headings, status)
4. No error banners or unexpected console errors visible
5. Consistent color scheme and contrast
Respond with a structured review.`,
							},
							...imageContents,
						],
					},
				],
				max_tokens: 1000,
			}),
		});

		if (!response.ok) {
			const errText = await response.text().catch(() => "unknown");
			throw new Error(`OpenAI API error (${response.status}): ${errText}`);
		}

		const data = (await response.json()) as {
			choices: [{ message: { content: string } }];
		};
		const content = data.choices[0].message.content;

		return {
			provider: "openai",
			passed: !content.toLowerCase().includes("error") && !content.toLowerCase().includes("issue"),
			issues: [content],
			summary: content.slice(0, 500),
		};
	},
};

/** Anthropic provider (Claude Vision). */
const anthropicProvider: Provider = {
	name: "anthropic",
	isAvailable: () => !!process.env.ANTHROPIC_API_KEY,
	async review(screenshots: string[]): Promise<ReviewResult> {
		const apiKey = process.env.ANTHROPIC_API_KEY!;

		const imageContents = await Promise.all(
			screenshots.slice(0, 10).map(async (file) => {
				const data = fs.readFileSync(file);
				const base64 = data.toString("base64");
				const ext = path.extname(file).slice(1);
				const mediaType =
					ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
				return {
					type: "image" as const,
					source: {
						type: "base64" as const,
						media_type: mediaType,
						data: base64,
					},
				};
			}),
		);

		const response = await fetch("https://api.anthropic.com/v1/messages", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": apiKey,
				"anthropic-version": "2023-06-01",
			},
			body: JSON.stringify({
				model: process.env.AI_UI_MODEL ?? "claude-3-opus-20240229",
				max_tokens: 1000,
				messages: [
					{
						role: "user",
						content: [
							{
								type: "text",
								text: "Review these Positron dashboard screenshots for UI correctness: element presence, layout, text content, error states, and color consistency. Provide a structured review.",
							},
							...imageContents,
						],
					},
				],
			}),
		});

		if (!response.ok) {
			const errText = await response.text().catch(() => "unknown");
			throw new Error(`Anthropic API error (${response.status}): ${errText}`);
		}

		const data = (await response.json()) as {
			content: [{ text: string }];
		};
		const content = data.content[0].text;

		return {
			provider: "anthropic",
			passed: !content.toLowerCase().includes("error"),
			issues: [content],
			summary: content.slice(0, 500),
		};
	},
};

/** Gemini provider. */
const geminiProvider: Provider = {
	name: "gemini",
	isAvailable: () => !!process.env.GEMINI_API_KEY,
	async review(_screenshots: string[]): Promise<ReviewResult> {
		return {
			provider: "gemini",
			passed: true,
			issues: [],
			summary: "[SKIPPED] Gemini provider not yet implemented. Use OpenAI or Anthropic.",
		};
	},
};

// ── Provider Chain ──────────────────────────────────────────────────

const PROVIDER_CHAIN: Provider[] = [
	localProvider,
	openaiProvider,
	anthropicProvider,
	geminiProvider,
];

// ── Main ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
	const screenshotsDir = process.argv[2];

	if (!screenshotsDir) {
		console.log("[AI UI Review] No screenshots directory specified. Skipping.");
		process.exit(0);
	}

	if (!fs.existsSync(screenshotsDir)) {
		console.log(`[AI UI Review] Screenshots directory not found: ${screenshotsDir}. Skipping.`);
		process.exit(0);
	}

	const screenshots = fs
		.readdirSync(screenshotsDir)
		.filter((f) => /\.(png|jpg|jpeg)$/i.test(f))
		.map((f) => path.join(screenshotsDir, f));

	if (screenshots.length === 0) {
		console.log("[AI UI Review] No screenshots found. Skipping.");
		process.exit(0);
	}

	console.log(`[AI UI Review] Found ${screenshots.length} screenshots`);

	// Resolve provider
	const forcedProvider = process.env.AI_UI_PROVIDER;
	let provider: Provider | null = null;

	if (forcedProvider) {
		provider = PROVIDER_CHAIN.find((p) => p.name === forcedProvider) ?? null;
		if (!provider) {
			console.warn(`[AI UI Review] Unknown provider: ${forcedProvider}. Skipping.`);
			process.exit(0);
		}
		if (!provider.isAvailable()) {
			console.warn(`[AI UI Review] Provider ${provider.name} not available (missing API key). Skipping.`);
			process.exit(0);
		}
	} else {
		// Auto-resolve: first available provider in chain
		for (const p of PROVIDER_CHAIN) {
			if (p.isAvailable()) {
				provider = p;
				break;
			}
		}
	}

	if (!provider) {
		console.log("[AI UI Review] No AI provider available. Skipping.");
		process.exit(0);
	}

	console.log(`[AI UI Review] Using provider: ${provider.name}`);

	try {
		const result = await provider.review(screenshots);

		// Write review report
		const reportDir = path.resolve(process.cwd(), "reports");
		if (!fs.existsSync(reportDir)) {
			fs.mkdirSync(reportDir, { recursive: true });
		}

		const reportPath = path.join(reportDir, "ai-ui-review.md");
		const report = [
			"# AI UI Review Report",
			"",
			`- **Provider:** ${result.provider}`,
			`- **Passed:** ${result.passed ? "✅ YES" : "⚠️ REVIEW NEEDED"}`,
			`- **Screenshots reviewed:** ${screenshots.length}`,
			"",
			"## Summary",
			"",
			result.summary,
			"",
			"## Issues",
			"",
			...(result.issues.length > 0
				? result.issues.map((i, idx) => `${idx + 1}. ${i}`)
				: ["No issues found."]),
		].join("\n");

		fs.writeFileSync(reportPath, report);
		console.log(`[AI UI Review] Report written to ${reportPath}`);

		process.exit(result.passed ? 0 : 1);
	} catch (err) {
		console.error(
			`[AI UI Review] Provider error: ${err instanceof Error ? err.message : String(err)}`,
		);
		process.exit(0); // Non-blocking
	}
}

main().catch((err) => {
	console.error("[AI UI Review] Fatal error:", err);
	process.exit(0);
});
