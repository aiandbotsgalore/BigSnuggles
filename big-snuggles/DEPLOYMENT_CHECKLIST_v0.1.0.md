# Big Snuggles v0.1.0 Deployment Checklist

## Pre-Deployment Verification

### ✅ Environment Setup
- [ ] Supabase project created and configured
- [ ] Google AI API key obtained and tested
- [ ] Node.js v18+ installed on server
- [ ] Environment variables configured
- [ ] SSL/TLS certificates ready (for production)
- [ ] Domain name configured (if applicable)

### ✅ Database Verification
- [ ] All 6 migrations applied successfully
- [ ] Tables created: `users`, `memory`, `conversations`, `personality_state`, `session_analytics`, `highlights`, `sentiment_analytics`, `memory_types`, `memory_associations`, `user_preferences`
- [ ] Row-Level Security (RLS) policies enabled
- [ ] Indexes created for performance
- [ ] Test data cleaned up
- [ ] Backup strategy configured

### ✅ Backend Verification
- [ ] Dependencies installed (`npm install`)
- [ ] Environment variables loaded correctly
- [ ] Server starts without errors
- [ ] WebSocket server functional on port 8000
- [ ] All API endpoints accessible
- [ ] Voice service connects to Gemini API
- [ ] Memory service reads/writes to database
- [ ] Authentication middleware working
- [ ] Error handling tested

### ✅ Frontend Verification
- [ ] Dependencies installed (`npm install`)
- [ ] Build completes successfully (`npm run build`)
- [ ] Environment variables configured
- [ ] API URLs point to backend server
- [ ] Supabase client configured correctly
- [ ] All pages render without errors
- [ ] Routing works correctly
- [ ] 3D avatar loads and animates
- [ ] Voice interface UI functional
- [ ] Text fallback system works

### ✅ Testing Completed
- [ ] Voice latency tests passed (<1000ms)
- [ ] Session recall accuracy tests passed (≥80%)
- [ ] Persona consistency logging verified
- [ ] Graceful text fallback tested
- [ ] Cross-browser compatibility verified
- [ ] Mobile responsiveness tested (basic)
- [ ] Error scenarios tested
- [ ] Load testing completed (if applicable)

### ✅ Security Checklist
- [ ] API keys stored securely (not in code)
- [ ] CORS configured correctly
- [ ] RLS policies tested and verified
- [ ] SQL injection prevention verified
- [ ] XSS protection enabled
- [ ] Rate limiting configured (recommended)
- [ ] Session security verified
- [ ] Sensitive data encrypted at rest
- [ ] HTTPS enforced (production)

### ✅ Performance Optimization
- [ ] Frontend bundle size optimized
- [ ] Images optimized/compressed
- [ ] Lazy loading implemented
- [ ] Code splitting enabled
- [ ] Database queries optimized
- [ ] Indexes added for frequent queries
- [ ] Caching strategy implemented
- [ ] CDN configured (if applicable)
- [ ] Monitoring/logging set up

## Deployment Steps

### Step 1: Database Setup
```bash
# Connect to Supabase project
# Run migrations in SQL Editor

# Verify tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

# Verify RLS policies
SELECT tablename, policyname FROM pg_policies;
```

### Step 2: Backend Deployment
```bash
# Navigate to backend directory
cd backend

# Install production dependencies
npm ci --production

# Set environment variables
export SUPABASE_URL="your_supabase_url"
export SUPABASE_ANON_KEY="your_anon_key"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
export GOOGLE_AI_API_KEY="your_google_ai_api_key"
export PORT=8000
export NODE_ENV=production

# Start server (use process manager in production)
# Option 1: PM2 (recommended)
pm2 start src/server.js --name big-snuggles-backend

# Option 2: systemd service
# Create systemd service file (see below)
```

### Step 3: Frontend Deployment
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm ci

# Build for production
npm run build

# Serve static files
# Option 1: Using serve
npx serve -s dist -p 5173

# Option 2: Nginx (recommended for production)
# Copy dist/ to nginx web root
# Configure nginx (see below)

# Option 3: Vercel/Netlify (easiest for preview)
# Deploy dist/ directory
```

### Step 4: Verification
```bash
# Test backend health
curl http://your-backend-url:8000/health

# Test WebSocket connection
# (Use wscat or browser DevTools)

# Test frontend loads
curl http://your-frontend-url/

# Test authentication flow
# (Manual testing via browser)

# Run automated tests
cd backend/src/tests
node phase7TestRunner.js
```

## Production Configuration Examples

### PM2 Ecosystem File
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'big-snuggles-backend',
    script: 'src/server.js',
    cwd: '/path/to/backend',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z'
  }]
};

// Start: pm2 start ecosystem.config.js
```

### Systemd Service File
```ini
# /etc/systemd/system/big-snuggles.service
[Unit]
Description=Big Snuggles Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/backend
Environment="NODE_ENV=production"
Environment="PORT=8000"
EnvironmentFile=/path/to/.env
ExecStart=/usr/bin/node src/server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target

# Enable and start:
# sudo systemctl enable big-snuggles
# sudo systemctl start big-snuggles
```

