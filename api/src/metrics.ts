import { Registry, Counter, Histogram, collectDefaultMetrics } from 'prom-client';

// Each service gets its own Registry so metrics don't bleed across services.
export const register = new Registry();

// Automatically collect Node.js runtime metrics: event loop lag, heap usage,
// active handles, GC duration, etc. Useful for spotting memory leaks.
collectDefaultMetrics({ register });

export const eventsReceivedTotal = new Counter({
    name: 'eventpulse_events_received_total',
    help: 'Total number of events accepted and queued to Kafka',
    labelNames: ['type'],
    registers: [register],
});

// Counts duplicate events rejected by the Redis idempotency check.
// A sudden spike here could mean a producer is retrying too aggressively.
export const duplicateEventsTotal = new Counter({
    name: 'eventpulse_duplicate_events_total',
    help: 'Total number of duplicate events rejected',
    registers: [register],
});

// Measures how long each POST /events request takes end-to-end (in seconds).
export const httpRequestDuration = new Histogram({
    name: 'eventpulse_http_request_duration_seconds',
    help: 'Duration of POST /events requests in seconds',
    labelNames: ['status'],
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1],
    registers: [register],
});
