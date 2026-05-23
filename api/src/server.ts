import express, { Request, Response } from 'express';
import { producer, connectProducer } from './kafka';
import { redisClient } from './redis';
import './ws';
import { broadcastEvent } from './ws';
import { register, eventsReceivedTotal, duplicateEventsTotal, httpRequestDuration } from './metrics';

const app = express();
const PORT = Number(process.env.PORT) || 8080;

app.use(express.json());

interface Event {
    id: string;
    type: string;
    timestamp: number;
    data: unknown;
}

app.post('/events', async (req: Request, res: Response) => {
    const endTimer = httpRequestDuration.startTimer();

    const { id, type, timestamp, data } = req.body as Event;

    if (!id || !type || !timestamp) {
        endTimer({ status: '400' });
        return res.status(400).json({ error: 'Missing required fields: id, type, timestamp' });
    }

    const exists = await redisClient.exists(`event:${id}`);

    if (exists) {
        duplicateEventsTotal.inc();
        endTimer({ status: '409' });
        return res.status(409).json({ status: 'duplicate', id });
    }

    await redisClient.set(`event:${id}`, '1', 'EX', 3600);

    const event = { id, type, timestamp, data };

    await producer.send({
        topic: 'ingest-events',
        messages: [{ key: id, value: JSON.stringify(event) }]
    });

    broadcastEvent(event);

    eventsReceivedTotal.inc({ type });
    endTimer({ status: '200' });
    return res.status(200).json({ status: 'queued', id });
});

app.get('/health', (_req: Request, res: Response) => {
    return res.status(200).json({ status: 'ok' });
});

app.get('/metrics', async (_req: Request, res: Response) => {
    res.set('Content-Type', register.contentType);
    res.send(await register.metrics());
});


async function start() {
    await connectProducer();
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

start();
