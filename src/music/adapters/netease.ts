import { Song, SearchResult } from '../dto';

export class NeteaseAdapter {
    static search(data: any, page: number, limit: number): SearchResult {
        // 网易云通常返回 { result: { songs: [], songCount: ... } } 或 { code: 200, result: ... }
        const songs = data?.result?.songs || [];
        const total = data?.result?.songCount || 0;

        const list: Song[] = songs.map((item: any) => ({
            id: String(item.id),
            name: item.name,
            artist: item.artists?.map((ar: any) => ar.name) || [],
            album: item.album?.name || '',
            duration: item.duration || 0,
            cover: item.album?.picUrl || item.artists?.[0]?.img1v1Url || '',
            platform: 'netease'
        }));

        return {
            list,
            total,
            page,
            limit
        };
    }
}
