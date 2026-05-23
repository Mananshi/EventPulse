import { Kafka, Producer } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'event-pulse-api',
  brokers: [(process.env.KAFKA_BROKERS || 'localhost:9092')]
});

const producer: Producer = kafka.producer();

export async function connectProducer(): Promise<void> {
  await producer.connect();
  console.log('Kafka producer connected');
}

export async function disconnectProducer(): Promise<void> {
  await producer.disconnect();
  console.log('Kafka producer disconnected');
}

export { producer };