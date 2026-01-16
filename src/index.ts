import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const httpServer = createServer(app);

// API Proxy Configuration
app.use('/api', createProxyMiddleware({
    target: 'https://music-dl.sayqz.com/api',
    changeOrigin: true,
    pathRewrite: {
        '^/api': '', // Remove /api prefix when forwarding
    },
    on: {
        proxyRes: (proxyRes, req, res) => {
            if (proxyRes.headers['location']) {
                // Force HTTPS in redirect Location header
                proxyRes.headers['location'] = proxyRes.headers['location'].replace(/^http:\/\//, 'https://');
            }
        }
    }
}));
const io = new Server(httpServer, {
    cors: {
        origin: "*", // 在生产环境中需要修改为具体的前端地址
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Yusic Server is running!');
});

// 房间状态接口
interface Room {
    songId: string | null;
    playing: boolean;
    startAt: number;
}

// 房间数据存储
const rooms: Record<string, Room> = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // 加入房间
    socket.on('join', (roomId: string) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);

        // 如果房间不存在，初始化
        if (!rooms[roomId]) {
            rooms[roomId] = { songId: null, playing: false, startAt: 0 };
        }

        // 发送当前房间状态给新加入的用户
        socket.emit('sync_update', {
            type: 'INIT',
            roomId,
            data: rooms[roomId]
        });
    });

    // 同步操作
    socket.on('sync_action', (msg: { type: string, roomId: string, data: any, userId?: string }) => {
        const { type, roomId, data } = msg;

        if (!rooms[roomId]) return; // 房间不存在

        const room = rooms[roomId];

        switch (type) {
            case 'PLAY':
                room.playing = true;
                room.startAt = Date.now();
                // 如果提供了 songId，则更新，否则保持原样（可能是暂停后恢复）
                if (data && data.songId) {
                    room.songId = data.songId;
                }
                break;
            case 'PAUSE':
                room.playing = false;
                // 记录暂停时的进度? 这里简化处理，暂停时不改变 startAt，
                // 但实际逻辑中暂停通常需要记录暂停位置。
                // 用户的逻辑里 PAUSE 只是 playing = false。
                // 客户端收到 PAUSE 后应该暂停播放器。
                break;
            case 'SEEK':
                // seekTime 是单位秒
                if (data && typeof data.seekTime === 'number') {
                    room.startAt = Date.now() - data.seekTime * 1000;
                }
                break;
        }

        // 广播给房间内的其他人（包括发送者，确认状态同步，或者排除发送者取决于前端逻辑）
        // 原逻辑是 wss.clients.forEach (广播给所有)
        // 这里使用 io.to(roomId) 广播给房间内所有人
        io.to(roomId).emit('sync_update', { type, roomId, data: room });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
