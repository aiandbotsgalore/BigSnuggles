# Quick Start: Testing Multi-User Space Rooms

This guide helps you quickly test the multi-user room functionality in Big Snuggles.

---

## Prerequisites

1. **Database Migration Applied:**
   - Migration `006_create_rooms_infrastructure.sql` has been applied to Supabase
   - Tables created: `rooms`, `room_participants`, `room_messages`

2. **Dependencies Installed:**
   - Backend: `socket.io` installed
   - Frontend: `socket.io-client` installed

3. **Environment Variables:**
   - `SUPABASE_URL` and `SUPABASE_ANON_KEY` configured
   - Backend running on port 8000
   - Frontend running on port 5173

---

## Start Servers

### Terminal 1: Backend
```bash
cd /workspace/big-snuggles/backend
pnpm run dev
```

Expected output:
```
╔═══════════════════════════════════════════════════════════╗
║  Big Snuggles Voice AI Platform - Backend Server         ║
╠═══════════════════════════════════════════════════════════╣
║  Environment: development                                 ║
║  Port: 8000                                               ║
║  WebSocket (Voice): /ws                                   ║
║  Socket.IO (Rooms): /socket.io                            ║
║  Supabase: Connected                                      ║
╚═══════════════════════════════════════════════════════════╝
```

### Terminal 2: Frontend
```bash
cd /workspace/big-snuggles/frontend
pnpm run dev
```

Expected output:
```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## Testing Flow

### Test 1: Single User Room Creation

1. **Navigate to Spaces:**
   - Open browser: `http://localhost:5173`
   - Login/signup if needed
   - Navigate to: `http://localhost:5173/spaces`

2. **Create a Room:**
   - Enter optional room name (e.g., "Test Room")
   - Set max participants (default 10)
   - Click "Create Room"

3. **Verify Room Created:**
   - Should redirect to `/spaces/XXXXXX` (6-character code)
   - Should see join dialog
   - Enter display name (e.g., "User A")
   - Click "Join Room"

4. **Verify Room Interface:**
   - See room code at top
   - See yourself in participants list with "(You)" label
   - See "Host" badge next to your name
   - Participant count shows "1/10"

5. **Test Controls:**
   - Click "Copy Code" → Should copy room code to clipboard
   - Click "Share Link" → Should copy full URL
   - Send a text message → Should appear in conversation area

---

### Test 2: Multi-User Join (Two Browser Windows)

1. **Window 1 (User A - Host):**
   - Create room as above
   - Join room with name "User A"
   - Copy the room code (e.g., "XJ9K2M")

2. **Window 2 (User B):**
   - Open new incognito/private window: `http://localhost:5173`
   - Login/signup with different account
   - Navigate to `/spaces`
   - In "Join Existing Room" section:
     - Enter the room code from Window 1
     - Click "Join Room"
   - Enter display name "User B"
   - Click "Join Room"

3. **Verify Real-time Sync:**
   - **Window 1:** Should see "User B joined the room" system message
   - **Window 1:** Participant count updates to "2/10"
   - **Window 1:** See "User B" in participants list with green dot
   - **Window 2:** Should see "User A" in participants list with "Host" badge
   - **Window 2:** Should see "User B (You)" in participants list

4. **Test Messaging:**
   - **Window 1:** Send message "Hello from User A"
   - **Window 2:** Message should appear immediately
   - **Window 2:** Send message "Hi User A!"
   - **Window 1:** Message should appear immediately

5. **Test Leave:**
   - **Window 2:** Click "Leave" button → Confirm
   - **Window 1:** Should see "User B left the room" system message
   - **Window 1:** Participant count updates to "1/10"
   - **Window 1:** User B removed from participants list

---

### Test 3: Room Capacity

1. **Create Room with Low Capacity:**
   - In Spaces lobby, set "Max Participants" to 2
   - Create room and join as "User A"

2. **Join with User B:**
   - Open second window/account
   - Join the room as "User B"
   - Should succeed, participant count shows "2/2"

3. **Attempt Join with User C:**
   - Open third window/account
   - Try to join same room code
   - Should see error: "Room is full"

4. **Verify Capacity Warning:**
   - In Windows 1 & 2, participants list should show:
   - "2/2" badge
   - Red warning banner: "Room is at full capacity"

---

### Test 4: Host-Only Actions

1. **Window 1 (Host):**
   - Room controls should show "Settings" button
   - Can see all controls

2. **Window 2 (Non-host):**
   - Should NOT see "Settings" button
   - Can only see: Copy Code, Share Link, Leave

3. **Test State Update (Backend via API):**
   ```bash
   # Get auth token from browser DevTools (Application → Local Storage → supabase.auth.token)
   curl -X PATCH http://localhost:8000/api/rooms/:roomId/state \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"currentMode":"playful"}'
   ```

