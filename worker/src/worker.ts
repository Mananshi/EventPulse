import { Kafka, EachMessagePayload } from 'kafkajs';

const kafka = new Kafka({
    clientId: 'eventpulse-worker',
    brokers: ['localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'eventpulse-workers' });

async function start() {
    await consumer.connect();
    await consumer.subscribe({ topic: 'ingest-events', fromBeginning: true });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
            const event = JSON.parse(message.value?.toString() || '{}');
            console.log('Received event:', event);
        },
    });

    console.log('Worker is running and consuming events...');
}

start().catch(console.error);