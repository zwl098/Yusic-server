import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

async function test() {
    try {
        // 1. Create Room
        console.log('Creating room...');
        const createRes = await axios.post(`${BASE_URL}/rooms`);
        const roomId = createRes.data.data.roomId;
        console.log(`Room created: ${roomId}`);

        // 2. Get State (Initial)
        console.log('Getting initial state...');
        let stateRes = await axios.get(`${BASE_URL}/rooms/${roomId}/state`);
        console.log('Initial State:', stateRes.data.data);

        // 3. Play
        console.log('Playing song...');
        await axios.post(`${BASE_URL}/rooms/${roomId}/play`, { songId: 'test_song' });

        // 4. Get State (Playing)
        stateRes = await axios.get(`${BASE_URL}/rooms/${roomId}/state`);
        console.log('Playing State (Immediate):', stateRes.data.data);

        // Wait 2 seconds
        await new Promise(r => setTimeout(r, 2000));

        // 5. Get State (After 2s)
        stateRes = await axios.get(`${BASE_URL}/rooms/${roomId}/state`);
        console.log('Playing State (After 2s):', stateRes.data.data);

        // 6. Pause
        console.log('Pausing...');
        await axios.post(`${BASE_URL}/rooms/${roomId}/pause`);

        stateRes = await axios.get(`${BASE_URL}/rooms/${roomId}/state`);
        console.log('Paused State:', stateRes.data.data);

    } catch (e: any) {
        console.error('Test failed:', e.response?.data || e.message);
    }
}

test();
