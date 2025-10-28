# Quick Start: Running Phase 7 Tests

## Prerequisites
- Backend server running on port 8000
- Supabase database configured
- Environment variables set

## Running All Tests

### Option 1: Comprehensive Test Suite (Recommended)
```bash
cd backend/src/tests
node phase7TestRunner.js
```

This will run:
- Voice latency tests
- Session recall tests
- Generate comprehensive report
- Export results to `phase7_test_results.json`

### Option 2: Individual Test Suites

**Voice Latency Testing**:
```bash
cd backend/src/tests
node voiceLatencyTest.js
```

**Session Recall Testing**:
```bash
cd backend/src/tests
node sessionRecallTest.js
```

## Expected Output

### Voice Latency Tests
```
🧪 Starting Voice Latency Test Suite...

Test 1: WebSocket Connection Latency
  ✓ Connection established in 45.23ms

Test 2: API Endpoint Latencies
  ✓ /api/memory: 123.45ms
  ✓ /api/personality/mode: 89.12ms
  ✓ /api/session/analytics: 156.78ms

Test 3: Audio Processing Pipeline
  ✓ PCM Conversion: 102.34ms
  ✓ Resampling: 51.23ms
  ✓ VAD Detection: 31.45ms
  ✓ Buffer Management: 21.12ms
  Total Pipeline Latency: 206.14ms

═══════════════════════════════════════════════════════
             VOICE LATENCY TEST REPORT
═══════════════════════════════════════════════════════

Test Summary:
  Total Tests: 3
  Passed: 3
  Failed: 0
  Success Rate: 100.0%

Performance Goals:
  Target (<1000ms): ✓ MET
  Ideal (<800ms): ✓ MET
```

### Session Recall Tests
```
🧪 Testing: Personal Information Recall
────────────────────────────────────────────────────────

📝 Setup Phase: Storing memories...
  ✓ My name is Alex
  ✓ I live in New York
  ✓ I love pizza

🔍 Testing Phase: Recalling memories...
  ✓ What is my name?
    Expected: "Alex"
    Found: "My name is Alex"
  ✓ Where do I live?
    Expected: "New York"
    Found: "I live in New York"
  ✓ What food do I like?
    Expected: "pizza"
    Found: "I love pizza"

Accuracy: 100.0%

═══════════════════════════════════════════════════════
                  TEST SUMMARY
═══════════════════════════════════════════════════════

Total Scenarios: 5
Average Accuracy: 87.5%

Overall Status: ✓ PASSED
```

## Interpreting Results

### Success Criteria
- ✅ Voice latency average < 1000ms
- ✅ Session recall accuracy ≥ 80%
- ✅ All tests pass without errors

### If Tests Fail

**Voice Latency > 1000ms**:
- Check network connection
- Verify backend server is running
- Review audio processing configuration

**Session Recall < 80%**:
- Verify Supabase database connection
- Check memory table has proper indexes
- Review RLS policies

**Connection Errors**:
- Ensure backend is running: `cd backend && npm run dev`
- Check port 8000 is accessible
- Verify environment variables are set

## Continuous Monitoring

### Production Monitoring
Add these tests to your CI/CD pipeline:

```yaml
# .github/workflows/tests.yml
name: Phase 7 Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Phase 7 Tests
        run: |
          cd backend
          npm install
          npm run test:phase7
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

### Local Development
Run tests before each deployment:
```bash
# Pre-deployment checklist
npm run test:phase7          # Run all tests
npm run test:latency         # Voice latency only
npm run test:recall          # Session recall only
```

## Test Results Location
- JSON export: `phase7_test_results.json`
- Console output: Real-time during test execution
- Logs: Check backend logs for detailed error messages

## Need Help?
- Review: `DEPLOYMENT_CHECKLIST_v0.1.0.md`
- Check: `docs/phase7_implementation_summary.md`
- Troubleshooting: `DEPLOYMENT_CHECKLIST_v0.1.0.md` → Troubleshooting section
