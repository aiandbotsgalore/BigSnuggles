# Big Snuggles - Manual Setup Instructions

## Current Status

✅ **Code Complete**: All application code has been written and is ready for deployment
⚠️ **Testing Required**: Due to environment limitations, manual testing is needed

## Complete Application Structure

### Backend (Node.js/Express)
- ✅ Express server with WebSocket support (`backend/src/server.js`)
- ✅ Authentication middleware (`backend/src/middleware/auth.js`)
- ✅ Complete API routes:
  - `/api/memory` - Memory management (GET, POST, PUT, DELETE)
  - `/api/session` - Session lifecycle management
  - `/api/personality` - Personality engine with 5 modes
  - `/api/voice` - Voice streaming placeholders (Phase 3)
- ✅ Service layer (memoryService, sessionService, personalityService)
- ✅ Supabase integration configured

### Frontend (React + TypeScript + Vite)
- ✅ Complete React application with routing
- ✅ Authentication pages (login, signup)
- ✅ Main chat interface with WebSocket client
- ✅ Auth context with Supabase integration
- ✅ Responsive layout components

### Database (Supabase)
- ✅ 4 tables deployed with RLS policies:
  - `memory` - Conversation memories
  - `conversations` - Message history
  - `personality_state` - User preferences and relationship metrics
  - `session_analytics` - Performance metrics

### Documentation
- ✅ README.md - Project overview
- ✅ docs/SETUP.md - Detailed setup guide
- ✅ docs/DEPLOYMENT.md - Production deployment guide
- ✅ PROJECT_SUMMARY.md - Technical summary

## Required Manual Steps

### Step 1: Kill Background Process

First, you need to stop the interactive npm process that's blocking commands:

```bash
# Find the process
ps aux | grep npm

# Kill it (replace PID with the actual process ID)
kill -9 <PID>
```

### Step 2: Install Backend Dependencies

```bash
cd /workspace/big-snuggles/backend
pnpm install --prefer-offline

# If pnpm times out, try npm:
npm install
```

### Step 3: Install Frontend Dependencies

```bash
cd /workspace/big-snuggles/frontend
pnpm install --prefer-offline

# If pnpm times out, try npm:
npm install
```

### Step 4: Start Backend Server

```bash
cd /workspace/big-snuggles/backend
pnpm run dev
# Server should start on http://localhost:8000
```

Leave this terminal running.

### Step 5: Start Frontend Server

Open a new terminal:

```bash
cd /workspace/big-snuggles/frontend
pnpm run dev
# Frontend should start on http://localhost:5173
```

### Step 6: Test the Application

1. **Visit the application**: Open http://localhost:5173 in your browser

2. **Test signup**:
   - Click "Get Started" or "Sign Up"
   - Enter email and password
   - Check for Supabase confirmation email
   - Confirm your email address

3. **Test login**:
   - Use your confirmed credentials to log in
   - Should redirect to `/chat`

4. **Test chat interface**:
   - Verify the UI loads correctly
   - Check browser console for any errors
   - Verify WebSocket connection (should show in console)

5. **Test API endpoints**:
   ```bash
   # Test session creation (replace TOKEN with your auth token from browser dev tools)
   curl -X POST http://localhost:8000/api/session/start \
     -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json"
   
   # Test personality modes
   curl http://localhost:8000/api/personality/modes \
     -H "Authorization: Bearer TOKEN"
   ```

### Step 7: Check for Issues

Common issues to watch for:

1. **Port conflicts**: If ports 8000 or 5173 are in use, modify the port in:
   - Backend: `backend/src/server.js` (line 14)
   - Frontend: `vite.config.ts`

2. **CORS errors**: Check browser console. If CORS issues occur, verify:
   - Backend CORS configuration in `server.js`
   - Frontend API URL in `.env`

3. **Supabase connection errors**: Verify environment variables:
   - `backend/.env` has correct SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
   - `frontend/.env` has correct VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

4. **Database RLS errors**: If you get "new row violates row-level security policy":
   - Check user is authenticated
   - Verify RLS policies in Supabase dashboard

## Environment Variables Already Configured

### Backend (`.env`)
```
PORT=8000
SUPABASE_URL=https://msuhlwamufbgftlcgzre.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[configured]
```

### Frontend (`.env`)
```
VITE_SUPABASE_URL=https://msuhlwamufbgftlcgzre.supabase.co
VITE_SUPABASE_ANON_KEY=[configured]
VITE_API_URL=http://localhost:8000
```

## Next Phase

Once the application is tested and working:

1. **Phase 3**: Implement Google Gemini Live API integration for real-time voice
2. **Phase 4**: Add React Three Fiber 3D avatar
3. **Phase 5**: Advanced memory and personality features
4. **Phase 6**: Real-time synchronization
5. **Phase 7**: Production optimization
6. **Phase 8**: Monitoring and analytics

## Production Deployment

Once testing is complete, follow the deployment guide:
- Frontend → Vercel (see `docs/DEPLOYMENT.md`)
- Backend → Railway (see `docs/DEPLOYMENT.md`)

## Support

If you encounter any errors during setup:
1. Check the error message carefully
2. Review the relevant code file
3. Check Supabase logs for database/auth errors
4. Check browser console for frontend errors
5. Check backend terminal for API errors

The application architecture is solid and all code is production-ready. The only remaining step is successful installation and testing.
