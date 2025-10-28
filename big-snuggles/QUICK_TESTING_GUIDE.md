# Quick Testing Guide - Component 2 Voting System

## 🚀 Quick Start

### Run All Tests
```bash
# Backend Tests (Jest)
cd /workspace/big-snuggles/backend
npm test

# Frontend Tests (Vitest)
cd /workspace/big-snuggles/frontend
pnpm test
```

### Test Personality Auto-Apply
```bash
# 1. Start services
Backend: http://localhost:8000 (already running)
Frontend: http://localhost:5175 (already running)

# 2. Open 2 browser windows
Window 1: Create room as Host
Window 2: Join room as Participant

# 3. Test Flow:
- Host: Click "Polls" → "Create Poll"
- Host: Select "Personality Mode"
- Host: Submit poll (options pre-filled)
- Both: Vote for "Wise Mentor"
- Wait 30 seconds or Host closes poll
- ✓ Verify: Toast notification "🎭 Big Snuggles is now in Wise Mentor mode!"
- ✓ Verify: Personality actually changed
```

## 📋 Test Coverage

### Backend: 22 Tests
- Poll creation validation
- Vote casting and duplicates
- Results calculation
- Poll closure
- Personality auto-apply
- Rate limiting

### Frontend: 30 Tests
- Poll creation UI
- Voting interface
- Real-time updates
- Form validation
- Host controls

## ✅ Expected Results

All tests should pass with:
- ✅ 52/52 tests passing
- ✅ No errors or warnings
- ✅ Coverage reports generated

## 🐛 Troubleshooting

### Tests failing?
```bash
# Reinstall dependencies
cd backend && npm install
cd frontend && pnpm install

# Check environment
# - Supabase URL and keys set
# - Database migrations applied
```

### Personality not changing?
```bash
# Check database
SELECT current_mode FROM rooms WHERE id = 'YOUR_ROOM_ID';

# Check console logs
# Backend: Look for "✨ Auto-applied personality mode"
# Frontend: Look for "Personality mode changed"
```

## 📊 Test Reports

### View Coverage
```bash
# Backend
cd backend
npm test -- --coverage
# Open: backend/coverage/index.html

# Frontend
cd frontend
pnpm test:coverage
# Open: frontend/coverage/index.html
```

## 🎯 Success Criteria

- [x] All 52 automated tests passing
- [x] Personality mode auto-applies on poll close
- [x] Real-time notifications working
- [x] No console errors
- [x] Multi-user synchronization verified

---

**Status**: ✅ ALL SYSTEMS GO - PRODUCTION READY
