import axios from 'axios';
import NodeCache from 'node-cache';
import { Song, SearchResult } from './dto';
import { NeteaseAdapter } from './adapters/netease';
import { QqAdapter } from './adapters/qq';
import { KuwoAdapter } from './adapters/kuwo';

// 缓存配置：
// - checkperiod: 120s 自动清理过期
const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

// API 配置缓存 key 前缀
const KEY_CONFIG = 'config:'; // config:platform:function
// 搜索缓存
const KEY_SEARCH = 'search:'; // search:platform:keyword:page

export class MusicService {
    private static baseUrl = process.env.TUNEHUB_BASE_URL || 'https://tunehub.sayqz.com/api';
    private static apiKey = process.env.TUNEHUB_API_KEY || '';

    /**
     * 获取方法配置 (带缓存 - 24小时)
     */
    private static async getMethodConfig(platform: string, func: string): Promise<any> {
        const key = `${KEY_CONFIG}${platform}:${func}`;
        const cached = cache.get(key);
        if (cached) return cached;

        try {
            const url = `${this.baseUrl}/v1/methods/${platform}/${func}`;
            const res = await axios.get(url, {
                headers: { 'x-api-key': this.apiKey }
            });

            const config = res.data?.data;
            if (config) {
                // 缓存 24 小时
                cache.set(key, config, 3600 * 24);
            }
            return config;
        } catch (e) {
            console.error(`Get method config failed: ${platform}/${func}`, e);
            throw new Error('Upstream Error');
        }
    }

    /**
     * 执行上游请求
     */
    private static async executeRequest(config: any, params: Record<string, any>) {
        if (!config) throw new Error('Method not supported');

        // 1. 替换模板变量 (支持表达式)
        // configStr 可能包含 {{keyword}} 或 {{ (page-1)*limit }}
        let configStr = JSON.stringify(config);

        // 使用正则匹配所有 {{ ... }}
        configStr = configStr.replace(/{{(.*?)}}/g, (match, expression) => {
            try {
                //构建通过参数名获取值的上下文
                const keys = Object.keys(params);
                const values = Object.values(params);
                // 创建函数执行表达式: new Function('keyword', 'page', 'return keyword')
                const fn = new Function(...keys, `return (${expression});`);
                const result = fn(...values);
                return result === undefined || result === null ? '' : String(result);
            } catch (e) {
                console.warn(`Template evaluate failed: ${expression}`, e);
                return match; // 保持原样
            }
        });

        const actualConfig = JSON.parse(configStr);

        // 2. 发起请求
        // 注意：TuneHub 返回的 config.url 是上游真实地址
        // config.headers 也要带上
        try {
            const res = await axios({
                method: actualConfig.method,
                url: actualConfig.url,
                params: actualConfig.params,
                data: actualConfig.body,
                headers: actualConfig.headers,
                timeout: 10000
            });
            return res.data;
        } catch (e: any) {
            console.error('Upstream Request Failed', e.message);
            throw new Error('Upstream Service Error');
        }
    }

    /**
     * 统一搜索接口
     */
    static async search(platform: string, keyword: string, page: number = 1, limit: number = 20): Promise<SearchResult> {
        const cacheKey = `${KEY_SEARCH}${platform}:${keyword}:${page}:${limit}`;
        const cached = cache.get<SearchResult>(cacheKey);
        if (cached) return cached;

        // 1. 获取 search 配置
        const config = await this.getMethodConfig(platform, 'search');

        // 2. 准备参数
        // 不同平台分页参数不同，这里简单映射，具体计算逻辑应放在 Adapter 或在此处硬编码？
        // TuneHub 的模板通常是 {{page}}, {{limit}} 或 {{offset}}
        // 我们传给 executeRequest 的是标准参数，由 executeRequest 内部替换到 config 模板中
        // 关键：config.params 里写的是 {{page}} 还是 {{(page-1)*limit}} ?
        // 之前的 kuwo 是 {{page}}, {{limit}}。若有复杂运算 TuneHub 模板支持吗？
        // TuneHub 模板如果是简单的字符串替换，那复杂计算（如 page -> offset）需要我们算出 offset 再传。
        // 为了通用，我们假设我们传 raw variables，依靠 TuneHub 配置的模板 (如果它支持表达式) 或者我们在 Adapter 里预处理。
        // 但 Adapter 是后处理。预处理呢？
        // 简单起见，我们传 page, limit, offset, keyword 全部进去，让模板各取所需。

        const templateParams = {
            keyword,
            page,
            limit,
            offset: (page - 1) * limit
        };

        // 3. 执行请求
        const rawData = await this.executeRequest(config, templateParams);

        // 4. 转换结果 (Adapter)
        let result: SearchResult = { list: [], total: 0, page, limit };

        if (platform === 'netease') {
            result = NeteaseAdapter.search(rawData, page, limit);
        } else if (platform === 'qq') {
            result = QqAdapter.search(rawData, page, limit);
        } else if (platform === 'kuwo') {
            result = KuwoAdapter.search(rawData, page, limit);
        }

        // 5. 缓存 10 分钟
        cache.set(cacheKey, result, 600);

        return result;
    }



