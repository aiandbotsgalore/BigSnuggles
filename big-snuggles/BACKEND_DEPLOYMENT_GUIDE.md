# Big Snuggles Backend Deployment Guide

Your frontend is live at: **https://swktrtulitdq.space.minimax.io**

Now you need to deploy the backend to make the app fully functional. Here are 3 easy deployment options:

---

## Option 1: Render.com (Recommended - Free Tier Available)

### Steps:
1. **Sign up** at https://render.com (free account, no credit card required)

2. **Create New Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository (or upload the `/workspace/big-snuggles/backend` folder)
   - Or use "Deploy from Git" if you have the code in a repo

3. **Configure the service**:
   - **Name**: `big-snuggles-backend`
   - **Environment**: `Node`
   - **Region**: Choose closest to you
   - **Branch**: `main` (or your branch)
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`

4. **Add Environment Variables**:
   ```
   NODE_ENV=production
   PORT=8000
   SUPABASE_URL=<your-supabase-url>
   SUPABASE_ANON_KEY=<your-supabase-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
   GOOGLE_AI_API_KEY=<your-google-ai-api-key>
   SESSION_SECRET=<generate-a-strong-session-secret>
   STRIPE_SECRET_KEY=<your-stripe-secret-key>
   STRIPE_PUBLISHABLE_KEY=<your-stripe-publishable-key>
   FRONTEND_URL=https://swktrtulitdq.space.minimax.io
   ```

5. **Deploy**: Click "Create Web Service"
   - Render will build and deploy your backend
   - You'll get a URL like: `https://big-snuggles-backend.onrender.com`

6. **Update Frontend** (see below after getting backend URL)

---

## Option 2: Railway.app (Also Free Tier)

### Steps:
1. **Sign up** at https://railway.app

2. **Create New Project**:
   - Click "New Project" → "Deploy from GitHub repo"
   - Or upload the backend folder

3. **Configure**:
   - Railway auto-detects Node.js
   - Add environment variables (same as above in Option 1)

4. **Deploy**: Railway will provide a URL like: `https://your-app.up.railway.app`

5. **Update Frontend** (see below)

---

## Option 3: Fly.io (More Control, Free Tier)

### Steps:
1. Install Fly CLI: https://fly.io/docs/hands-on/install-flyctl/

2. **Login & Initialize**:
   ```bash
   cd /workspace/big-snuggles/backend
   flyctl auth login
   flyctl launch
   ```

3. **Configure**: Follow prompts, use provided settings

4. **Set Environment Variables**:
   ```bash
   flyctl secrets set SUPABASE_URL=<your-supabase-url>
   flyctl secrets set SUPABASE_ANON_KEY=<your-supabase-anon-key>
   flyctl secrets set SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
   flyctl secrets set GOOGLE_AI_API_KEY=<your-google-ai-api-key>
   # ... (add the remaining environment variables from the list above)
   ```

5. **Deploy**: `flyctl deploy`

---

## After Backend Deployment: Update Frontend

Once your backend is deployed and you have the URL (e.g., `https://big-snuggles-backend.onrender.com`):

### Update Frontend Environment Variables:

1. **Edit** `/workspace/big-snuggles/frontend/.env`:
   ```env
   VITE_API_BASE_URL=https://your-backend-url.com
   VITE_API_URL=https://your-backend-url.com
   VITE_BACKEND_URL=https://your-backend-url.com
   ```

2. **Rebuild and redeploy frontend**:
   ```bash
   cd /workspace/big-snuggles/frontend
   npm run build
   # Then use the deploy tool to redeploy
   ```

---

## Files Created for You:

- ✅ `Dockerfile` - For containerized deployment
- ✅ `render.yaml` - Configuration for Render.com
- ✅ `railway.json` - Configuration for Railway.app

---

## Testing Your Deployment:

Once backend is deployed, test these endpoints:

1. **Health Check**: `https://your-backend-url.com/health`
   - Should return: `{"status":"healthy",...}`

2. **Frontend Connection**: Open `https://swktrtulitdq.space.minimax.io`
   - Try signing up/logging in
   - Check browser console for any CORS errors

---

## Troubleshooting:

### CORS Errors:
- Backend CORS is already configured for your frontend URL
- If you see CORS errors, check that environment variables are set correctly on the hosting platform

### WebSocket Connection Failures:
- Ensure your hosting platform supports WebSocket connections
- Render.com free tier supports WebSockets ✅
- Railway supports WebSockets ✅

### Build Failures:
- Check that all environment variables are set
- Verify Node.js version is 18+ on hosting platform

---

## Quick Start (Recommended):

**Use Render.com** - it's the easiest and has a generous free tier:
1. Go to https://render.com
2. Sign up with GitHub
3. Click "New +" → "Web Service"
4. Connect repository or upload backend folder
5. Add environment variables from above
6. Deploy!

You'll have your backend live in ~5 minutes! 🚀
