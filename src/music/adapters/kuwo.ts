import { Song, SearchResult } from '../dto';

export class KuwoAdapter {
    static search(data: any, page: number, limit: number): SearchResult {
        // 酷我搜索结构通常为 abslist
        const listData = data?.abslist || [];
        const total = parseInt(data?.TOTAL || '0');

        const list: Song[] = listData.map((item: any) => ({
            id: item.MUSICRID?.replace('MUSIC_', '') || '',
            name: item.SONGNAME,
            artist: item.ARTIST?.split('&') || [], // 酷我 artist 是 '周杰伦&阿信' 格式
            album: item.ALBUM || '',
            duration: 0, // 酷我搜索列表可能不带时长
            cover: item.web_albumpic_short
                ? `https://img1.kuwo.cn/star/albumcover/${item.web_albumpic_short}`
                : (item.web_artistpic_short ? `https://img1.kuwo.cn/star/albumcover/${item.web_artistpic_short}` : ''),
            platform: 'kuwo'
        }));

        return {
            list,
            total,
            page,
            limit
        };
    }
}
