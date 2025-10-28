# Big Snuggles - Phase 3: Real-time Voice Interface

## Overview

Phase 3 implements real-time bidirectional voice streaming with Google Gemini 2.0 Flash Live API, enabling natural voice conversations with Big Snuggles, the gangster teddy bear AI character.

## Features Implemented

### Backend
- **Voice Service** (`backend/src/services/voiceService.js`)
  - Google Gemini Live API integration
  - Real-time audio processing (16kHz PCM input)
  - Session management with personality integration
  - Voice Activity Detection (VAD)
  - Automatic interruption handling
  - Performance metrics tracking

- **Audio Processing** (`backend/src/utils/audioProcessing.js`)
  - PCM16 audio conversion
  - Audio resampling
  - Audio buffering and chunking
  - RMS volume calculation
  - Voice activity detection

- **Voice Routes** (`backend/src/routes/voice.js`)
  - `POST /api/voice/session/create` - Create voice session
  - `GET /api/voice/session/:id/status` - Get session status
  - `POST /api/voice/session/:id/end` - End voice session
  - `GET /api/voice/sessions` - List user sessions
  - `POST /api/voice/session/:id/text` - Text fallback mode

- **WebSocket Handlers** (updated in `backend/src/server.js`)
  - `audio_chunk` - Real-time audio streaming
  - `text_message` - Text fallback
  - `voice_session_init` - Session initialization
  - `voice_session_end` - Session termination
  - `interruption` - User interruption handling

### Frontend
- **Voice Interface Component** (`frontend/src/components/VoiceInterface.tsx`)
  - Voice session controls
  - Real-time audio capture (16kHz)
  - Audio playback (24kHz)
  - Visual audio feedback
  - Volume controls and mute
  - Text fallback input
  - Connection status monitoring
  - Latency metrics display

- **Audio Utilities** (`frontend/src/utils/audioUtils.ts`)
  - `AudioCapture` class for microphone input
  - `AudioPlayback` class for audio output
  - `AudioVisualizer` for visual feedback
  - Audio format conversion utilities

- **WebSocket Hook** (`frontend/src/hooks/useVoiceWebSocket.ts`)
  - Persistent WebSocket connection
  - Automatic reconnection
  - Message handling
  - Authentication
  - Error recovery

- **Updated Chat Page** (`frontend/src/pages/ChatPage.tsx`)
  - Integrated voice interface
  - Personality mode selector
  - Conversation history
  - Status indicators
  - Error handling

### Configuration
- **Voice Config** (`backend/voice_config.json`)
  - Big Snuggles character personality
  - Audio format specifications
  - Gemini API configuration
  - Session limits and timeouts
  - Performance tuning parameters

## Setup Instructions

