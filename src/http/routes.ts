import { Router } from 'express';
import { RoomService } from '../room/room.service';
import { broadcastStateChange } from '../ws/gateway';
import { success, error } from './response';

const router = Router();

// Create Room
router.post('/rooms', (req, res) => {
    const roomId = RoomService.createRoom();
    success(res, { roomId });
});

// Get Room State
router.get('/rooms/:id/state', (req, res) => {
    const { id } = req.params;
    const room = RoomService.getRoom(id);
    if (!room) {
        error(res, 'Room not found', 404);
        return;
    }

    // Return calculated current time, not raw state
    const currentTime = RoomService.getCurrentTime(room);
    success(res, {
        ...room,
        currentTime
    });
});

// Play
router.post('/rooms/:id/play', (req, res) => {
    const { id } = req.params;
    const { songId } = req.body;

    const room = RoomService.play(id, songId);
    if (!room) {
        error(res, 'Room not found', 404);
        return;
    }

    // Broadcast PLAY
    broadcastStateChange('PLAY', id, {
        songId: room.songId,
        startTime: room.startTime,
        // We can also send currentTime offset if needed, but startTime is the source of truth
    });

    success(res, room);
});

// Pause
router.post('/rooms/:id/pause', (req, res) => {
    const { id } = req.params;

    const room = RoomService.pause(id);
    if (!room) {
        error(res, 'Room not found', 404);
        return;
    }

    // Broadcast PAUSE
    broadcastStateChange('PAUSE', id, {
        pauseTime: room.pauseTime
    });

    success(res, room);
});

// Change Song (Reset)
router.post('/rooms/:id/song', (req, res) => {
    const { id } = req.params;
    const { songId } = req.body;

    if (!songId) {
        error(res, 'songId is required', 400);
        return;
    }

    const room = RoomService.setSong(id, songId);
    if (!room) {
        error(res, 'Room not found', 404);
        return;
    }

    // Broadcast SONG_CHANGE (or just generic sync)
    // Spec says: broadcast PLAY for play, PAUSE for pause.
    // SEEK/SONG_CHANGE is optional but good to have.
    broadcastStateChange('SONG_CHANGE', id, { songId: room.songId });

    success(res, room);
});

export default router;
