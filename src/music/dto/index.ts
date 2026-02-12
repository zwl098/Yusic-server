export interface Song {
    id: string;
    name: string;
    artist: string[];
    album: string;
    duration?: number;
    cover?: string;
    platform: 'netease' | 'qq' | 'kuwo';
    url?: string; // 播放链接，解析后才有
}

export interface Playlist {
    id: string;
    name: string;
    cover?: string;
    description?: string;
    songs: Song[];
}

export interface SearchResult {
    list: Song[];
    total: number;
    page: number;
    limit: number;
}
