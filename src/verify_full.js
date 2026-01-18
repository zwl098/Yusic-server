const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function verify() {
    try {
        console.log('--- Starting Verification ---');

        // 1. Create Room
        console.log('1. Creating Room...');
        const createRes = await axios.post(`${BASE_URL}/rooms`);
        const roomId = createRes.data.data.roomId;
        console.log(`   Room ID: ${roomId}`);

        // 2. Play
        console.log('2. Playing Song...');
        const playRes = await axios.post(`${BASE_URL}/rooms/${roomId}/play`, { songId: 'song_full_verify' });
        const startState = playRes.data.data;
        const serverStartTime = startState.startTime;
        console.log(`   Playing. Server StartTime: ${serverStartTime}`);

        // 3. Immediate State Check
        const state1 = (await axios.get(`${BASE_URL}/rooms/${roomId}/state`)).data.data;
        console.log(`   State 1 (Immediate): currentTime = ${state1.currentTime.toFixed(3)}s`);

        // 4. Simulate Disconnect / Latency (Wait 3s)
        console.log('3. Waiting 3s (Simulating client disconnect)...');
        await new Promise(r => setTimeout(r, 3000));

        // 5. Reconnect (Get State)
        const state2 = (await axios.get(`${BASE_URL}/rooms/${roomId}/state`)).data.data;
        console.log(`   State 2 (After 3s): currentTime = ${state2.currentTime.toFixed(3)}s`);

        // Verification Logic
        const diff = state2.currentTime - state1.currentTime;
        console.log(`   Time Difference: ${diff.toFixed(3)}s`);

        if (Math.abs(diff - 3.0) < 0.5) {
            console.log('✅ TIME SYNC CHECK PASSED (Error < 500ms)');
        } else {
            console.error('❌ TIME SYNC CHECK FAILED');
        }

        if (state2.startTime === serverStartTime) {
            console.log('✅ START TIME PRESERVATION CHECK PASSED');
        } else {
            console.error('❌ START TIME CHANGED (Should be constant during play)');
        }

        if (state2.isPlaying === true) {
            console.log('✅ IS PLAYING CHECK PASSED');
        }

        // 6. Pause
        console.log('4. Pausing...');
        await axios.post(`${BASE_URL}/rooms/${roomId}/pause`);
        const pausedState = (await axios.get(`${BASE_URL}/rooms/${roomId}/state`)).data.data;
        console.log(`   Paused at: ${pausedState.pauseTime}s`);

        if (pausedState.isPlaying === false && pausedState.startTime === null && pausedState.pauseTime > 0) {
            console.log('✅ PAUSE STATE CHECK PASSED');
        }

        console.log('--- Verification Complete ---');

    } catch (e) {
        console.error('Verification Failed:', e.message);
        if (e.response) console.error('Response:', e.response.data);
    }
}

verify();
