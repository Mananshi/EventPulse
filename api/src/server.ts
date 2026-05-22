import express, { Request, Response } from 'express';

const app = express();
const PORT = 3000;

app.use(express.json());

interface Event {
    id: string;
    type: string;
    timestamp: number;
    data: unknown;
}

app.post('/events', (req: Request, res: Response) => {
    const { id, type, timestamp, data } = req.body as Event;

    if (!id || !type || !timestamp) {
        return res.status(400).json({ error: 'Missing required fields: id, type, timestamp' });
    }

    return res.status(200).json({ status: 'received', id });
});

app.get('/health', (req: Request, res: Response) => {
    return res.status(200).json({ status: 'ok' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});