import { Server } from 'socket.io';
import { RoomState } from '../types';

import { RoomService } from '../room/room.service';

let io: Server | null = null;

export const initWs = (serverIo: Server) => {
    io = serverIo;

    io.on('connection', (socket) => {
        console.log('WS: User connected', socket.id);

        socket.on('join', (roomId: string) => {
            socket.join(roomId);
            console.log(`WS: User ${socket.id} joined ${roomId}`);

            // Send current state to the user who just joined
            const room = RoomService.getRoom(roomId);
            if (room) {
                socket.emit('sync_update', {
                    type: 'INIT',
                    ...room
                });
            }
        });

        socket.on('disconnect', () => {
            console.log('WS: User disconnected', socket.id);
        });
    });
};

export const broadcastStateChange = (type: 'PLAY' | 'PAUSE' | 'SEEK' | 'SONG_CHANGE', roomId: string, data: Partial<RoomState>) => {
    if (!io) return;

    // According to spec, we broadcast specific events
    // But helpful to send the relevant data
    console.log(`WS Broadcast: ${type} to ${roomId}`);
    io.to(roomId).emit('sync_update', {
        type,
        roomId,
        ...data
    });
};
