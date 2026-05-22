import WebSocket, { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 3001 });

wss.on('listening', () => {
    console.log('WebSocket server listening on port 3001');
});

wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

export function broadcastEvent(event: unknown): void {
    const message = JSON.stringify({ type: 'newEvent', payload: event });
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}