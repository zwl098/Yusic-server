import { Router } from 'express';
import { RoomService } from '../room/room.service';
import { broadcastStateChange } from '../ws/gateway';

const router = Router();

// Create Room
router.post('/rooms', (req, res) => {
    const roomId = RoomService.createRoom();
    res.json({ roomId });
});

// Get Room State
router.get('/rooms/:id/state', (req, res) => {
    const { id } = req.params;
    const room = RoomService.getRoom(id);
    if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
    }

    // Return calculated current time, not raw state
    const currentTime = RoomService.getCurrentTime(room);
    res.json({
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
        res.status(404).json({ error: 'Room not found' });
        return;
    }

    // Broadcast PLAY
    broadcastStateChange('PLAY', id, {
        songId: room.songId,
        startTime: room.startTime,
        // We can also send currentTime offset if needed, but startTime is the source of truth
    });

    res.json({ success: true, state: room });
});

// Pause
router.post('/rooms/:id/pause', (req, res) => {
    const { id } = req.params;

    const room = RoomService.pause(id);
    if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
    }

    // Broadcast PAUSE
    broadcastStateChange('PAUSE', id, {
        pauseTime: room.pauseTime
    });

    res.json({ success: true, state: room });
});

// Change Song (Reset)
router.post('/rooms/:id/song', (req, res) => {
    const { id } = req.params;
    const { songId } = req.body;

    if (!songId) {
        res.status(400).json({ error: 'songId is required' });
        return;
    }

    const room = RoomService.setSong(id, songId);
    if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
    }

    // Broadcast SONG_CHANGE (or just generic sync)
    // Spec says: broadcast PLAY for play, PAUSE for pause.
    // SEEK/SONG_CHANGE is optional but good to have.
    broadcastStateChange('SONG_CHANGE', id, { songId: room.songId });

    res.json({ success: true, state: room });
});

export default router;
