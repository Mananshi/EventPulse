const isDev = window.location.hostname === 'localhost';

export const WS_URL = isDev
  ? 'ws://localhost:3001'
  : 'wss://api.eventpulse.com/ws'; // replace with your prod URL when deploying