### Prerequisites
1. Node.js 18+ installed
2. Google AI API key (get from https://aistudio.google.com/app/apikey)
3. Microphone access in browser
4. Modern browser with WebRTC support

### Backend Setup

1. **Install Dependencies**
   ```bash
   cd backend
   pnpm install
   ```

2. **Configure Environment**
   Edit `backend/.env` and add your Google AI API key:
   ```env
   GOOGLE_AI_API_KEY=your_api_key_here
   ```

3. **Start Backend Server**
   ```bash
   pnpm run dev
   ```
   Server will start on http://localhost:8000

### Frontend Setup

1. **Install Dependencies**
   ```bash
   cd frontend
   pnpm install
   ```

2. **Start Frontend Dev Server**
   ```bash
   pnpm run dev
   ```
   Frontend will start on http://localhost:5173

## Usage Guide

### Starting a Voice Session

1. **Navigate to Chat Page**
   - Log in to your account
   - Navigate to `/chat`

2. **Select Personality Mode**
   - Choose from 5 personality modes:
     - Gangster Mode (default)
     - Late Night
     - Conspiracy Hour
     - Playful Snuggles
     - Wild Card

3. **Create Voice Session**
   - Click "Start Voice Session"
   - Grant microphone permissions when prompted
   - Wait for status to show "Ready"

4. **Start Speaking**
   - Click "Start Speaking" button
   - Speak naturally into your microphone
   - Big Snuggles will respond with voice

5. **Control Voice Session**
   - "Stop Listening" - Pause voice input
   - "Mute" - Disable audio output
   - Volume slider - Adjust output volume
   - Text input - Fallback text communication

6. **End Session**
   - Click "End Session" when done
   - Session metrics will be saved

### Text Fallback Mode

If voice isn't working or preferred:
1. Use the text input field below the controls
2. Type your message
3. Press Enter or click "Send"
4. Big Snuggles will respond (with audio if available)

## Technical Specifications

### Audio Format
- **Input**: 16kHz PCM16, mono, 100ms chunks
- **Output**: 24kHz PCM16, mono
- **Buffer**: 500ms max buffer, 50ms jitter buffer

### Performance Targets
- **Latency**: <800ms target, <1500ms maximum
- **Session Duration**: 15 minutes max (Google API limit)
- **Reconnection**: Up to 5 automatic retry attempts

### API Message Protocol

#### Client → Server
```json
{
  "type": "audio_chunk",
  "data": "base64_encoded_audio"
}
```

```json
{
  "type": "text_message",
  "text": "User message"
}
```

#### Server → Client
```json
{
  "type": "audio_response",
  "data": "base64_encoded_audio",
  "latency": 750,
  "hasVoice": true
}
```

```json
{
  "type": "text_response",
  "text": "AI response",
  "audioData": "base64_encoded_audio"
}
```

## Troubleshooting

### Voice Not Working

1. **Check Microphone Permissions**
   - Browser should prompt for permission
   - Check browser settings if denied
   - Ensure microphone is not used by another app

2. **Check API Key**
   - Verify `GOOGLE_AI_API_KEY` is set in backend/.env
   - Test key validity at Google AI Studio
   - Check backend console for API errors

3. **Check WebSocket Connection**
   - Look for "Connected" status
   - Check browser console for errors
   - Verify backend server is running on port 8000

4. **Audio Issues**
   - Try different browsers (Chrome/Edge recommended)
   - Check system audio settings
   - Verify not muted or volume too low
   - Try text fallback mode

### High Latency

1. **Check Network Connection**
   - Stable internet required
   - Close bandwidth-heavy applications

2. **Reduce Audio Quality** (if needed)
   - Modify chunk size in voice_config.json
   - Adjust buffer settings

3. **Check Server Performance**
   - Monitor backend CPU/memory
   - Check Google API rate limits

### Session Errors

1. **"Session not found"**
   - Create new session via API
   - Check WebSocket is connected
   - Verify authentication token

2. **"Authentication failed"**
   - Log out and log back in
   - Check Supabase session validity
   - Clear browser cache/cookies

3. **"Max session duration"**
   - Sessions limited to 15 minutes
   - End session and create new one
   - This is a Google API limitation

## Database Schema

Voice sessions are tracked in existing tables:

### session_analytics
```sql
- session_id (unique)
- user_id
- session_type ('voice')
- personality_mode
- started_at
- ended_at
- duration_ms
- total_audio_sent
- total_audio_received
- average_latency_ms
- total_interruptions
- total_errors
- is_active
```

### conversations
```sql
- user_id
- session_id
- interaction_type ('audio' | 'text')
- input_size
- output_size
- latency_ms
- created_at
```

## Performance Monitoring

Monitor these metrics in real-time:

- **Latency**: Displayed in UI, target <800ms
- **Connection Status**: Green = good, Red = issues
- **Audio Quality**: Check for dropouts/distortion
- **Error Count**: Should remain at 0

## Next Steps (Phase 4)

- 3D avatar with React Three Fiber
- Lip-sync animation based on audio
- Facial expressions matching emotions
- Interactive 3D scene
- Avatar customization

## API Reference

See `/docs/API_DOCUMENTATION.md` for complete API details.

## Support

For issues:
1. Check browser console for errors
2. Review backend logs
3. Verify all environment variables are set
4. Test with text fallback mode first
5. Consult troubleshooting section above

## License

MIT License - see LICENSE file for details
