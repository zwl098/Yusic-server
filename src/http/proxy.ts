import { Express, Request, Response } from 'express';
import axios from 'axios';
import https from 'https';

// 创建 HTTPS Agent 以复用连接，减少握手开销
const agent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 256,
    maxFreeSockets: 256,
    timeout: 60000 // 60秒 socket 超时
});

export const setupProxy = (app: Express) => {
    const TUNEHUB_BASE_URL = process.env.TUNEHUB_BASE_URL || 'https://tunehub.sayqz.com/api';
    const TUNEHUB_API_KEY = process.env.TUNEHUB_API_KEY || '';

    if (!TUNEHUB_API_KEY) {
        console.warn('⚠️ 未设置 TUNEHUB_API_KEY！API 代理可能无法正常工作。');
    }

    // 捕获所有 /api/* 的请求
    app.use('/api', async (req: Request, res: Response) => {
        try {
            const path = req.url;
            const targetUrl = `${TUNEHUB_BASE_URL}${path}`;

            // 过滤 Header，只透传必要的或安全的 Header
            const headers: Record<string, any> = {};
            const allowedHeaders = ['content-type', 'authorization', 'user-agent', 'accept', 'accept-encoding', 'accept-language'];

            Object.keys(req.headers).forEach(key => {
                if (allowedHeaders.includes(key.toLowerCase())) {
                    headers[key] = req.headers[key];
                }
            });

            // 注入强制 Header
            headers['host'] = new URL(TUNEHUB_BASE_URL).host;
            headers['x-api-key'] = TUNEHUB_API_KEY;
            // 如果客户端没传 User-Agent，给一个默认的
            if (!headers['user-agent']) {
                headers['user-agent'] = 'Yusic-Server/1.0';
            }

            const response = await axios({
                method: req.method,
                url: targetUrl,
                params: req.query,
                data: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined,
                headers,
                httpsAgent: agent, // 使用 keep-alive agent
                timeout: 30000, // 请求超时 30s
                validateStatus: () => true,
                responseType: 'stream'
            });

            // 转发响应头
            Object.entries(response.headers).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    res.setHeader(key, value as string | number | readonly string[]);
                }
            });

            // 转发状态码
            res.status(response.status);

            // 管道传输数据
            response.data.pipe(res);

            // 处理流错误，防止 crash
            response.data.on('error', (err: any) => {
                console.error('响应流错误:', err.message);
                if (!res.headersSent) {
                    res.status(500).end();
                } else {
                    res.end();
                }
            });

        } catch (error: any) {
            // 只在非 socket hang up 或非取消的情况下打印详细日志
            if (error.code === 'ECONNRESET' || error.message === 'socket hang up') {
                console.warn(`代理连接重置: ${req.url}`);
            } else {
                console.error('代理错误:', error.message);
            }

            if (!res.headersSent) {
                res.status(500).json({ code: -1, message: '代理错误', error: error.message });
            }
        }
    });
};
