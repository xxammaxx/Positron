/**
 * Queue & Worker Prometheus Metrics (QA-012).
 * Separate file to keep metrics module manageable and avoid transform issues.
 */

import promClient from 'prom-client';

const registry = new promClient.Registry();

export const queueJobsTotal = new promClient.Counter({
	name: 'positron_queue_jobs_total',
	help: 'Total number of queue jobs processed',
	labelNames: ['queue', 'outcome'] as const,
	registers: [registry],
});

export const queueJobsActive = new promClient.Gauge({
	name: 'positron_queue_jobs_active',
	help: 'Number of currently active queue jobs',
	labelNames: ['queue'] as const,
	registers: [registry],
});

export const queueJobsWaiting = new promClient.Gauge({
	name: 'positron_queue_jobs_waiting',
	help: 'Number of jobs waiting in the queue',
	labelNames: ['queue'] as const,
	registers: [registry],
});

export const queueJobsCompletedTotal = new promClient.Counter({
	name: 'positron_queue_jobs_completed_total',
	help: 'Total number of successfully completed queue jobs',
	labelNames: ['queue'] as const,
	registers: [registry],
});

export const queueJobsFailedTotal = new promClient.Counter({
	name: 'positron_queue_jobs_failed_total',
	help: 'Total number of failed queue jobs',
	labelNames: ['queue', 'error_kind'] as const,
	registers: [registry],
});

export const queueJobDurationSeconds = new promClient.Histogram({
	name: 'positron_queue_job_duration_seconds',
	help: 'Queue job duration in seconds',
	labelNames: ['queue'] as const,
	buckets: [10, 30, 60, 120, 300, 600, 1800, 3600],
	registers: [registry],
});

export const queueJobRetriesTotal = new promClient.Counter({
	name: 'positron_queue_job_retries_total',
	help: 'Total number of job retry attempts',
	labelNames: ['queue'] as const,
	registers: [registry],
});

export const queueWorkerUp = new promClient.Gauge({
	name: 'positron_queue_worker_up',
	help: 'Worker status: 1 if connected, 0 otherwise',
	labelNames: ['queue'] as const,
	registers: [registry],
});

export const queueRedisUp = new promClient.Gauge({
	name: 'positron_queue_redis_up',
	help: 'Redis connectivity: 1 up, 0 down',
	labelNames: [] as const,
	registers: [registry],
});

/**
 * Render metrics from this registry as Prometheus text.
 */
export async function renderQueueMetrics(): Promise<{
	contentType: string;
	body: string;
}> {
	const body = await registry.metrics();
	return { contentType: promClient.register.contentType, body };
}

// Initialize with 0 values so they appear in metric output
queueJobsWaiting.set({ queue: 'positron-pipeline' }, 0);
queueJobsActive.set({ queue: 'positron-pipeline' }, 0);
queueJobsCompletedTotal.inc({ queue: 'positron-pipeline' }, 0);
queueJobsFailedTotal.inc({ queue: 'positron-pipeline' }, 0);
queueJobRetriesTotal.inc({ queue: 'positron-pipeline' }, 0);
queueWorkerUp.set({ queue: 'positron-pipeline' }, 0);
queueRedisUp.set(0);
