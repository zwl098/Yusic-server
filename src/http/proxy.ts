import { createProxyMiddleware } from 'http-proxy-middleware';
import { Express } from 'express';

export const setupProxy = (app: Express) => {
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
};
