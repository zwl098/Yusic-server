import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { setupProxy } from './http/proxy';
import { initWs } from './ws/gateway';
import roomRoutes from './http/routes';
import musicRoutes from './music/music.controller';

const app = express();
const httpServer = createServer(app);

// 1. WebSocket 初始化
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
initWs(io);

// 2. 全局中间件
app.use(cors());
app.use(express.json());

// 3. 核心业务路由 (BFF)
// 注意：需在代理中间件之前挂载，避免被拦截
app.use('/api/music', musicRoutes);

// 4. 代理中间件 (兜底其他 /api 请求)
setupProxy(app);

// 5. 其他业务路由
app.use(roomRoutes);

// 6. 基础路由
app.get('/health', (req, res) => {
    res.send({ status: 'ok', timestamp: Date.now() });
});

app.get('/', (req, res) => {
    res.send('Yusic Server is running!');
});

// 导出供 index.ts 或测试使用
export { app, httpServer, io };
