import { useState, useEffect } from 'react';
import './App.css';
import { WS_URL } from './constants/urls';

interface Event {
  id: string;
  type: string;
  timestamp: number;
  data: unknown;
}

function App() {
  const [events, setEvents] = useState<Event[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Open a persistent connection to the WebSocket server.
    // The browser will keep this open and fire onmessage every time
    // the server pushes a new event — no polling needed.
    const socket = new WebSocket(WS_URL);

    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);

    socket.onmessage = (messageEvent) => {
      const msg = JSON.parse(messageEvent.data);

      if (msg.type === 'newEvent') {
        // Prepend so the newest event is always at the top.
        // Slice to 20 so the list doesn't grow unbounded.
        setEvents((prev) => [msg.payload, ...prev].slice(0, 20));
      }
    };

    return () => socket.close();
  }, []);

  return (
    <div id="app">
      <h1>EventPulse</h1>

      <p>
        Status:{' '}
        <span className={connected ? 'status-connected' : 'status-disconnected'}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </p>

      <h2>Live Events ({events.length})</h2>

      {events.length === 0 ? (
        <p className="events-empty">Waiting for events...</p>
      ) : (
        <table className="events-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Timestamp</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>{event.id}</td>
                <td>{event.type}</td>
                <td>{event.timestamp}</td>
                <td>{JSON.stringify(event.data)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;
