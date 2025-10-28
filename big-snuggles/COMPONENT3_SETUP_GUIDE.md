# Component 3: Clip Generator - Quick Setup Guide

## Prerequisites Check
✅ FFmpeg installed (v5.1.7)  
✅ Database migration applied (008_create_clip_system.sql)  
✅ Backend code complete (1,207 lines)  
✅ Frontend code complete (1,361 lines)  

## Manual Setup Required (3 Steps)

### Step 1: Create Storage Bucket (5 minutes)

**Via Supabase Dashboard:**
1. Navigate to https://supabase.com/dashboard
2. Select your project: `msuhlwamufbgftlcgzre`
3. Go to **Storage** section
4. Click **New Bucket**
5. Configure bucket:
   - **Name**: `clips`
   - **Public**: ✅ Yes
   - **File size limit**: `104857600` (100MB)
   - **Allowed MIME types**:
     - `video/mp4`
     - `video/webm`
     - `audio/mpeg`
     - `image/jpeg`
6. Click **Create Bucket**

**Verification:**
```bash
# Check if bucket exists
curl https://msuhlwamufbgftlcgzre.supabase.co/storage/v1/bucket/clips
```

### Step 2: Install Frontend Dependencies (2 minutes)

```bash
cd /workspace/big-snuggles/frontend
pnpm add @radix-ui/react-dialog
```

**Expected output:**
```
Progress: resolved X, reused X, downloaded X, added 1
+ @radix-ui/react-dialog X.X.X
```

### Step 3: Restart Services (2 minutes)

**Terminal 1 - Backend:**
```bash
cd /workspace/big-snuggles/backend
pnpm run dev
```

**Terminal 2 - Frontend:**
```bash
cd /workspace/big-snuggles/frontend
pnpm run dev
```

**Verification:**
- Backend: http://localhost:8000/health should return `{"status":"healthy"}`
- Frontend: http://localhost:5173 should load the app

---

## Testing the Feature (10 minutes)

### 1. Access Clips Page
1. Navigate to a conversation/room (e.g., `/spaces/ROOM_CODE`)
2. Look for "Create Clip" or "Clips" button
3. Or manually navigate to `/clips/CONVERSATION_ID`

### 2. Test Auto-Detect Highlights
1. Click **"Auto-Detect Highlights"** button
2. Adjust sensitivity slider (0.5 = more highlights, 0.9 = fewer)
3. Wait for highlight detection (should complete in 1-3 seconds)
4. Review detected highlights in the results panel
5. Highlights are automatically queued for processing

### 3. Test Manual Clip Creation
1. Click **"Create Manual Clip"** button
2. Use timeline scrubber:
   - Drag left handle to set start time
   - Drag right handle to set end time
   - Or drag the highlighted region to move selection
3. Ensure duration is 5s - 300s (5 minutes)
4. Click **"Create Clip"**
5. Clip is queued for processing

### 4. Monitor Processing
1. Clips appear in grid with status badges:
   - **Pending**: Queued (yellow)
   - **Processing**: Active with progress bar (blue)
   - **Completed**: Ready for download (green)
   - **Failed**: Error occurred (red)
2. Progress updates automatically every few seconds
3. Processing typically takes 1-2 minutes per clip

### 5. Test Download
1. Once clip status is **Completed**
2. Click download dropdown
3. Select format:
   - **MP4** (video with waveform)
   - **WebM** (alternative video format)
   - **MP3** (audio only)
4. File downloads automatically

### 6. Test Share
1. Click **Share** button on completed clip
2. Share modal opens with:
   - Video preview player
   - Copy URL button
   - Social media buttons (Twitter, Facebook, WhatsApp)
3. Test copy URL (should show "Copied" feedback)
4. Test social share button (opens new window)

### 7. Test Delete
1. Click **Delete** button on any clip
2. Confirm deletion
3. Clip removed from grid
4. Files deleted from storage

---

## Troubleshooting

### Issue: "Clips bucket not found"
**Solution**: Complete Step 1 (Create Storage Bucket)

### Issue: "Dialog component error"
**Solution**: Complete Step 2 (Install @radix-ui/react-dialog)

### Issue: "FFmpeg not found"
**Check**:
```bash
which ffmpeg
# Should output: /usr/bin/ffmpeg

ffmpeg -version
# Should output: ffmpeg version 5.1.7
```

