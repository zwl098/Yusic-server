import { Song, SearchResult } from '../dto';

export class QqAdapter {
    static search(data: any, page: number, limit: number): SearchResult {
        // QQ 搜索结构通常为 data.song.list
        const listData = data?.data?.song?.list || [];
        const total = data?.data?.song?.totalnum || 0;

        const list: Song[] = listData.map((item: any) => ({
            id: String(item.songmid), // QQ 使用 songmid 作为唯一标识更稳
            name: item.songname,
            artist: item.singer?.map((s: any) => s.name) || [],
            album: item.albumname || '',
            duration: item.interval ? item.interval * 1000 : 0,
            cover: `https://y.gtimg.cn/music/photo_new/T002R300x300M000${item.albummid}.jpg`,
            platform: 'qq'
        }));

        return {
            list,
            total,
            page,
            limit
        };
    }
}
