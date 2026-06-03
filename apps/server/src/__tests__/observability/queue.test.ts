/**
 * Queue & Worker Observability Tests (QA-012).
 */

import { describe, it, expect } from "vitest";
import {
	queueJobsTotal,
	queueJobsActive,
	queueJobsWaiting,
	queueJobsCompletedTotal,
	queueJobsFailedTotal,
	queueJobDurationSeconds,
	queueJobRetriesTotal,
	queueWorkerUp,
	queueRedisUp,
} from "../../observability/queue-metrics.js";

describe("Queue Metrics (QA-012)", () => {
	it("all queue metrics are defined", () => {
		expect(queueJobsTotal).toBeDefined();
		expect(queueJobsActive).toBeDefined();
		expect(queueJobsWaiting).toBeDefined();
		expect(queueJobsCompletedTotal).toBeDefined();
		expect(queueJobsFailedTotal).toBeDefined();
		expect(queueJobDurationSeconds).toBeDefined();
		expect(queueJobRetriesTotal).toBeDefined();
		expect(queueWorkerUp).toBeDefined();
		expect(queueRedisUp).toBeDefined();
	});

	it("metrics accept safe operations", () => {
		queueJobsTotal.inc({ queue: "pipeline", outcome: "completed" });
		queueJobsActive.set({ queue: "pipeline" }, 3);
		queueJobsWaiting.set({ queue: "pipeline" }, 2);
		queueJobsCompletedTotal.inc({ queue: "pipeline" });
		queueJobsFailedTotal.inc({ queue: "pipeline", error_kind: "timeout" });
		queueJobDurationSeconds.observe({ queue: "pipeline" }, 45);
		queueJobRetriesTotal.inc({ queue: "pipeline" });
		queueWorkerUp.set({ queue: "pipeline" }, 1);
		queueRedisUp.set(1);
		expect(true).toBe(true);
	});

	it("help texts contain no secrets", () => {
		const helps = [(queueJobsTotal as any).help, (queueRedisUp as any).help];
		for (const h of helps) {
			expect(h).not.toMatch(/ghp_/);
			expect(h).not.toMatch(/token/);
		}
	});
});
