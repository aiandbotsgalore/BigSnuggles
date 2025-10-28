# Component 4 Quick Setup Guide: Premium Tier System

## Overview

This guide provides step-by-step instructions to configure and test the Premium Tier System with Stripe integration.

**Estimated Setup Time:** 15 minutes

---

## Prerequisites

✅ Database migrations applied (migration `1761641570_create_subscription_system.sql`)  
✅ Backend and frontend code deployed  
✅ Stripe account created (free at https://stripe.com)

---

## Step 1: Get Stripe API Keys

### 1.1 Create Stripe Account

1. Go to https://stripe.com
2. Click "Sign Up" and create account
3. Complete business information (can skip for testing)

### 1.2 Get Test Mode Keys

1. Login to Stripe Dashboard
2. Ensure you're in **Test Mode** (toggle in top-right)
3. Navigate to **Developers → API keys**
4. Copy the following keys:
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (starts with `sk_test_...`) - Click "Reveal" first

---

## Step 2: Configure Backend

### 2.1 Add Environment Variables

Edit `backend/.env`:

```bash
# Existing Supabase keys
SUPABASE_URL=https://msuhlwamufbgftlcgzre.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Add these Stripe keys
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE  # Step 3
```

### 2.2 Restart Backend

```bash
cd backend
pnpm dev
```

**Verify:** Backend logs should show `✓ Stripe initialized successfully`

---

## Step 3: Setup Webhook (Local Testing)

### 3.1 Install Stripe CLI

**macOS:**
```bash
brew install stripe/stripe-cli/stripe
```

**Windows:**
```bash
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

**Linux:**
```bash
wget https://github.com/stripe/stripe-cli/releases/download/v1.19.4/stripe_1.19.4_linux_x86_64.tar.gz
tar -xvf stripe_1.19.4_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin
```

### 3.2 Login to Stripe CLI

```bash
stripe login
```

Follow browser prompt to authorize.

### 3.3 Forward Webhooks to Local Backend

```bash
stripe listen --forward-to localhost:8000/api/subscription/webhook
```

**Output:**
```
> Ready! Your webhook signing secret is whsec_abc123...
```

**Copy the `whsec_...` value** and add to `backend/.env`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_abc123...
```

**Restart backend** to apply webhook secret.

**Keep this terminal running** while testing.

---

## Step 4: Initialize Stripe Products

Products (Premium and Pro plans) are automatically created on first checkout. Alternatively, create them manually:

### Option A: Automatic (Recommended)

Products will be created when user first clicks "Start 7-Day Trial".

### Option B: Manual Creation

```bash
curl -X POST http://localhost:8000/api/subscription/ensure-products \
  -H "Content-Type: application/json"
```

**Verify in Stripe Dashboard:**
1. Go to **Products**
2. You should see:
   - "Big Snuggles Premium" - $9.99/month
   - "Big Snuggles Pro" - $19.99/month

---

## Step 5: Test Subscription Flow

### 5.1 Start Application

**Terminal 1 (Backend):**
```bash
cd backend
pnpm dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
pnpm dev
```

**Terminal 3 (Stripe Webhooks):**
```bash
stripe listen --forward-to localhost:8000/api/subscription/webhook
```

### 5.2 Create Test User

1. Open http://localhost:5173
2. Click "Sign Up"
3. Create test account:
   - Email: `test@example.com`
   - Password: `password123`

### 5.3 Access Pricing Page

1. Login with test account
2. Navigate to http://localhost:5173/pricing
3. View three tiers: Free, Premium, Pro

### 5.4 Test Premium Upgrade

1. Click **"Start 7-Day Trial"** on Premium tier
2. Redirected to Stripe Checkout page
3. Enter test card details:
   - **Card Number:** `4242 4242 4242 4242`
   - **Expiry:** Any future date (e.g., `12/25`)
   - **CVC:** Any 3 digits (e.g., `123`)
   - **Name:** Any name
   - **Email:** `test@example.com`
4. Click "Subscribe"
5. **Redirected to:** http://localhost:5173/subscription/success
6. Success page shows "Welcome to Premium!"

### 5.5 Verify Subscription

1. Navigate to http://localhost:5173/subscription
2. Verify:
   - ✅ Tier badge shows "Premium"
   - ✅ Next billing date displayed
   - ✅ Usage quotas updated:
     - 500 conversations per month
     - 50 clips per month
     - 5,000 memory entries

### 5.6 Check Database

```sql
SELECT * FROM subscriptions 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'test@example.com');
```

**Expected:**
```
tier: premium
status: active
stripe_customer_id: cus_...
stripe_subscription_id: sub_...
```

---

## Step 6: Test Feature Gates

### 6.1 Test Room Creation (Premium Required)

**As Free User:**
```bash
# Should fail with 403
curl -X POST http://localhost:8000/api/rooms/create \
  -H "Authorization: Bearer <free_user_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Room"}'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "This feature requires premium subscription",
  "code": "TIER_REQUIRED"
}
```

**As Premium User:**
```bash
# Should succeed
curl -X POST http://localhost:8000/api/rooms/create \
  -H "Authorization: Bearer <premium_user_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Room"}'
```

### 6.2 Test Quota Enforcement (Clips)

**Generate 50 clips** (Premium monthly limit):
```bash
for i in {1..50}; do
  curl -X POST http://localhost:8000/api/clips/create \
    -H "Authorization: Bearer <token>" \
    -H "Content-Type: application/json" \
    -d '{"conversationId": "test", "startTime": 0, "endTime": 10}'
done
```

**Attempt 51st clip:**
```bash
curl -X POST http://localhost:8000/api/clips/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"conversationId": "test", "startTime": 0, "endTime": 10}'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Monthly quota exceeded for clips",
  "code": "QUOTA_EXCEEDED",
  "usage": 50,
  "limit": 50
}
```

---

## Step 7: Test Subscription Management

### 7.1 Access Customer Portal

1. Login as Premium user
2. Go to http://localhost:5173/subscription
3. Click **"Manage Billing"**
4. Redirected to Stripe Customer Portal
5. Verify you can:
   - Update payment method
   - View invoices
   - Cancel subscription

### 7.2 Test Cancellation

1. In Customer Portal, click "Cancel subscription"
2. Confirm cancellation
3. Return to app at http://localhost:5173/subscription
4. Verify:
   - Status shows "Active (Cancels on [date])"
   - `cancel_at_period_end = true` in database

### 7.3 Test Webhook (Manual Trigger)

```bash
stripe trigger customer.subscription.deleted
```

**Check backend logs** for webhook processing message.

---

## Step 8: Production Setup (When Ready)

### 8.1 Get Production API Keys

1. In Stripe Dashboard, toggle to **Live Mode**
2. Navigate to **Developers → API keys**
3. Copy production keys (start with `pk_live_...` and `sk_live_...`)
4. Update production environment variables

### 8.2 Configure Production Webhook

1. Go to **Developers → Webhooks**
2. Click **"Add endpoint"**
3. Enter your production URL:
   ```
   https://yourdomain.com/api/subscription/webhook
   ```
4. Select events to listen to:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
5. Click "Add endpoint"
6. Copy **Signing secret** (starts with `whsec_...`)
7. Add to production environment:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### 8.3 Deploy and Test

1. Deploy backend with production Stripe keys
2. Test one full subscription flow with real card
3. Monitor Stripe Dashboard → Payments for confirmation
4. Check webhook logs in Stripe Dashboard → Webhooks

---

## Troubleshooting

### Issue: "Stripe not initialized"

**Cause:** Missing or invalid Stripe secret key.

**Fix:**
1. Verify `STRIPE_SECRET_KEY` in `.env`
2. Ensure key starts with `sk_test_` (test) or `sk_live_` (production)
3. Check for extra spaces or line breaks
4. Restart backend

### Issue: Webhook not firing

**Cause:** Stripe CLI not running or wrong port.

**Fix:**
1. Check Stripe CLI terminal is active
2. Verify forward URL matches backend port:
   ```bash
   stripe listen --forward-to localhost:8000/api/subscription/webhook
   ```
3. Check webhook secret in `.env` matches CLI output
4. Restart backend after updating webhook secret

### Issue: 404 on subscription routes

**Cause:** Routes not registered in server.js.

**Fix:**
1. Verify `server.js` includes:
   ```javascript
   import subscriptionRoutes from './routes/subscription.js';
   app.use('/api/subscription', subscriptionRoutes);
   ```
2. Check file path is correct
3. Restart backend

### Issue: Checkout button does nothing

**Cause:** Frontend network error or missing auth token.

**Fix:**
1. Open browser DevTools → Console
2. Check for error messages
3. Verify auth token exists: `localStorage.getItem('token')`
4. Check backend is running on port 8000
5. Verify CORS is enabled in backend

### Issue: Success page stuck on "Verifying..."

**Cause:** Webhook delay or database not updated.

**Fix:**
1. Check webhook processed successfully (Stripe CLI logs)
2. Increase delay in SubscriptionSuccessPage.tsx (currently 2 seconds)
3. Query database directly:
   ```sql
   SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 5;
   ```
4. If subscription exists, may be frontend caching issue (hard refresh)

### Issue: RLS policy error when querying subscriptions

**Cause:** Service role key not used or RLS policies missing.

**Fix:**
1. Backend should use `SUPABASE_SERVICE_ROLE_KEY` (not anon key)
2. Re-run migration to ensure RLS policies exist:
   ```bash
   psql $DATABASE_URL -f supabase/migrations/1761641570_create_subscription_system.sql
   ```

---

## Testing Checklist

Before considering setup complete, verify:

- [ ] Backend starts without Stripe errors
- [ ] Pricing page loads and displays three tiers
- [ ] Clicking "Start 7-Day Trial" redirects to Stripe
- [ ] Test card payment succeeds
- [ ] Webhook fires and logs in Stripe CLI terminal
- [ ] Database has subscription record with `status = 'active'`
- [ ] Success page shows confirmation
- [ ] Subscription dashboard shows Premium badge
- [ ] Usage quotas display correctly (500 conversations, 50 clips, 5000 memories)
- [ ] Free user cannot create rooms (403 error)
- [ ] Premium user can create rooms (200 success)
- [ ] Clip quota enforced after limit reached
- [ ] "Manage Billing" button opens Stripe portal
- [ ] Subscription cancellation works correctly

---

## Test Cards Reference

| Scenario | Card Number | Result |
|----------|-------------|---------|
| Success | 4242 4242 4242 4242 | Payment succeeds |
| Authentication Required | 4000 0027 6000 3184 | 3D Secure prompt |
| Declined | 4000 0000 0000 0002 | Payment fails |
| Insufficient Funds | 4000 0000 0000 9995 | Card declined |
| Lost Card | 4000 0000 0000 9987 | Card declined |

**Full List:** https://stripe.com/docs/testing

---

## Next Steps After Setup

1. **Customize Pricing:**
   - Adjust prices in `subscriptionManager.js` → `TIER_CONFIG`
   - Update display prices in `PricingPage.tsx`
   - Run `ensureStripeProducts()` to sync with Stripe

2. **Add Usage Notifications:**
   - Email users at 80% quota usage
   - Display in-app banner at 90% usage
   - Suggest upgrade when quota exceeded

3. **Implement Analytics:**
   - Track conversion rates (free → paid)
   - Monitor churn rate
   - Analyze quota utilization patterns

4. **Marketing Integration:**
   - Add exit-intent popup on pricing page
   - Implement referral program
   - Create email drip campaign for trial users

---

## Support Resources

- **Stripe Documentation:** https://stripe.com/docs
- **Stripe API Reference:** https://stripe.com/docs/api
- **Stripe CLI:** https://stripe.com/docs/stripe-cli
- **Test Mode Guide:** https://stripe.com/docs/testing
- **Webhook Guide:** https://stripe.com/docs/webhooks

**Questions?** Refer to the comprehensive documentation in `PHASE8_COMPONENT4_PREMIUM_TIER.md` or contact support.
