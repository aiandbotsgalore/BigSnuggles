# Component 4: Quick Testing & Setup Guide

## Quick Start (5 minutes)

### 1. Backend is Running
```bash
cd /workspace/big-snuggles/backend
# Already running on http://localhost:8000
```

### 2. Test API Endpoints
```bash
# Get all tiers
curl http://localhost:8000/api/subscription/tiers | jq .

# Expected: Returns Free, Premium, Pro tiers with features
```

### 3. Start Frontend
```bash
cd /workspace/big-snuggles/frontend
npm run dev
```

### 4. Test Pages (open in browser)

**Pricing Page**: http://localhost:5173/pricing
- Should see 3 pricing cards (Free, Premium, Pro)
- Monthly/Yearly toggle should work
- Premium shows "Most Popular" badge
- Features listed with check/X icons

**Subscription Dashboard**: http://localhost:5173/subscription (requires login)
- Shows current plan
- Displays usage quotas with progress bars
- "Manage Billing" and "Cancel Subscription" buttons

## Feature Testing (without Stripe keys)

### Test 1: Feature Gates
**What to test**: Free users cannot create rooms

1. Create a free user account
2. Try to access room creation
3. Should see "Premium" gate blocking the feature
4. Shows upgrade prompt

### Test 2: Quota Tracking
**What to test**: Clip generation quota

1. Generate clips until quota reached
2. At 80%: Orange warning banner
3. At 100%: Red error + blocked

### Test 3: Tier Display
**What to test**: Tier badges throughout UI

1. User profile should show tier badge
2. Premium features should have lock icons
3. Navigation shows upgrade link

## Stripe Integration (requires keys)

### Step 1: Get Stripe Keys
1. Go to: https://dashboard.stripe.com/test/apikeys
2. Copy **Publishable key** (starts with `pk_test_`)
3. Copy **Secret key** (starts with `sk_test_`)

### Step 2: Add to Environment
```bash
# Backend
echo 'STRIPE_SECRET_KEY=sk_test_YOUR_KEY' >> backend/.env
echo 'STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY' >> backend/.env

# Frontend  
echo 'VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY' >> frontend/.env
```

### Step 3: Restart Backend
```bash
# Stop current backend (Ctrl+C)
cd backend && npm start
```

### Step 4: Test Checkout Flow
1. Go to: http://localhost:5173/pricing
2. Click "Start 7-Day Trial" on Premium
3. Should redirect to Stripe checkout
4. Use test card: `4242 4242 4242 4242`
5. Any future expiry, any CVC
6. Complete payment
7. Should redirect to success page
8. Check database: subscription status = 'active'

## Test Cards (Stripe)

| Card Number | Result |
|------------|--------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Declined |
| 4000 0000 0000 9995 | Insufficient funds |
| 4000 0000 0000 3220 | 3D Secure required |

## Verification Checklist

### Backend
- [x] Server starts on port 8000
- [x] `/api/subscription/tiers` returns data
- [x] Feature gates integrated in rooms/clips routes
- [x] Subscription manager initialized
- [ ] Stripe checkout works (needs keys)

### Frontend
- [x] Pricing page displays 3 tiers
- [x] Subscription dashboard shows quotas
- [x] Success page configured
- [x] Feature gates block access
- [ ] Stripe checkout redirects (needs keys)

### Database
- [x] 4 tables exist (subscriptions, tier_features, usage_quotas, payment_history)
- [x] 3 tiers configured (Free, Premium, Pro)
- [x] RLS policies active

## Troubleshooting

### Issue: "STRIPE_SECRET_KEY not found" warning
**Solution**: Add Stripe keys to backend/.env (see Step 2 above)

### Issue: Pricing page shows empty
**Solution**: Check backend is running on port 8000

### Issue: Checkout button does nothing
**Solution**: Add VITE_STRIPE_PUBLISHABLE_KEY to frontend/.env

### Issue: "Cannot create room" error
**Solution**: This is correct for free users - upgrade to Premium

### Issue: Quota exceeded but haven't used feature
**Solution**: Reset quotas: `SELECT reset_monthly_quotas();`

## Next Steps After Testing

1. ✅ Verify all pages load correctly
2. ✅ Test feature gates with free user
3. ⏳ Add Stripe keys
4. ⏳ Test full checkout flow
5. ⏳ Configure webhook for production
6. ⏳ Deploy to production

## Production Deployment

### Before Deploying
1. Test full checkout flow locally
2. Verify webhook endpoint works
3. Test subscription cancellation
4. Check all feature gates

### Deploy Checklist
- [ ] Update FRONTEND_URL in backend/.env to production URL
- [ ] Deploy backend with Stripe keys
- [ ] Deploy frontend with VITE_STRIPE_PUBLISHABLE_KEY
- [ ] Configure Stripe webhook: `https://your-domain.com/api/subscription/webhook/stripe`
- [ ] Add STRIPE_WEBHOOK_SECRET to backend/.env
- [ ] Test production checkout with real test card
- [ ] Monitor Stripe dashboard for events

## Support

For issues or questions:
1. Check logs: `tail -f backend/logs/*.log`
2. Verify environment variables are set
3. Check Stripe dashboard for webhook events
4. Review database for subscription records

---

**Status**: Backend ✅ Complete | Frontend ✅ Complete | Stripe ⏳ Awaiting Keys
