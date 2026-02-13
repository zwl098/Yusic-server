import { Request, Response, Router } from 'express';
import { MusicService } from './music.service';
import { success, error } from '../http/response';

const router = Router();

// 统一搜索接口
// GET /api/music/search?keyword=...&platform=netease&page=1
router.get('/search', async (req: Request, res: Response) => {
    try {
        const { keyword, platform, page = '1', limit = '20' } = req.query;

        if (!keyword || !platform) {
            return error(res, 'Missing keyword or platform', 400);
        }

        const validPlatforms = ['netease', 'qq', 'kuwo'];
        if (!validPlatforms.includes(platform as string)) {
            return error(res, 'Invalid platform', 400);
        }

        const result = await MusicService.search(
            platform as string,
            keyword as string,
            parseInt(page as string) || 1,
            parseInt(limit as string) || 20
        );

        success(res, result);
    } catch (e: any) {
        console.error('Search error:', e);
        error(res, e.message || 'Server Error', 500);
    }
});

// 统一解析接口
// GET /api/music/url?id=...&platform=netease
router.get('/url', async (req: Request, res: Response) => {
    try {
        const { id, platform, quality = '320k' } = req.query;

        if (!id || !platform) {
            return error(res, 'Missing id or platform', 400);
        }

        const result = await MusicService.getUrl(
            platform as string,
            id as string,
            quality as string
        );

        success(res, result);
    } catch (e: any) {
        if (e.message === 'Insufficient credits') {
            return error(res, 'Credits not enough', 402);
        }
        error(res, e.message || 'Parse Error');
    }
});

// 获取歌词
// GET /api/music/lrc?id=...&platform=netease
router.get('/lrc', async (req: Request, res: Response) => {
    try {
        const { id, platform } = req.query;
        if (!id || !platform) return error(res, 'Missing id or platform', 400);

        const result = await MusicService.getLyric(platform as string, id as string);
        success(res, result);
    } catch (e: any) {
        error(res, e.message || 'Get Lyric Error');
    }
});

// 获取封面
// GET /api/music/pic?id=...&platform=netease
router.get('/pic', async (req: Request, res: Response) => {
    try {
        const { id, platform } = req.query;
        if (!id || !platform) return error(res, 'Missing id or platform', 400);

        const result = await MusicService.getPic(platform as string, id as string);
        success(res, result);
    } catch (e: any) {
        error(res, e.message || 'Get Pic Error');
    }
});

// 音频流代理接口 (解决 CORS/Referer 限制)
// GET /api/music/stream?url=...
router.get('/stream', async (req: Request, res: Response) => {
    try {
        const { url } = req.query;
        if (!url) return error(res, 'Missing url', 400);

        await MusicService.streamPipe(url as string, req, res);
    } catch (e: any) {
        console.error('Stream error:', e.message);
        // streamPipe 内部可能已经开始发送响应，这里只能尽力处理
        if (!res.headersSent) {
            error(res, 'Stream Error', 500);
        }
    }
});

export default router;
