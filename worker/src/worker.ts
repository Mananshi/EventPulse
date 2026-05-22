import 'dotenv/config';
import { Kafka, EachMessagePayload } from 'kafkajs';
import pool from './db';

const kafka = new Kafka({
    clientId: 'eventpulse-worker',
    brokers: [process.env.KAFKA_BROKERS || 'localhost:9092']
});

const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID || 'eventpulse-workers' });

async function start() {
    await consumer.connect();
    await consumer.subscribe({ topic: 'ingest-events', fromBeginning: true });

    await consumer.run({
        eachMessage: async ({ message }: EachMessagePayload) => {
            const event = JSON.parse(message.value?.toString() || '{}');
            console.log('Received event:', event);

            // ON CONFLICT (id) DO NOTHING = idempotent write.
            // If the consumer crashes mid-flight and replays a message,
            // the duplicate insert is silently ignored instead of throwing.
            await pool.query(
                `INSERT INTO events(id, type, ts, data)
                 VALUES($1, $2, $3, $4)
                 ON CONFLICT (id) DO NOTHING`,
                [event.id, event.type, event.timestamp, JSON.stringify(event.data)]
            );

            console.log(`Persisted event ${event.id} to Postgres`);
        },
    });

    console.log('Worker is running and consuming events...');
}

start().catch(console.error);