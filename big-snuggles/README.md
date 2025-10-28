# Big Snuggles Voice AI Platform

A real-time voice-first AI entertainment platform featuring "Big Snuggles," a gangster teddy bear character with emotional intelligence, persistent memory, and adaptive personality. Now with **real-time voice streaming powered by Google Gemini Live API**.

## Current Phase: Phase 3 Complete

- ✅ Phase 1: Architecture & Planning
- ✅ Phase 2: Core Application Scaffolding
- ✅ **Phase 3: Real-time Voice Interface (NEW)**
- 🔄 Phase 4: 3D Avatar Integration (Coming Next)
- ⏳ Phase 5-8: Advanced Features

## Project Structure

```
big-snuggles/
├── backend/          # Node.js/Express API gateway with voice service
├── frontend/         # React + TypeScript frontend with voice interface
├── supabase/         # Database migrations
└── docs/             # Architecture and API documentation
```

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS
- React Router
- Supabase Auth Client
- Lucide React (icons)
- Web Audio API (voice capture/playback)
- WebSocket client (real-time streaming)

### Backend
- Node.js + Express
- WebSocket (ws) for real-time audio
- Google Generative AI SDK (Gemini Live API)
- Supabase JavaScript Client
- RESTful API design
- Audio processing utilities

### Database & Auth
- Supabase PostgreSQL
- Row Level Security (RLS)
- Supabase Auth (email + OAuth)

### AI & Voice
- **Google Gemini 2.0 Flash** (Live API)
- Real-time bidirectional audio streaming
- Voice Activity Detection (VAD)
- Affective dialog for emotional prosody
- 16kHz input / 24kHz output
- Sub-800ms target latency

## Getting Started

### Prerequisites
- Node.js 18+ and pnpm
- Supabase account
- **Google AI API key** (get from https://aistudio.google.com/app/apikey)
- Modern browser with microphone support

### Installation

1. **Backend Setup:**
```bash
cd backend
pnpm install
cp .env.example .env
# Edit .env with your Supabase credentials AND Google AI API key
pnpm run dev
```

2. **Frontend Setup:**
```bash
cd frontend
pnpm install
cp .env.example .env
# Edit .env with your Supabase credentials
pnpm run dev
```

### Environment Variables

**Backend (.env):**
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GOOGLE_AI_API_KEY=your_google_ai_api_key
PORT=8000
NODE_ENV=development
```

**Frontend (.env):**
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:8000
```

## Features

### Phase 3 (Current) - Real-time Voice Interface
- **Real-time Voice Streaming**: Bidirectional audio with Google Gemini Live API
- **Voice Activity Detection**: Automatic speech detection and interruption handling
- **Audio Processing**: 16kHz input, 24kHz output with sub-800ms latency
- **5 Personality Modes**: Gangster, Late Night, Conspiracy Hour, Playful Snuggles, Wild Card
- **Visual Feedback**: Real-time audio visualization and status indicators
- **Text Fallback**: Seamless fallback to text when voice unavailable
- **Session Management**: 15-minute sessions with metrics tracking
- **Volume Controls**: Mute, volume adjustment, audio quality monitoring

### Phase 2 (Complete)
- User authentication (email/password + OAuth)
- Session management with persistent state
- Memory storage system with importance scoring
- Personality engine with behavioral rules
- Chat interface with WebSocket support
- RESTful API endpoints
- Database with Row Level Security (RLS)

### Coming Soon
- **Phase 4:** 3D avatar with React Three Fiber and lip-sync
- **Phase 5:** Advanced memory and relationship metrics
- **Phase 6:** Real-time synchronization and multi-device support
- **Phase 7:** Performance optimization and caching
- **Phase 8:** Monitoring, analytics, and deployment

## API Endpoints

### Authentication
- Uses Supabase Auth (handled by frontend SDK)

### Session Management
- `POST /api/session/create` - Create new conversation session
- `GET /api/session/:id` - Get session details
- `PUT /api/session/:id/state` - Update session state
- `POST /api/session/:id/message` - Add message to conversation
- `POST /api/session/:id/end` - End session

### Memory Management
- `GET /api/memory/:sessionId` - Get session memories
- `GET /api/memory/user/all` - Get all user memories
- `GET /api/memory/important` - Get important memories
- `POST /api/memory/:sessionId` - Store new memory
- `PUT /api/memory/:sessionId/:memoryId` - Update memory
- `DELETE /api/memory/:sessionId/:memoryId` - Delete memory

### Personality Engine
- `GET /api/personality/modes` - Get available personality modes
- `GET /api/personality/mode/:modeId` - Get mode details
- `GET /api/personality/state` - Get user's personality state
- `POST /api/personality/mode` - Set personality mode
- `PUT /api/personality/mood` - Update mood state
- `PUT /api/personality/preferences` - Update preferences

### Voice Interface (Phase 3)
- `POST /api/voice/session/create` - Create voice session
- `GET /api/voice/session/:id/status` - Get session status and metrics
- `POST /api/voice/session/:id/end` - End voice session
- `GET /api/voice/sessions` - List active user sessions
- `POST /api/voice/session/:id/text` - Send text message (fallback)

### WebSocket Events
- `auth` - Authenticate WebSocket connection
- `audio_chunk` - Send audio data (client → server)
- `text_message` - Send text message (client → server)
- `voice_session_init` - Initialize voice session
- `voice_session_end` - End voice session
- `audio_response` - Receive audio response (server → client)
- `text_response` - Receive text response (server → client)
- `interruption` - Handle user interruption
- `POST /api/voice/session/:id/end` - End voice session

## WebSocket Events

### Client → Server
- `auth` - Authenticate WebSocket connection
- `voice_chunk` - Send audio data (Phase 3)
- `session_init` - Initialize session
- `ping` - Heartbeat

### Server → Client
- `connected` - Connection established
- `auth_success` / `auth_error` - Authentication result
- `voice_chunk_ack` - Audio processing acknowledgment
- `session_init_success` - Session initialized
- `pong` - Heartbeat response

## Database Schema

### Tables
- `memory` - Conversation memories and context
- `conversations` - Message history
- `personality_state` - User personality preferences
- `session_analytics` - Performance metrics

All tables have Row Level Security (RLS) enabled.

## Development

### Backend Development
```bash
cd backend
pnpm run dev          # Start development server
pnpm run start        # Start production server
```

### Frontend Development
```bash
cd frontend
pnpm run dev          # Start development server (Vite)
pnpm run build        # Build for production
pnpm run preview      # Preview production build
```

## Architecture

See `/docs/architecture.md` for detailed technical architecture documentation.

## Personality Modes

1. **Late Night** - Mellow, philosophical, storytelling
2. **Conspiracy Hour** - Paranoid, information-seeking, secretive
3. **Gangster Mode** - Authoritative, street-smart, protective
4. **Playful Snuggles** - Soft, caring, innocent
5. **Wild Card** - Unpredictable, chaotic, boundary-pushing

## License

MIT

## Author

MiniMax Agent