### Issue: Clips stuck in "Processing"
**Debug**:
```bash
# Check backend logs
cd /workspace/big-snuggles/backend
pnpm run dev

# Look for FFmpeg errors in console output
```

**Common causes**:
- Audio file not found (check conversation has recording)
- FFmpeg process error (check logs)
- Storage upload failed (check bucket permissions)

### Issue: Highlight detection returns 0 results
**Possible reasons**:
- Sensitivity too high (try 0.5 or 0.6)
- Conversation too short (<30 seconds)
- No engaging content detected

**Solution**:
- Lower sensitivity slider
- Use manual clip creation instead
- Check that conversation has messages

---

## API Testing with curl

### Auto-Detect Highlights
```bash
curl -X POST http://localhost:8000/api/clips/auto-generate \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "YOUR_ROOM_ID",
    "userId": "YOUR_USER_ID",
    "sensitivity": 0.7
  }'
```

### Create Manual Clip
```bash
curl -X POST http://localhost:8000/api/clips/create \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "YOUR_ROOM_ID",
    "userId": "YOUR_USER_ID",
    "title": "Test Clip",
    "startTime": 10,
    "endTime": 30
  }'
```

### Check Clip Status
```bash
curl http://localhost:8000/api/clips/CLIP_ID/status?userId=YOUR_USER_ID
```

### List User Clips
```bash
curl http://localhost:8000/api/clips/users/YOUR_USER_ID/clips?conversationId=ROOM_ID
```

---

## Expected Behavior

### Successful Auto-Detect Flow
1. User clicks "Auto-Detect Highlights"
2. API analyzes conversation messages (1-3s)
3. Returns 0-10 highlights sorted by score
4. Highlights displayed in results panel
5. Clips queued for background processing
6. Processing starts automatically (1-2 min per clip)
7. Status updates from pending → processing → completed
8. Clips appear in grid with thumbnails
9. User can download/share/delete

### Successful Manual Clip Flow
1. User clicks "Create Manual Clip"
2. Timeline scrubber appears
3. User drags handles to select range (5s - 300s)
4. User clicks "Create Clip"
5. Clip queued for processing
6. Same processing flow as auto-detect
7. Clip appears in grid when completed

---

## Performance Expectations

| Operation | Time | Notes |
|-----------|------|-------|
| Highlight Detection | 1-3s | Depends on conversation length |
| Clip Processing | 1-2 min | Per clip, FFmpeg operations |
| Audio Extraction | 10-20s | Fast operation |
| Video Generation | 30-60s | Waveform rendering |
| Format Optimization | 20-40s | Per format (MP4, WebM, MP3) |
| Thumbnail Creation | 5-10s | Single frame extraction |
| Storage Upload | 10-20s | Depends on file size |

**Total Pipeline**: ~2 minutes per clip

---

## Success Criteria

✅ **Backend**: All 7 API endpoints respond correctly  
✅ **Frontend**: All pages and components render without errors  
✅ **Database**: Clips and shares tracked accurately  
✅ **Storage**: Files uploaded and accessible  
✅ **FFmpeg**: All operations complete successfully  
✅ **Processing**: Background jobs complete within 2 minutes  
✅ **UI/UX**: Timeline scrubber interactive and responsive  
✅ **Social**: Share buttons open correct platforms  

---

## Next Steps After Setup

1. ✅ Complete 3 manual setup steps (10 minutes)
2. ✅ Test all flows (10 minutes)
3. ✅ Verify storage bucket has files
4. ✅ Test on different devices/browsers
5. 📝 Gather user feedback
6. 🚀 Deploy to production (if testing successful)

---

## Quick Reference

**Backend Port**: 8000  
**Frontend Port**: 5173  
**Storage Bucket**: clips  
**Max Clip Duration**: 300s (5 minutes)  
**Min Clip Duration**: 5s  
**Max File Size**: 100MB  
**Formats**: MP4, WebM, MP3  
**FFmpeg Version**: 5.1.7  

**Key Files**:
- Backend: `backend/src/services/clipGenerator.js`
- Routes: `backend/src/routes/clips.js`
- Page: `frontend/src/pages/ClipsPage.tsx`
- Timeline: `frontend/src/components/ClipTimeline.tsx`

**Database Tables**:
- `clips` (19 columns)
- `clip_shares` (3 columns)

---

**Total Setup Time**: ~15 minutes  
**Status**: Ready for testing after manual setup
