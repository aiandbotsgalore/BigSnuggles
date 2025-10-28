# Phase 8 Deployment Guide
## Production Deployment Checklist for Big Snuggles v0.1.0

**Version**: 1.0  
**Date**: October 28, 2025  
**Scope**: Phase 8 Features (Multi-User Rooms, Voting System, Clip Generator, Premium Tier)

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Stripe Configuration](#stripe-configuration)
4. [Database Migrations](#database-migrations)
5. [Backend Deployment](#backend-deployment)
6. [Frontend Deployment](#frontend-deployment)
7. [FFmpeg Installation](#ffmpeg-installation)
8. [Supabase Storage Setup](#supabase-storage-setup)
9. [Testing in Production](#testing-in-production)
10. [Monitoring & Maintenance](#monitoring--maintenance)
11. [Troubleshooting](#troubleshooting)
12. [Rollback Strategy](#rollback-strategy)

---

## Pre-Deployment Checklist

### ✅ Core Infrastructure

- [ ] All Phase 8 migrations created and tested
  - [ ] `006_create_rooms_infrastructure.sql`
  - [ ] `007_create_voting_system.sql`
  - [ ] `008_create_clip_system.sql`
  - [ ] `1761641570_create_subscription_system.sql`

- [ ] Backend services implemented
  - [ ] RoomManager service (Socket.IO handlers)
  - [ ] VotingManager service
  - [ ] ClipGenerator service (FFmpeg integration)
  - [ ] SubscriptionManager service (Stripe integration)

- [ ] Frontend components complete
  - [ ] SpacesPage (multi-user rooms UI)
  - [ ] Voting UI (poll creation & participation)
  - [ ] ClipsPage (clip generation interface)
  - [ ] PricingPage (subscription tiers)
  - [ ] SubscriptionPage (billing management)

- [ ] Dependencies installed
  - [ ] Backend: `pnpm install` completed
  - [ ] Frontend: `pnpm install` completed
  - [ ] FFmpeg installed on deployment server

### ✅ Environment Variables

**Backend (.env):**
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App Configuration
NODE_ENV=production
PORT=8000
JWT_SECRET=your_jwt_secret
```

**Frontend (.env):**
```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# API
VITE_API_BASE_URL=https://your-backend-domain.com

# Stripe (Public Key Only)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### ✅ Security

- [ ] All API endpoints protected with authentication
- [ ] RLS (Row Level Security) policies applied to all new tables
- [ ] HTTPS enforced on all connections
- [ ] CORS configured for production domain
- [ ] Webhook signature verification enabled
- [ ] Environment variables secured (not in git)

---

## Environment Setup

### 1. Create Production Environment Files

**Backend Environment File:**
```bash
cd backend
cat > .env << 'EOF'
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe Live Keys (GET FROM STRIPE DASHBOARD)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Application
NODE_ENV=production
PORT=8000
JWT_SECRET=your_super_secure_jwt_secret_min_32_chars
EOF
```

**Frontend Environment File:**
```bash
cd frontend
cat > .env << 'EOF'
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# API
VITE_API_BASE_URL=https://your-backend-domain.com

# Stripe Public Key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
EOF
```

### 2. Verify Environment Variables

**Backend Test:**
```bash
cd backend
node -e "require('dotenv').config(); console.log('SUPABASE_URL:', !!process.env.SUPABASE_URL); console.log('STRIPE_SECRET_KEY:', !!process.env.STRIPE_SECRET_KEY); console.log('NODE_ENV:', process.env.NODE_ENV);"
```

**Frontend Test:**
```bash
cd frontend
node -e "require('dotenv').config(); console.log('VITE_SUPABASE_URL:', !!import.meta.env.VITE_SUPABASE_URL); console.log('VITE_STRIPE_PUBLISHABLE_KEY:', !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);"
```

---

## Stripe Configuration

### 1. Create Stripe Products (One-time setup)

**Script: `stripe-setup.js`**
```javascript
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

async function setupStripeProducts() {
  console.log('Creating Stripe products...');

  // Premium Tier
  const premium = await stripe.products.create({
    name: 'Big Snuggles Premium',
    description: '500 AI conversations, 50 clips/month, private rooms'
  });

  const premiumPrice = await stripe.prices.create({
    unit_amount: 999, // $9.99
    currency: 'usd',
    recurring: { interval: 'month' },
    product: premium.id,
  });

  // Pro Tier
  const pro = await stripe.products.create({
    name: 'Big Snuggles Pro',
    description: 'Unlimited conversations, 100 clips/month, analytics, API access'
  });

  const proPrice = await stripe.prices.create({
    unit_amount: 1999, // $19.99
    currency: 'usd',
    recurring: { interval: 'month' },
    product: pro.id,
  });

  console.log('Premium Product ID:', premium.id);
  console.log('Premium Price ID:', premiumPrice.id);
  console.log('Pro Product ID:', pro.id);
  console.log('Pro Price ID:', proPrice.id);

  return { premium, premiumPrice, pro, proPrice };
}

setupStripeProducts().catch(console.error);
```

**Run Setup:**
```bash
cd backend
node stripe-setup.js
```

**Save the Price IDs** for configuration:
- Premium Price ID: `price_...`
- Pro Price ID: `price_...`

### 2. Configure Webhooks

**Production Webhook Endpoint:**
```
https://your-backend-domain.com/api/subscription/webhook
```

**Required Events:**
- [ ] `checkout.session.completed`
- [ ] `customer.subscription.updated`
- [ ] `customer.subscription.deleted`
- [ ] `invoice.payment_succeeded`
- [ ] `invoice.payment_failed`

**Webhook Security:**
```javascript
// In server.js - webhook route MUST use raw body
app.post('/api/subscription/webhook', 
  express.raw({ type: 'application/json' }),
  subscriptionController.handleWebhook
);
```

**Test Webhooks (Stripe CLI):**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local backend
stripe listen --forward-to localhost:8000/api/subscription/webhook

# Test specific events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_succeeded
```

### 3. Tax Configuration (Optional but Recommended)

1. Go to Stripe Dashboard → Settings → Tax
2. Enable automatic tax calculation
3. Set your business address
4. Configure tax rates for different regions

---

## Database Migrations

### 1. Run All Phase 8 Migrations

```bash
# Apply migrations in order
cd supabase

# Migration 006 - Rooms Infrastructure
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres" -f migrations/006_create_rooms_infrastructure.sql

# Migration 007 - Voting System
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres" -f migrations/007_create_voting_system.sql

# Migration 008 - Clip System
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres" -f migrations/008_create_clip_system.sql

# Migration 1761641570 - Subscription System
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres" -f migrations/1761641570_create_subscription_system.sql
```

### 2. Verify Migrations

**Check Tables Created:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name IN (
    'rooms', 'room_participants', 'room_messages',
    'polls', 'poll_votes',
    'clips', 'clip_shares',
    'subscriptions', 'payment_history', 'usage_quotas', 'tier_features'
  )
ORDER BY table_name;
```

**Expected Result:**
```
clips
payment_history
polls
poll_votes
room_messages
room_participants
rooms
subscriptions
tier_features
usage_quotas
clip_shares
```

**Verify RLS Policies:**
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('rooms', 'polls', 'clips', 'subscriptions')
ORDER BY tablename, policyname;
```

### 3. Seed Tier Features

```sql
INSERT INTO tier_features (tier, features, display_name, price_monthly) VALUES
('free', '{
  "conversations_per_month": 50,
  "clips_per_month": 5,
  "memory_entries": 1000,
  "api_calls_per_day": 100,
  "room_creation": false,
  "priority_support": false,
  "analytics": false
}', 'Free Tier', 0),

('premium', '{
  "conversations_per_month": 500,
  "clips_per_month": 50,
  "memory_entries": 5000,
  "api_calls_per_day": 1000,
  "room_creation": true,
  "priority_support": true,
  "analytics": false
}', 'Premium', 999),

('pro', '{
  "conversations_per_month": -1,
  "clips_per_month": 100,
  "memory_entries": 10000,
  "api_calls_per_day": 5000,
  "room_creation": true,
  "priority_support": true,
  "analytics": true,
  "api_access": true
}', 'Pro', 1999)
ON CONFLICT (tier) DO UPDATE SET
  features = EXCLUDED.features,
  display_name = EXCLUDED.display_name,
  price_monthly = EXCLUDED.price_monthly;
```

---

## Backend Deployment

### Option 1: Railway Deployment

**1. Create Railway Project:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd backend
railway init

# Set environment variables
railway variables set SUPABASE_URL="https://your-project.supabase.co"
railway variables set SUPABASE_ANON_KEY="your_anon_key"
railway variables set SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
railway variables set STRIPE_SECRET_KEY="sk_live_..."
railway variables set STRIPE_PUBLISHABLE_KEY="pk_live_..."
railway variables set STRIPE_WEBHOOK_SECRET="whsec_..."
railway variables set NODE_ENV="production"
railway variables set PORT="8000"
railway variables set JWT_SECRET="your_jwt_secret"
```

**2. Configure `railway.toml`:**
```toml
[build]
builder = "NIXPACKS"
buildCommand = "pnpm install && pnpm run build"

[deploy]
startCommand = "node src/server.js"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[environments.production]
  NODE_ENV = "production"
```

**3. Deploy:**
```bash
railway up
```

**4. Configure Custom Domain:**
```bash
# In Railway Dashboard:
# 1. Go to Settings → Domains
# 2. Add custom domain
# 3. Update DNS records as instructed
```

**5. Enable WebSockets:**
```bash
# In Railway Dashboard:
# 1. Go to Settings → Networking
# 2. Enable WebSockets
```

### Option 2: Render Deployment

**1. Create Web Service:**
- Connect GitHub repository
- Select repository and backend folder
- Branch: `main`

**2. Configure Build & Deploy:**
```yaml
# Build Command
pnpm install && pnpm run build

# Start Command
node src/server.js

# Node Version
18
```

**3. Environment Variables (in Render Dashboard):**
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NODE_ENV=production
PORT=10000
JWT_SECRET=...
```

**4. Deploy:**
```bash
git push origin main
```

### Option 3: VPS Deployment

**1. Server Setup (Ubuntu 22.04):**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PM2
npm install -g pm2

# Install FFmpeg
sudo apt install ffmpeg -y
```

**2. Deploy Application:**
```bash
# Clone repository
git clone https://github.com/your-username/big-snuggles.git
cd big-snuggles/backend

# Install dependencies
pnpm install

# Create .env file (as shown above)

# Build application
pnpm run build

# Start with PM2
pm2 start src/server.js --name "big-snuggles-api"
pm2 save
pm2 startup
```

**3. Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Frontend Deployment

### Option 1: Vercel Deployment

**1. Install Vercel CLI:**
```bash
npm install -g vercel
```

**2. Deploy:**
```bash
cd frontend
vercel

# Configure project:
# ? Set up and deploy "~/big-snuggles/frontend"? [Y/n] y
# ? Which scope? (select your account)
# ? Link to existing project? [y/N] n
# ? What's your project's name? big-snuggles-frontend
# ? In which directory is your code located? ./
# ? Want to override the settings? [y/N] n
```

**3. Set Environment Variables:**
```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_API_BASE_URL production
vercel env add VITE_STRIPE_PUBLISHABLE_KEY production
```

**4. Deploy to Production:**
```bash
vercel --prod
```

**5. Configure Custom Domain:**
```bash
# In Vercel Dashboard:
# 1. Go to Settings → Domains
# 2. Add custom domain
# 3. Update DNS records
```

### Option 2: Netlify Deployment

**1. Build Settings:**
```bash
# Build Command
pnpm run build

# Publish Directory
dist

# Node Version
18
```

**2. Environment Variables (in Netlify Dashboard):**
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_API_BASE_URL=https://your-backend-domain.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**3. Deploy:**
```bash
git push origin main
```

### Option 3: VPS Deployment

**1. Build Application:**
```bash
cd frontend
pnpm install
pnpm run build
```

**2. Serve with Nginx:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/big-snuggles/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## FFmpeg Installation

**For VPS/Server Deployment:**

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg -y

# CentOS/RHEL
sudo yum install ffmpeg -y

# macOS
brew install ffmpeg

# Verify installation
ffmpeg -version
```

**Expected Output:**
```
ffmpeg version 5.1.7-0+deb12u1 Copyright (c) 2000-2024 the FFmpeg developers
...
```

**For Railway/Render:**
FFmpeg is pre-installed. Verify in deployment logs.

---

## Supabase Storage Setup

### 1. Create Clips Storage Bucket

**Method 1: Via Dashboard**
1. Go to Supabase Dashboard → Storage
2. Click "Create a new bucket"
3. Name: `clips`
4. Public: ✅ (Yes, make public)
5. File size limit: `104857600` (100MB)
6. Allowed MIME types:
   - `video/mp4`
   - `video/webm`
   - `audio/mpeg`
   - `image/jpeg`

**Method 2: Via SQL**
```sql
SELECT storage.create_bucket(
  'clips',
  public := true,
  allowed_mime_types := ARRAY['video/mp4', 'video/webm', 'audio/mpeg', 'image/jpeg'],
  file_size_limit := 104857600
);
```

### 2. Configure Storage Policies

```sql
-- Allow public access to view clips
CREATE POLICY "Public clips are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'clips');

-- Allow authenticated users to upload clips
CREATE POLICY "Authenticated users can upload clips"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'clips');

-- Allow users to delete their own clips
CREATE POLICY "Users can delete their own clips"
ON storage.objects FOR DELETE
TO authenticated
USING (auth.uid()::text = (storage.foldername(name))[1]);
```

### 3. Verify Storage Setup

```javascript
// Test upload
const { data, error } = await supabase.storage
  .from('clips')
  .upload('test/test.mp4', file);

if (error) {
  console.error('Storage error:', error);
} else {
  console.log('Upload successful:', data);
}
```

---

## Testing in Production

### 1. Backend API Tests

**Test Room Creation:**
```bash
curl -X POST https://your-backend.com/api/rooms/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Room", "max_participants": 10}'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "room_code": "XJ9K2M",
    "name": "Test Room",
    "host_user_id": "uuid",
    "max_participants": 10,
    "is_active": true
  }
}
```

**Test Subscription Checkout:**
```bash
curl -X POST https://your-backend.com/api/subscription/checkout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "premium",
    "successUrl": "https://yourdomain.com/subscription/success",
    "cancelUrl": "https://yourdomain.com/pricing"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "cs_live_...",
    "url": "https://checkout.stripe.com/pay/cs_live_..."
  }
}
```

### 2. Frontend E2E Tests

**Create Test Account:**
1. Go to https://yourdomain.com/signup
2. Create account with test email
3. Verify email (check logs)

**Test Room Creation Flow:**
1. Login
2. Navigate to `/spaces`
3. Click "Create Room"
4. Enter room details
5. Verify room created with code
6. Open incognito window
7. Join room with code
8. Test real-time messaging

**Test Voting System:**
1. As host, create a room
2. Click "Polls" button
3. Create poll (topic voting)
4. Join as second user
5. Verify poll appears
6. Cast vote
7. Verify real-time results

**Test Clip Generation:**
1. Start conversation in room
2. Navigate to `/clips`
3. Click "Auto-Detect Highlights"
4. Verify highlights detected
5. Generate clip
6. Check processing status
7. Download completed clip

**Test Subscription Flow:**
1. Go to `/pricing`
2. Click "Start 7-Day Trial" on Premium
3. Use test card: `4242 4242 4242 4242`
4. Complete checkout
5. Verify redirect to success page
6. Check subscription in `/subscription`

### 3. WebSocket Tests

**Test Socket.IO Connection:**
```javascript
// Open browser console
const socket = io('https://your-backend.com', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('room:authenticated', (data) => {
  console.log('Room auth success:', data);
});

// Join room
socket.emit('room:join', { roomCode: 'YOUR_CODE' });
```

**Expected Console Output:**
```
Connected: abc123
Room auth success: { roomId: '...', participants: [...] }
```

### 4. Performance Tests

**Load Test Room Creation:**
```bash
# Using Artillery.io
npm install -g artillery

cat > load-test.yml << 'EOF'
config:
  target: 'https://your-backend.com'
  phases:
    - duration: 60
      arrivalRate: 10
  defaults:
    headers:
      Authorization: 'Bearer YOUR_JWT_TOKEN'

scenarios:
  - name: "Create Room"
    flow:
      - post:
          url: "/api/rooms/create"
          json:
            name: "Load Test Room"
            max_participants: 10
      - think: 1
EOF

artillery run load-test.yml
```

**Expected Results:**
- Response time < 500ms
- Error rate < 1%
- No timeouts

---

## Monitoring & Maintenance

### 1. Application Monitoring

**Sentry Setup (Backend):**
```bash
cd backend
pnpm add @sentry/node @sentry/integrations
```

```javascript
// In server.js
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0
});
```

**Sentry Setup (Frontend):**
```bash
cd frontend
pnpm add @sentry/react @sentry/tracing
```

```javascript
// In main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0
});
```

### 2. Database Monitoring

**Key Metrics to Track:**
```sql
-- Active rooms count
SELECT COUNT(*) FROM rooms WHERE is_active = true;

-- Active subscriptions
SELECT tier, COUNT(*) FROM subscriptions WHERE status = 'active' GROUP BY tier;

-- Clips generated today
SELECT COUNT(*) FROM clips WHERE DATE(created_at) = CURRENT_DATE;

-- Polls created this week
SELECT COUNT(*) FROM polls WHERE created_at >= DATE_TRUNC('week', NOW());

-- Failed webhook events (last 24 hours)
SELECT COUNT(*) FROM payment_history WHERE status = 'failed' AND payment_date > NOW() - INTERVAL '24 hours';
```

**Monitor These Tables:**
- `clips` - Check for stuck processing (status = 'processing' for >30 minutes)
- `subscriptions` - Track cancellations and failed payments
- `usage_quotas` - Watch for users hitting limits

### 3. Log Monitoring

**Backend Logs to Watch:**
```
- Socket.IO connection errors
- Stripe webhook failures
- FFmpeg processing errors
- Database connection pool exhaustion
- Quota enforcement events
```

**Frontend Logs to Watch:**
- Authentication failures
- WebSocket connection issues
- Payment flow abandonment
- Error boundary activations

### 4. Automated Maintenance Tasks

**Create Cron Jobs:**

```bash
# Add to crontab (crontab -e)

# Clean up old rooms (inactive for 24 hours)
0 */6 * * * curl -X POST https://your-backend.com/api/admin/cleanup-rooms

# Clean up failed clip processing (stuck for 2 hours)
0 */4 * * * curl -X POST https://your-backend.com/api/admin/cleanup-clips

# Reset monthly quotas (run on 1st of month)
0 0 1 * * curl -X POST https://your-backend.com/api/admin/reset-quotas

# Archive old polls (older than 90 days)
0 0 * * 0 curl -X POST https://your-backend.com/api/admin/archive-polls
```

---

## Troubleshooting

### Common Issues

**Issue 1: Webhooks Not Firing**

**Symptoms:**
- Checkout succeeds but subscription not created
- No subscription record in database

**Diagnosis:**
```bash
# Check Stripe Dashboard → Developers → Webhooks
# Look for "Failed delivery attempts"

# Test webhook delivery
stripe events list --limit 10
```

**Solutions:**
1. Verify webhook endpoint URL is correct
2. Check webhook secret matches
3. Ensure webhook receives raw body (not JSON)
4. Test with Stripe CLI: `stripe listen --forward-to ...`

---

**Issue 2: Socket.IO Connection Fails**

**Symptoms:**
- Real-time updates not working
- "Connection refused" errors

**Diagnosis:**
```javascript
// Browser console
const socket = io('https://your-backend.com', {
  auth: { token: 'YOUR_TOKEN' }
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

**Solutions:**
1. Verify backend supports WebSockets (Railway/Render)
2. Check CORS allows frontend origin
3. Ensure port 8000 is accessible
4. Verify JWT token is valid

---

**Issue 3: FFmpeg Processing Fails**

**Symptoms:**
- Clips stuck in "processing" status
- Error: "ffmpeg: command not found"

**Diagnosis:**
```bash
# SSH into server
which ffmpeg
ffmpeg -version

# Check backend logs
pm2 logs big-snuggles-api
```

**Solutions:**
1. Install FFmpeg on server
2. For Railway/Render: Add buildpack or use container with FFmpeg
3. Verify PATH includes FFmpeg
4. Check file permissions

---

**Issue 4: Quotas Not Enforcing**

**Symptoms:**
- Users exceed limits without errors
- Feature gates bypassed

**Diagnosis:**
```sql
-- Check quota records
SELECT * FROM usage_quotas WHERE user_id = 'YOUR_UUID';

-- Check tier features
SELECT * FROM tier_features WHERE tier = 'premium';
```

**Solutions:**
1. Verify `checkQuota` middleware is registered
2. Ensure middleware order: auth → checkQuota → trackUsage → handler
3. Check `usage_quotas` table has records for users
4. Verify `tier_features` table has correct limits

---

**Issue 5: Stripe Test vs Live Mode**

**Symptoms:**
- Payments succeed in test but fail in production
- Webhook signature verification fails

**Diagnosis:**
```javascript
// Check Stripe mode
console.log('Stripe mode:', stripe.version); // Check if live keys
```

**Solutions:**
1. Use live Stripe keys in production
2. Test with live mode in Stripe Dashboard
3. Verify webhook secret matches (test vs live)
4. Don't mix test and live keys

---

### Emergency Procedures

**Issue: High Error Rate**

**Immediate Actions:**
1. Check monitoring dashboards (Sentry, logs)
2. Identify error pattern
3. Rollback to previous version if needed
4. Activate incident response team

**Rollback Command:**
```bash
# Railway
railway rollback

# Render
# Use deploy rollback in dashboard

# VPS
pm2 stop big-snuggles-api
git checkout previous-commit
pm2 start big-snuggles-api
```

---

**Issue: Database Performance**

**Immediate Actions:**
1. Check slow query log
2. Identify hotspots
3. Restart connection pools if needed
4. Scale up database temporarily

**Emergency Queries:**
```sql
-- Kill long-running queries
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '5 minutes';

-- Reset connection pools
SELECT pg_reload_conf();
```

---

## Rollback Strategy

### Automated Rollback

**Railway:**
```bash
# Rollback to previous deployment
railway rollback

# View rollback options
railway deployments
```

**Vercel:**
```bash
# Rollback to previous deployment
vercel rollback [deployment-url]

# Or use dashboard
# Go to Deployments → Select previous → Click "Promote to Production"
```

### Manual Rollback

**Steps:**
1. Identify last known good commit: `git log --oneline`
2. Rollback code: `git checkout <commit-hash>`
3. Redeploy:
   - Railway: `railway up`
   - Vercel: `vercel --prod`
   - VPS: `git pull && pm2 restart big-snuggles-api`

### Database Rollback

**If migrations need rollback:**

```sql
-- DANGER: Only for emergency recovery
-- This will lose data!

-- Drop tables in reverse order
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS payment_history CASCADE;
DROP TABLE IF EXISTS usage_quotas CASCADE;
DROP TABLE IF EXISTS tier_features CASCADE;

DROP TABLE IF EXISTS clips CASCADE;
DROP TABLE IF EXISTS clip_shares CASCADE;

DROP TABLE IF EXISTS polls CASCADE;
DROP TABLE IF EXISTS poll_votes CASCADE;

DROP TABLE IF EXISTS room_messages CASCADE;
DROP TABLE IF EXISTS room_participants CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
```

**Warning:** Only use in emergency. Data will be lost.

---

## Success Metrics

### Technical KPIs

- [ ] Uptime: >99.9%
- [ ] API Response Time: <500ms (95th percentile)
- [ ] WebSocket Connection Rate: >99%
- [ ] Database Query Time: <100ms average
- [ ] Error Rate: <0.1%

### Business KPIs

- [ ] Subscription Conversion Rate: 5-10%
- [ ] Feature Adoption:
  - Rooms: 30% of active users
  - Voting: 15% of room participants
  - Clips: 20% of premium users

### User Experience KPIs

- [ ] Room Creation Success Rate: >98%
- [ ] Payment Completion Rate: >90%
- [ ] WebSocket Reconnection Rate: >95%
- [ ] Clip Generation Success Rate: >95%

---

## Post-Deployment Checklist

### Day 1

- [ ] All endpoints responding
- [ ] Real-time features working
- [ ] Payment flow tested
- [ ] Webhooks firing correctly
- [ ] Monitoring alerts configured
- [ ] Error rates within limits

### Day 7

- [ ] Performance metrics stable
- [ ] User feedback collected
- [ ] Bug reports triaged
- [ ] Feature usage analytics reviewed
- [ ] Subscription metrics tracked

### Day 30

- [ ] Conversion rate analyzed
- [ ] Churn rate measured
- [ ] Support ticket review
- [ ] Feature optimization planned
- [ ] Capacity planning updated

---

## Contact & Support

**Technical Support:**
- Backend Issues: Check PM2 logs, Railway/Render logs
- Database Issues: Check Supabase dashboard
- Payment Issues: Check Stripe Dashboard → Logs
- Real-time Issues: Check Socket.IO namespace logs

**Incident Response:**
1. Acknowledge incident (within 5 minutes)
2. Assess severity (P0-P3)
3. Activate response team
4. Implement fix or rollback
5. Post-mortem within 48 hours

**Emergency Contacts:**
- Backend Team: [Your Contact]
- DevOps Team: [Your Contact]
- Product Team: [Your Contact]

---

## Appendix

### A. Useful Commands

**Backend:**
```bash
# View logs
pm2 logs big-snuggles-api

# Restart
pm2 restart big-snuggles-api

# Monitor resources
pm2 monit

# Check environment
node -e "console.log(process.env)"
```

**Frontend:**
```bash
# Build locally
pnpm run build

# Preview production build
pnpm run preview
```

**Database:**
```bash
# Connect to Supabase
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres"

# Check active connections
SELECT count(*) FROM pg_stat_activity;

# View table sizes
SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
FROM pg_tables 
WHERE schemaname = 'public';
```

### B. Configuration Files

**Sample `vercel.json`:**
```json
{
  "buildCommand": "pnpm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store" }
      ]
    }
  ]
}
```

**Sample `railway.toml`:**
```toml
[build]
builder = "NIXPACKS"
buildCommand = "pnpm install && pnpm run build"

[deploy]
startCommand = "node src/server.js"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[environments.production]
  NODE_ENV = "production"
```

---

**Deployment Complete!** 🎉

For support or questions, refer to the troubleshooting section or contact the development team.