    /**
     * 获取歌曲元数据 (包含 URL, 歌词, 封面)
     */
    static async fetchMetadata(platform: string, id: string, quality: string = '320k') {
        const key = `metadata:${platform}:${id}:${quality}`;
        const cached = cache.get(key);
        if (cached) return cached;

        console.log(`[MusicService] Fetching metadata for ${platform}/${id}...`);
        try {
            const res = await axios.post(`${this.baseUrl}/v1/parse`, {
                platform,
                ids: id,
                quality
            }, {
                headers: { 'x-api-key': this.apiKey }
            });

            const nestedData = res.data?.data?.data;
            if ((res.data?.code === 0 || res.data?.code === 200) && nestedData?.[0]) {
                const item = nestedData[0];

                // 强制 HTTPS (解决混合内容问题)
                if (item.url) item.url = item.url.replace(/^http:\/\//, 'https://');
                if (item.cover) item.cover = item.cover.replace(/^http:\/\//, 'https://');
                // Pic alias
                if (item.pic) item.cover = item.pic.replace(/^http:\/\//, 'https://');

                // 缓存 10 分钟
                cache.set(key, item, 600);
                return item;
            } else {
                throw new Error(res.data?.message || 'Parse failed');
            }
        } catch (e: any) {
            console.error(`[MusicService] fetchMetadata failed:`, e.message);
            // 映射错误码
            if (e.response?.status === 402 || e.response?.data?.code === -2) {
                throw new Error('Insufficient credits');
            }
            throw e;
        }
    }

    /**
     * 获取歌词
     * 优先使用 parse 接口返回的 lyrics 字段
     */
    static async getLyric(platform: string, id: string) {
        // 1. Try Fetch Metadata First (Unified Source)
        try {
            const metadata: any = await this.fetchMetadata(platform, id);
            if (metadata.lyrics) {
                return { lrc: metadata.lyrics };
            }
        } catch (e) {
            // metadata failed, try fallback
        }

        // 2. Fallback to old method
        try {
            const config = await this.getMethodConfig(platform, 'lrc');
            if (config) {
                return await this.executeRequest(config, { id });
            }
        } catch (e) { }

        return { lrc: '[00:00.00] Lyrics not available' };
    }

    /**
     * 获取封面
     * 优先使用 parse 接口返回的 cover 字段
     */
    static async getPic(platform: string, id: string) {
        try {
            const metadata: any = await this.fetchMetadata(platform, id);
            if (metadata.cover) {
                return metadata.cover;
            }
        } catch (e) { }

        // Fallback
        try {
            const config = await this.getMethodConfig(platform, 'pic');
            if (config) {
                return await this.executeRequest(config, { id });
            }
        } catch (e) { }

        return null;
    }

    /**
     * 解析播放链接
     */
    static async getUrl(platform: string, id: string, quality: string = '320k') {
        const metadata: any = await this.fetchMetadata(platform, id, quality);
        if (!metadata.url) throw new Error('No URL found');
        return metadata.url;
    }

    /**
     * 音频流代理 (透传 Range 头)
     */
    static async streamPipe(url: string, req: any, res: any) {
        // 白名单过滤 headers
        const headers: Record<string, any> = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': new URL(url).origin + '/', // 伪造 Referer
        };

        if (req.headers.range) {
            headers['Range'] = req.headers.range;
        }

        try {
            const httpsAgent = new (require('https').Agent)({ rejectUnauthorized: false });

            const response = await axios({
                method: 'get',
                url: url,
                headers,
                responseType: 'stream',
                timeout: 30000,
                httpsAgent, // 忽略上游证书错误
                validateStatus: () => true
            });

            const allowedResponseHeaders = [
                'content-type', 'content-length', 'content-range',
                'accept-ranges', 'date', 'last-modified', 'etag'
            ];

            Object.keys(response.headers).forEach(key => {
                if (allowedResponseHeaders.includes(key.toLowerCase())) {
                    res.setHeader(key, response.headers[key]);
                }
            });

            res.setHeader('Access-Control-Allow-Origin', '*');
            res.status(response.status);
            response.data.pipe(res);

            response.data.on('error', (err: any) => {
                console.error('Stream pipe error:', err.message);
                if (!res.headersSent) res.end();
            });
        } catch (e: any) {
            console.error('Stream fetch error:', e.message);
            throw e;
        }
    }
}