### Nginx Configuration
```nginx
# /etc/nginx/sites-available/big-snuggles
server {
    listen 80;
    server_name your-domain.com;

    # Frontend (static files)
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}

# HTTPS configuration (Let's Encrypt)
# sudo certbot --nginx -d your-domain.com
```

### Docker Compose (Optional)
```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
      - PORT=8000
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - GOOGLE_AI_API_KEY=${GOOGLE_AI_API_KEY}
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend
    restart: unless-stopped

# Run: docker-compose up -d
```

## Post-Deployment Verification

### Health Checks
```bash
# Backend health
curl http://your-domain/api/health

# Database connectivity
curl http://your-domain/api/memory?userId=test

# WebSocket
# Test via browser DevTools or wscat
```

### Monitoring Setup
- [ ] Error logging configured (e.g., Sentry, LogRocket)
- [ ] Performance monitoring enabled (e.g., New Relic, Datadog)
- [ ] Uptime monitoring configured (e.g., Uptime Robot, Pingdom)
- [ ] Analytics tracking set up
- [ ] Database monitoring enabled
- [ ] Server resource monitoring active

### Backup Strategy
- [ ] Database backups scheduled (Supabase auto-backup)
- [ ] Environment variables backed up securely
- [ ] Code repository backed up
- [ ] Disaster recovery plan documented

## Performance Optimization

### Backend Optimizations
```javascript
// Enable compression
import compression from 'compression';
app.use(compression());

// Enable CORS with specific origins
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

// Rate limiting
import rateLimit from 'express-rate-limit';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Request logging
import morgan from 'morgan';
app.use(morgan('combined'));
```

### Frontend Optimizations
```javascript
// Lazy load routes
const ChatPage = lazy(() => import('./pages/ChatPage'));
const PreferencesPage = lazy(() => import('./pages/UserPreferencesPage'));

// Code splitting
const AvatarEngine = lazy(() => import('./avatar/AvatarEngine'));

// Image optimization
// Use WebP format, lazy load images

// Service Worker (PWA)
// Enable for offline capabilities
```

### Database Optimizations
```sql
-- Add indexes for frequent queries
CREATE INDEX idx_memory_user_id ON memory(user_id);
CREATE INDEX idx_memory_importance ON memory(importance_score DESC);
CREATE INDEX idx_conversations_user_date ON conversations(user_id, created_at DESC);
CREATE INDEX idx_sentiment_conversation ON sentiment_analytics(conversation_id);

-- Optimize common queries
-- Use prepared statements
-- Enable connection pooling
```

## Rollback Plan

### If Deployment Fails
1. **Backend Issues**: 
   - Revert to previous PM2/systemd configuration
   - Restore previous environment variables
   - Check logs: `pm2 logs` or `journalctl -u big-snuggles`

2. **Frontend Issues**:
   - Serve previous build from backup
   - Check browser console for errors
   - Verify API endpoint URLs

3. **Database Issues**:
   - Supabase provides automatic backups
   - Restore from latest snapshot if needed
   - Verify migrations were applied correctly

4. **Complete Rollback**:
   ```bash
   # Stop services
   pm2 stop big-snuggles-backend
   
   # Restore previous version
   git checkout previous-tag
   
   # Rebuild and restart
   npm install
   npm run build
   pm2 restart big-snuggles-backend
   ```

## Support & Troubleshooting

### Common Issues
1. **WebSocket Connection Failed**:
   - Check firewall allows port 8000
   - Verify nginx proxy_pass configuration
   - Check CORS settings

2. **Voice Not Working**:
   - Verify GOOGLE_AI_API_KEY is set
   - Check browser microphone permissions
   - Test fallback to text mode

3. **3D Avatar Not Rendering**:
   - Check WebGL support in browser
   - Verify Three.js dependencies loaded
   - Check console for errors

4. **Authentication Failing**:
   - Verify Supabase credentials
   - Check RLS policies are enabled
   - Verify redirect URLs configured

### Debug Commands
```bash
# Check server status
pm2 status

# View logs
pm2 logs big-snuggles-backend

# Monitor resources
pm2 monit

# Check database connections
# (Supabase dashboard → Database → Connections)

# Test API endpoints
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

---

## ✅ Deployment Sign-Off

- [ ] All pre-deployment checks completed
- [ ] All deployment steps executed successfully
- [ ] All post-deployment verifications passed
- [ ] Monitoring and logging active
- [ ] Team notified of deployment
- [ ] Documentation updated
- [ ] Rollback plan tested and ready

**Deployed By**: _______________  
**Deployment Date**: _______________  
**Version**: v0.1.0  
**Environment**: _______________  

---

**Next Steps**: Monitor for 24 hours, gather user feedback, prepare for Phase 8 development
