export interface RoomState {
    roomId: string;
    songId: string | null;
    isPlaying: boolean;
    startTime: number | null; // Server timestamp in ms
    pauseTime: number | null; // Playback position in seconds
}
