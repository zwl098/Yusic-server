import { rooms } from './room.store';
import { RoomState } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class RoomService {
    /**
     * Create a new room
     */
    static createRoom(): string {
        const roomId = uuidv4();
        const initialRoom: RoomState = {
            roomId,
            songId: null,
            isPlaying: false,
            startTime: null,
            pauseTime: 0
        };
        rooms.set(roomId, initialRoom);
        return roomId;
    }

    /**
     * Get room state
     */
    static getRoom(roomId: string): RoomState | undefined {
        return rooms.get(roomId);
    }

    /**
     * Calculate current playback time for a room
     * This is the SINGLE SOURCE OF TRUTH for time
     */
    static getCurrentTime(room: RoomState): number {
        if (!room.isPlaying || !room.startTime) {
            return room.pauseTime ?? 0;
        }
        // Calculate elapsed time since start in seconds
        const elapsed = (Date.now() - room.startTime) / 1000;
        // Add any previously accumulated pause time (logic might vary, usually start time implies from 0 or offset)
        // According to user spec: "startTime = Date.now()", "pauseTime = null".
        // Wait, if we pause, we set pauseTime. If we resume, we set startTime.
        // If we resume from pauseTime, does startTime account for that?
        // User spec says: 
        // Play: startTime = Date.now(), pauseTime = null.
        // Pause: pauseTime = calculate..., startTime = null.
        // Client receives PLAY with startTime. Client does: offset = (Date.now() - startTime) / 1000. audio.currentTime = offset.
        // This implies the song starts from 0 when startTime is set. 
        // BUT what if we seek or resume? 
        // User spec: "Client calculates progress". 
        // If we RESUME, we must have a way to offset.
        // User spec Section VII.1: "Play ... startTime = Date.now(), pauseTime = null". 
        // Section VII.2: "Client ... audio.currentTime = offset". This means it ALWAYS starts from 0?
        // Ah, the user might be simplifying. If I seek to 30s, I need to adjust.
        // Section VI.3 SEEK: "startTime": 1700000005000.
        // If I seek to 10s: I set startTime back by 10s? 
        // Or does the client handle the offset?
        // User Spec IV: "return (Date.now() - room.startTime) / 1000".
        // This implies `startTime` is the "effective start time" of the song (t=0).

        // Example: I am at 10s. I pause. 
        // Play again. I want to continue from 10s. 
        // I set startTime such that (now - startTime) = 10s. 
        // So startTime = now - 10s.

        return (Date.now() - room.startTime) / 1000;
    }

    /**
     * Start playing (or resume)
     */
    static play(roomId: string, songId?: string): RoomState | null {
        const room = rooms.get(roomId);
        if (!room) return null;

        // If resuming, we need to calculate an artificial startTime
        // such that (now - startTime) = pauseTime.
        // startTime = now - pauseTime * 1000
        const currentPauseTime = room.pauseTime || 0;
        room.startTime = Date.now() - (currentPauseTime * 1000);

        room.isPlaying = true;
        room.pauseTime = null; // Clear pauseTime as we are now playing based on startTime

        if (songId) {
            // If changing song, reset everything?
            // User spec: 3. play... set startTime=now...
            // If explicit Play with songId, usually means start from beginning?
            // Logic: if songId matches current, resume? otherwise restart?
            // Let's assume for now: if user explicitly plays, they might be resuming OR starting new.
            // The user spec says "1. Host clicks play... startTime = Date.now()". Assuming start from 0.
            // But if it's "resume", we need to handle it.
            // Let's implement Resume logic if logic detects we are paused?
            // Actually, let's treat "Play" as "Resume" if song is same, or "Start" if different?
            // For safety, let's support an explicit offset/seek if needed, or rely on pauseTime.

            if (room.songId !== songId) {
                // New song, start from 0
                room.songId = songId;
                room.startTime = Date.now();
                room.pauseTime = null;
            } else {
                // Same song, check if we have value in pauseTime
                // Already handled above: startTime = now - pauseTime
            }
        } else {
            // No songId provided, just resume
            // Already handled above
        }

        return room;
    }

    /**
     * Pause playback
     */
    static pause(roomId: string): RoomState | null {
        const room = rooms.get(roomId);
        if (!room) return null;

        if (room.isPlaying && room.startTime) {
            room.pauseTime = (Date.now() - room.startTime) / 1000;
            room.startTime = null;
            room.isPlaying = false;
        }

        return room;
    }

    /**
     * Change song (reset)
     */
    static setSong(roomId: string, songId: string): RoomState | null {
        const room = rooms.get(roomId);
        if (!room) return null;

        room.songId = songId;
        room.isPlaying = false;
        room.startTime = null;
        room.pauseTime = 0;

        return room;
    }
}
