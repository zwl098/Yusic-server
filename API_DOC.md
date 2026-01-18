# 同步听歌 - 前端对接文档

本文档描述了后端接口规范及前端对接逻辑。

## 核心原则

1. **服务器是时间权威**：前端**绝对不要**把自己播放器的 `currentTime` 发送给服务器。
2. **状态计算**：前端的播放进度永远通过公式计算：`当前进度 = (Date.now() - startTime) / 1000`。
3. **WebSocket 仅作通知**：收到 WS 消息只更新 UI 或触发动作，**数据以 HTTP 接口返回的状态为准**（或消息体中携带的最新状态）。

---

## 一、 数据模型

### RoomState (房间状态)

```typescript
interface RoomState {
  roomId: string;
  songId: string | null;     // 当前歌曲 ID
  isPlaying: boolean;        // 是否正在播放
  startTime: number | null;  // 服务器时间戳（毫秒），表示"本段播放"的开始时刻
  pauseTime: number | null;  // 暂停时刻的进度（秒）
  currentTime?: number;      // 仅 HTTP 响应包含，服务器计算好的当前进度（秒）
}
```

---

## 二、 HTTP 接口

**Base URL**: `http://<server-ip>:3000`

### 1. 创建房间
* **URL**: `POST /rooms`
* **Response**:
  ```json
  { "roomId": "uuid-string" }
  ```

### 2. 获取房间状态 (初始化/重连/校准)
* **URL**: `GET /rooms/:roomId/state`
* **Response**: `RoomState` 对象
* **前端逻辑**:
  1. 获取到 `state`。
  2. 如果 `isPlaying` 为 `true`:
     * 计算 `offset = state.currentTime` (后端已通过 `(Date.now() - startTime)/1000` 计算好)。
     * 设置播放器 `audio.currentTime = offset`。
     * 调用 `audio.play()`。
  3. 如果 `isPlaying` 为 `false`:
     * 设置播放器 `audio.currentTime = state.pauseTime`。
     * 调用 `audio.pause()`。

### 3. 播放 (Play)
* **URL**: `POST /rooms/:roomId/play`
* **Body**:
  ```json
  { "songId": "optional-song-id" }
  ```
  * 如果是暂停后继续播放，不需要传 `songId`。
  * 如果是切歌并播放，传新 `songId`。

### 4. 暂停 (Pause)
* **URL**: `POST /rooms/:roomId/pause`
* **Body**: `{}`

### 5. 切歌 (Change Song)
* **URL**: `POST /rooms/:roomId/song`
* **Body**:
  ```json
  { "songId": "new-song-id" }
  ```

---

## 三、 WebSocket 事件

**连接 URL**: `ws://<server-ip>:3000`
**事件名称**: `sync_update`

### 连接流程
1. `socket.connect()`
2. `socket.emit('join', roomId)`

### 接收消息

所有广播消息结构如下：
```typescript
interface SyncEvent {
  type: 'PLAY' | 'PAUSE' | 'SONG_CHANGE' | 'INIT';
  roomId: string;
  // 附加数据，通常是 Partial<RoomState>
  songId?: string;
  startTime?: number;
  pauseTime?: number;
}
```

#### 事件处理逻辑

**1. 收到 `PLAY`**
```javascript
socket.on('sync_update', (msg) => {
  if (msg.type === 'PLAY') {
    // 关键：计算正确的进度
    const offset = (Date.now() - msg.startTime) / 1000;
    
    // 建议：如果误差小于 0.1s，可以忽略，避免音频卡顿
    if (Math.abs(audio.currentTime - offset) > 0.1) {
       audio.currentTime = offset;
    }
    
    if (msg.songId && msg.songId !== currentSongId) {
       // 加载新歌逻辑...
    }
    
    audio.play();
  }
});
```

**2. 收到 `PAUSE`**
```javascript
socket.on('sync_update', (msg) => {
  if (msg.type === 'PAUSE') {
    audio.pause();
    if (msg.pauseTime !== undefined) {
      audio.currentTime = msg.pauseTime;
    }
  }
});
```

**3. 收到 `SONG_CHANGE`**
```javascript
socket.on('sync_update', (msg) => {
  if (msg.type === 'SONG_CHANGE') {
    audio.pause();
    // 切换歌曲封面、资源等
    currentSongId = msg.songId;
    audio.currentTime = 0;
    // 等待 PLAY 信号或自动播放取决于产品逻辑，
    // 但根据后端设计，切歌仅仅是重置状态，通常接下来会紧接一个 PLAY，
    // 或者切歌接口本身不自动播放。
    // 当前后端实现：切歌后 isPlaying=false。
  }
});
```

---

## 四、 常见问题 Q&A

**Q: 为什么 WebSocket 也要发 startTime？**
A: 因为网络有延迟。客户端收到 `PLAY` 消息时，可能已经过去了几百毫秒。通过 `Date.now() - msg.startTime` 可以算出**绝对准确**的当前进度，消除传输延迟带来的误差。

**Q: 感觉进度总是不准？**
A: 请检查：
1. 客户端是否和服务端时间差异过大？（通常 `Date.now()` 是相对准确的，跨时区也没关系，因为是求差值）。
2. 是否直接使用了 `currentTime = 0`？必须使用 `(Date.now() - startTime) / 1000`。
3. 如果是开发环境 localhost，应该非常准。如果是真实网络，确保计算逻辑正确。
