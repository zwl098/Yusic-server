import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupProxy } from './http/proxy';

const app = express();
const httpServer = createServer(app);

import { initWs } from './ws/gateway';

const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Initialize WebSocket Gateway
initWs(io);

app.use(cors());
app.use(express.json());

import roomRoutes from './http/routes';

// Setup Proxy
setupProxy(app);

app.use(roomRoutes);

app.get('/health', (req, res) => {
    res.send({ status: 'ok', timestamp: Date.now() });
});

app.get('/', (req, res) => {
    res.send('Yusic Server is running!');
});

// Export for usage in index.ts or testing
export { app, httpServer, io };
