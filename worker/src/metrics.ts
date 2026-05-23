import { Registry, Counter, Histogram, collectDefaultMetrics } from 'prom-client';

export const register = new Registry();

collectDefaultMetrics({ register });

// Tracks events processed by the worker, labelled by outcome.
// status="success" = written to Postgres
// status="dlq"     = failed and forwarded to dead-letter queue
export const eventsProcessedTotal = new Counter({
    name: 'eventpulse_worker_events_processed_total',
    help: 'Total number of events processed by the worker',
    labelNames: ['status'],
    registers: [register],
});

// Measures how long each Postgres INSERT takes.
// Spikes here indicate DB slowness — useful to correlate with query plans or load.
export const dbInsertDuration = new Histogram({
    name: 'eventpulse_worker_db_insert_duration_seconds',
    help: 'Duration of Postgres INSERT operations in seconds',
    buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1],
    registers: [register],
});
