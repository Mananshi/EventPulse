import express, { Request, Response } from 'express';
import { producer, connectProducer } from './kafka';
import { redisClient } from './redis';

const app = express();
const PORT = 3000;

app.use(express.json());

interface Event {
    id: string;
    type: string;
    timestamp: number;
    data: unknown;
}

app.post('/events', async (req: Request, res: Response) => {
    const { id, type, timestamp, data } = req.body as Event;

    if (!id || !type || !timestamp) {
        return res.status(400).json({ error: 'Missing required fields: id, type, timestamp' });
    }

    const exists = await redisClient.exists(`event:${id}`);

    if(exists) {
        return res.status(409).json({ status: 'duplicate', id });
    }

    await redisClient.set(`event:${id}`, '1', 'EX', 3600);

    await producer.send({
        topic: 'ingest-events',
        messages: [{ key: id, value: JSON.stringify({ id, type, timestamp, data }) }]
    });

    return res.status(200).json({ status: 'queued', id });
});

app.get('/health', (req: Request, res: Response) => {
    return res.status(200).json({ status: 'ok' });
});


async function start() {
    await connectProducer();
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

start();
