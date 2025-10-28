# Deployment Guide - Big Snuggles Voice AI Platform

## Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Build successful (frontend and backend)
- [ ] WebSocket connections tested
- [ ] Authentication flow verified

## Backend Deployment (Railway)

### Option 1: Railway CLI

1. **Install Railway CLI:**
```bash
npm install -g @railway/cli
```

2. **Login to Railway:**
```bash
railway login
```

3. **Initialize Project:**
```bash
cd /workspace/big-snuggles/backend
railway init
```

4. **Set Environment Variables:**
```bash
railway variables set SUPABASE_URL="https://msuhlwamufbgftlcgzre.supabase.co"
railway variables set SUPABASE_ANON_KEY="your_anon_key"
railway variables set SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
railway variables set NODE_ENV="production"
railway variables set PORT="8000"
```

5. **Deploy:**
```bash
railway up
```

### Option 2: GitHub Integration

1. Push code to GitHub
2. Connect repository in Railway dashboard
3. Set environment variables in Railway dashboard
4. Railway will auto-deploy on push

### Configuration

Create `railway.toml`:
```toml
[build]
builder = "NIXPACKS"
buildCommand = "pnpm install"

[deploy]
startCommand = "node src/server.js"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

## Frontend Deployment (Vercel)

### Option 1: Vercel CLI

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Deploy:**
```bash
cd /workspace/big-snuggles/frontend
vercel
```

3. **Set Environment Variables:**
```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_API_BASE_URL production
```

4. **Deploy to Production:**
```bash
vercel --prod
```

### Option 2: GitHub Integration

1. Push code to GitHub
2. Import project in Vercel dashboard
3. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_BASE_URL` (your Railway backend URL)
4. Deploy

### Configuration

`vercel.json`:
```json
{
  "buildCommand": "pnpm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## Alternative Deployment Options

### Backend Alternatives

**Render:**
1. Connect GitHub repository
2. Select "Web Service"
3. Build Command: `pnpm install`
4. Start Command: `node src/server.js`
5. Set environment variables

**Heroku:**
```bash
heroku create big-snuggles-api
heroku config:set SUPABASE_URL="..."
heroku config:set SUPABASE_ANON_KEY="..."
heroku config:set SUPABASE_SERVICE_ROLE_KEY="..."
git push heroku main
```

### Frontend Alternatives

**Netlify:**
1. Connect GitHub repository
2. Build command: `pnpm run build`
3. Publish directory: `dist`
4. Set environment variables
5. Deploy

**Cloudflare Pages:**
1. Connect GitHub repository
2. Framework preset: Vite
3. Build command: `pnpm run build`
4. Build output directory: `dist`
5. Set environment variables

## Domain Configuration

### Custom Domain Setup

1. **Backend (Railway):**
   - Go to Railway dashboard → Settings
   - Add custom domain
   - Update DNS records (CNAME)

2. **Frontend (Vercel):**
   - Go to Vercel dashboard → Domains
   - Add custom domain
   - Update DNS records (A/CNAME)

3. **Update CORS:**
   Update backend `server.js`:
   ```javascript
   app.use(cors({
     origin: ['https://yourdomain.com'],
     credentials: true
   }));
   ```

## SSL/HTTPS

- Railway and Vercel provide automatic SSL certificates
- No additional configuration needed
- Ensure all API calls use HTTPS in production

## Monitoring & Logging

### Backend Monitoring

**Sentry (Error Tracking):**
```bash
pnpm add @sentry/node
```

```javascript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});
```

**Logging:**
- Use Railway's built-in logs
- Or integrate with services like Datadog, LogRocket

### Frontend Monitoring

**Sentry (Error Tracking):**
```bash
pnpm add @sentry/react
```

```javascript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  integrations: [new Sentry.BrowserTracing()]
});
```

## Performance Optimization

### Backend
- Enable gzip compression
- Implement caching (Redis)
- Rate limiting (already implemented)
- Database connection pooling

### Frontend
- Code splitting
- Lazy loading routes
- Image optimization
- CDN for static assets

## Security Checklist

- [ ] Environment variables secured
- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] SQL injection prevention (using Supabase RLS)
- [ ] XSS protection
- [ ] Secure WebSocket connections (WSS)

## Post-Deployment

1. **Test Production Environment:**
   - Sign up new user
   - Login
   - Create session
   - Test WebSocket connection
   - Verify database operations

2. **Monitor Performance:**
   - Check response times
   - Monitor error rates
   - Track user metrics
   - Database performance

3. **Set Up Alerts:**
   - Downtime alerts
   - Error rate thresholds
   - Performance degradation

## Rollback Strategy

### Backend
```bash
# Railway
railway rollback

# Or redeploy previous version
git revert HEAD
git push
```

### Frontend
```bash
# Vercel
vercel rollback

# Or redeploy previous commit
git revert HEAD
vercel --prod
```

## Scaling Considerations

### Horizontal Scaling
- Deploy multiple backend instances
- Load balancer configuration
- WebSocket sticky sessions

### Database Scaling
- Supabase handles scaling automatically
- Monitor connection pools
- Optimize queries

### CDN Integration
- Cloudflare for frontend assets
- Edge caching for API responses

## Cost Estimates

### Free Tier Options
- **Supabase:** Free tier (500MB database, 50,000 monthly active users)
- **Railway:** $5/month starter plan
- **Vercel:** Free tier (hobby projects)

### Production Estimates (100-1000 users)
- **Backend:** $10-20/month
- **Frontend:** Free-$20/month
- **Database:** $25/month
- **Total:** ~$35-65/month

## Support & Maintenance

### Regular Maintenance Tasks
- Update dependencies monthly
- Review security patches
- Monitor logs for errors
- Optimize database queries
- Backup database regularly (Supabase automatic backups)

### Incident Response
1. Check monitoring dashboards
2. Review error logs
3. Identify root cause
4. Deploy hotfix or rollback
5. Post-mortem documentation
