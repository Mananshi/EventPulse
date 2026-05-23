import 'dotenv/config';
import http from 'http';
import { Kafka, EachMessagePayload, Producer } from 'kafkajs';
import pool from './db';
import { register, eventsProcessedTotal, dbInsertDuration } from './metrics';

const kafka = new Kafka({
    clientId: 'eventpulse-worker',
    brokers: [process.env.KAFKA_BROKERS || 'localhost:9092']
});

const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID || 'eventpulse-workers' });

// The worker also acts as a producer so it can forward failed events to the DLQ.
const dlqProducer: Producer = kafka.producer();

async function start() {
    await consumer.connect();
    await dlqProducer.connect();
    await consumer.subscribe({ topic: 'ingest-events', fromBeginning: true });

    await consumer.run({
        eachMessage: async ({ message }: EachMessagePayload) => {
            const event = JSON.parse(message.value?.toString() || '{}');
            console.log('Received event:', event);

            try {
                const endTimer = dbInsertDuration.startTimer();

                // ON CONFLICT (id) DO NOTHING = idempotent write.
                // If the consumer crashes mid-flight and replays a message,
                // the duplicate insert is silently ignored instead of throwing.
                await pool.query(
                    `INSERT INTO events(id, type, ts, data)
                     VALUES($1, $2, $3, $4)
                     ON CONFLICT (id) DO NOTHING`,
                    [event.id, event.type, event.timestamp, JSON.stringify(event.data)]
                );

                endTimer();
                eventsProcessedTotal.inc({ status: 'success' });
                console.log(`Persisted event ${event.id} to Postgres`);
            } catch (err) {
                // Something went wrong (DB down, schema mismatch, etc.).
                // We forward the raw message to the DLQ instead of letting it
                // block the consumer — Kafka would otherwise retry it forever.
                // The DLQ can be inspected and replayed manually once the issue is fixed.
                console.error(`Failed to persist event ${event.id}, sending to DLQ:`, err);
                await dlqProducer.send({
                    topic: 'ingest-dlq',
                    messages: [{ value: message.value }],
                });
                eventsProcessedTotal.inc({ status: 'dlq' });
            }
        },
    });

    console.log('Worker is running and consuming events...');
}

// The worker has no Express server, so we use Node's built-in http module
// to expose a minimal /metrics endpoint for Prometheus to scrape.
const metricsServer = http.createServer(async (req, res) => {
    if (req.url === '/metrics') {
        res.setHeader('Content-Type', register.contentType);
        res.end(await register.metrics());
    } else {
        res.writeHead(404);
        res.end();
    }
});

metricsServer.listen(3002, () => {
    console.log('Metrics server listening on port 3002');
});

start().catch(console.error);