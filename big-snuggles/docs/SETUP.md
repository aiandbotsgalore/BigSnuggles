# Big Snuggles Voice AI Platform - Setup Guide

## Quick Start

### 1. Install Dependencies

**Backend:**
```bash
cd /workspace/big-snuggles/backend
pnpm install --prefer-offline
```

**Frontend:**
```bash
cd /workspace/big-snuggles/frontend
pnpm install --prefer-offline
```

### 2. Environment Setup

Environment variables are already configured in `.env` files with Supabase credentials.

**Backend** (`/workspace/big-snuggles/backend/.env`):
- SUPABASE_URL: https://msuhlwamufbgftlcgzre.supabase.co
- SUPABASE_ANON_KEY: [configured]
- SUPABASE_SERVICE_ROLE_KEY: [configured]
- PORT: 8000

**Frontend** (`/workspace/big-snuggles/frontend/.env`):
- VITE_SUPABASE_URL: https://msuhlwamufbgftlcgzre.supabase.co
- VITE_SUPABASE_ANON_KEY: [configured]
- VITE_API_BASE_URL: http://localhost:8000

### 3. Database Schema

Database tables have been created in Supabase:
- `memory` - Conversation memories
- `conversations` - Message history
- `personality_state` - User personality preferences
- `session_analytics` - Performance metrics

All tables have Row Level Security (RLS) enabled.

### 4. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd /workspace/big-snuggles/backend
pnpm run dev
```
Backend will run on http://localhost:8000

**Terminal 2 - Frontend:**
```bash
cd /workspace/big-snuggles/frontend
pnpm run dev
```
Frontend will run on http://localhost:5173

### 5. Test the Application

1. Open http://localhost:5173
2. Click "Sign Up" to create an account
3. Log in with your credentials
4. Start a chat session with Big Snuggles

## Development Workflow

### Backend Development
- Main server: `backend/src/server.js`
- Routes: `backend/src/routes/`
- Services: `backend/src/services/`
- Middleware: `backend/src/middleware/`

### Frontend Development
- Main app: `frontend/src/App.tsx`
- Pages: `frontend/src/pages/`
- Components: `frontend/src/components/`
- Contexts: `frontend/src/contexts/`

## API Testing

Test API endpoints with curl:

```bash
# Health check
curl http://localhost:8000/health

# Create session (requires auth token)
curl -X POST http://localhost:8000/api/session/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Get personality modes
curl http://localhost:8000/api/personality/modes
```

## WebSocket Testing

Connect to WebSocket:
```javascript
const ws = new WebSocket('ws://localhost:8000');

// Authenticate
ws.send(JSON.stringify({
  type: 'auth',
  token: 'YOUR_ACCESS_TOKEN'
}));

// Ping
ws.send(JSON.stringify({ type: 'ping' }));
```

## Next Steps (Phase 3)

1. Obtain Google Gemini API key
2. Integrate Google Gemini Live API for voice processing
3. Implement real-time audio streaming
4. Add voice activity detection
5. Implement lip-sync data extraction

## Troubleshooting

### Backend Issues
- Check if port 8000 is available
- Verify Supabase credentials in `.env`
- Check server logs for errors

### Frontend Issues
- Clear browser cache and reload
- Check browser console for errors
- Verify backend is running
- Check network tab for failed API calls

### Database Issues
- Verify Supabase project is active
- Check RLS policies are correctly set
- Verify user has proper permissions

## Production Deployment

### Backend
- Deploy to Railway, Render, or similar Node.js hosting
- Set environment variables
- Enable HTTPS
- Configure CORS for production domain

### Frontend
- Build: `pnpm run build`
- Deploy dist folder to Vercel, Netlify, or similar
- Set production environment variables
- Update API_BASE_URL to production backend URL

## Support

For issues or questions, refer to:
- `/docs/architecture.md` - Technical architecture
- `/README.md` - Project overview
- Supabase documentation: https://supabase.com/docs