---

### Test 5: Connection Resilience

1. **Join Room in 2 Windows:**
   - User A and User B both in room

2. **Simulate Disconnect:**
   - **Window 2:** Close browser tab abruptly (don't click Leave)
   - **Window 1:** Wait 30 seconds
   - User B should eventually be marked offline (if presence heartbeat implemented)

3. **Rejoin After Disconnect:**
   - **Window 2:** Open browser again
   - Navigate back to `/spaces/XXXXXX`
   - Join with same display name
   - Should rejoin successfully
   - **Window 1:** Should see "User B joined the room" again

---

### Test 6: Voice Buttons (UI Only - Backend Integration Pending)

1. **Join Room:**
   - User in room

2. **Click "Start Voice":**
   - Button should change to "Stop Voice" (red)
   - Toast notification: "Voice conversation started"

3. **Click "Stop Voice":**
   - Button should change back to "Start Voice" (purple)
   - Toast notification: "Voice conversation stopped"

**Note:** Actual voice streaming integration with existing voice service is pending.

---

## Debugging

### Backend Logs

Check terminal for:
- `Socket.IO client connected: [socket_id]`
- `Socket [socket_id] authenticated as user [user_id]`
- `User [display_name] joined room [room_code]`
- `Message sent to room [room_id]: [message_type]`
- `User [user_id] left room [room_id]`

### Frontend DevTools

1. **Console Logs:**
   - "Socket.IO connected"
   - "Socket.IO authenticated"
   - "Joined room"
   - "Participant joined"
   - "Message received"

2. **Network Tab:**
   - WebSocket connection to `http://localhost:8000/socket.io`
   - Should show "101 Switching Protocols"

3. **React DevTools:**
   - Check `RoomSocketContext` state:
     - `isConnected: true`
     - `currentRoom: {...}`
     - `participants: [...]`
     - `messages: [...]`

### Database Verification

Query Supabase tables:

```sql
-- View all active rooms
SELECT * FROM rooms WHERE is_active = true;

-- View participants in a specific room
SELECT * FROM room_participants WHERE room_id = 'YOUR_ROOM_ID';

-- View recent messages
SELECT * FROM room_messages 
WHERE room_id = 'YOUR_ROOM_ID' 
ORDER BY created_at DESC 
LIMIT 20;
```

---

## Common Issues

### Issue: "Socket not connected"
**Solution:**
- Check backend is running on port 8000
- Verify Socket.IO endpoint: `http://localhost:8000/socket.io`
- Check CORS settings in backend server.js

### Issue: "Not authenticated"
**Solution:**
- Ensure user is logged in
- Check auth token in browser localStorage
- Verify token is sent in Socket.IO auth

### Issue: "Room not found"
**Solution:**
- Verify room code is correct (6 characters, uppercase)
- Check room exists in database: `SELECT * FROM rooms WHERE room_code = 'XXXXXX'`
- Ensure room is active: `is_active = true`

### Issue: Participants not syncing
**Solution:**
- Check Socket.IO connection in both windows
- Verify both clients joined same room ID (not just code)
- Check backend logs for join events
- Refresh browser to reset Socket.IO connection

### Issue: Messages not appearing
**Solution:**
- Check Socket.IO `room:message-received` event listener
- Verify message stored in database
- Check RoomSocketContext `messages` state
- Look for errors in console

---

## Success Criteria

- [x] Can create room and get unique room code
- [x] Can join room with display name
- [x] See other participants join in real-time
- [x] Participant count updates correctly
- [x] Messages sync across all participants
- [x] Host badge displays correctly
- [x] Copy/share functionality works
- [x] Leave room updates for all participants
- [x] Room capacity enforced
- [x] Connection errors handled gracefully

---

## Next Steps After Testing

1. **Report Issues:** Document any bugs or unexpected behavior
2. **Voice Integration:** Connect room system with existing voice service
3. **Enhanced Features:** Room browsing, persistent settings, moderation tools
4. **Performance Testing:** Test with more users (10+ participants)
5. **Mobile Testing:** Test responsive design on mobile devices

---

## Quick Test Commands

```bash
# Check if backend is running
curl http://localhost:8000/health

# Check if room API is accessible (requires auth token)
curl http://localhost:8000/api/rooms/code/TEST123 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Monitor database for new rooms
watch -n 2 'psql $SUPABASE_DB_URL -c "SELECT room_code, name, max_participants, is_active FROM rooms ORDER BY created_at DESC LIMIT 5"'
```

---

**Happy Testing!**

For issues or questions, check:
- `/workspace/big-snuggles/PHASE8_COMPONENT1_ROOMS.md` - Full documentation
- Backend logs (terminal 1)
- Frontend console (browser DevTools)
- Supabase database tables
