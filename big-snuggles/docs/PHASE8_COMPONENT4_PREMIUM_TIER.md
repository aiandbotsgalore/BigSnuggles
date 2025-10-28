# Phase 8 Component 4: Premium Tier System with Stripe Integration

## Overview

The Premium Tier System introduces a monetization layer to Big Snuggles, enabling subscription-based revenue through Stripe payment processing. Users can upgrade from the free tier to Premium or Pro tiers to unlock enhanced features, higher quotas, and priority support.

**Implementation Date**: October 28, 2025  
**Status**: ✅ Complete (Backend + Frontend)  
**Integration Status**: Requires Stripe API keys for full functionality

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
├─────────────────────────────────────────────────────────────┤
│  ├─ PricingPage.tsx         (Tier comparison & CTA)         │
│  ├─ SubscriptionPage.tsx    (Dashboard & management)        │
│  ├─ SubscriptionSuccessPage (Post-checkout confirmation)    │
│  └─ PremiumGate.tsx         (Feature access control)        │
└─────────────────────────────────────────────────────────────┘
                              ↓ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                   Backend API (Express)                      │
├─────────────────────────────────────────────────────────────┤
│  ├─ subscription.js         (REST endpoints)                │
│  ├─ featureGates.js         (Middleware: quota enforcement) │
│  └─ subscriptionManager.js  (Business logic)                │
└─────────────────────────────────────────────────────────────┘
                    ↓                        ↓
        ┌───────────────────┐    ┌─────────────────────┐
        │  Supabase (DB)    │    │   Stripe API        │
        ├───────────────────┤    ├─────────────────────┤
        │ • subscriptions   │    │ • Customers         │
        │ • payment_history │    │ • Subscriptions     │
        │ • usage_quotas    │    │ • Checkout Sessions │
        │ • tier_features   │    │ • Webhooks          │
        └───────────────────┘    └─────────────────────┘
```

### Data Flow

**Subscription Creation Flow:**
1. User clicks "Start 7-Day Trial" on PricingPage
2. Frontend calls `POST /api/subscription/checkout` with tier
3. Backend creates Stripe Customer (if new) and Checkout Session
4. User redirected to Stripe-hosted payment page
5. User completes payment on Stripe
6. Stripe webhook fires `checkout.session.completed`
7. Backend creates subscription record in database
8. User redirected to `/subscription/success`
9. Frontend verifies subscription and shows confirmation

**Quota Enforcement Flow:**
1. User attempts protected action (create room, generate clip, store memory)
2. Request passes through `checkQuota(feature)` middleware
3. Middleware queries `usage_quotas` table for current usage
4. Compares usage against tier limit from `tier_features`
5. If quota exceeded, returns 403 error
6. If within quota, passes to `trackUsage(feature)` middleware
7. trackUsage increments usage counter
8. Request proceeds to actual handler

---

## Database Schema

### `subscriptions` Table

Stores active and historical subscription records.

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('free', 'premium', 'pro')),
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  stripe_price_id VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE UNIQUE INDEX idx_subscriptions_user_active ON subscriptions(user_id) 
  WHERE status = 'active';
```

**Columns:**
- `tier`: Subscription level (free, premium, pro)
- `stripe_customer_id`: Stripe customer reference
- `stripe_subscription_id`: Stripe subscription reference
- `status`: Current subscription state
- `current_period_start/end`: Billing cycle dates
- `cancel_at_period_end`: True if cancellation scheduled

**RLS Policies:**
- Users can SELECT their own subscriptions
- System (service_role) can INSERT/UPDATE

### `payment_history` Table

Tracks all payment transactions for audit and display.

```sql
CREATE TABLE payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  stripe_invoice_id VARCHAR(255),
  amount_paid INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',
  status VARCHAR(20) NOT NULL CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_history_user ON payment_history(user_id);
CREATE INDEX idx_payment_history_subscription ON payment_history(subscription_id);
```

**Columns:**
- `amount_paid`: Amount in cents (e.g., 999 = $9.99)
- `currency`: Currency code (usd, eur, etc.)
- `status`: Payment outcome

### `usage_quotas` Table

Tracks feature usage for quota enforcement.

```sql
CREATE TABLE usage_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature VARCHAR(50) NOT NULL,
  usage_count INTEGER DEFAULT 0,
  period_start TIMESTAMPTZ DEFAULT NOW(),
  period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_usage_quotas_user_feature_period ON usage_quotas(
  user_id, feature, period_start
);
```

**Columns:**
- `feature`: Feature identifier (conversations, clips, memories, api_calls)
- `usage_count`: Current usage in billing period
- `period_start/end`: Quota reset window

**Reset Logic:**
- Quotas reset monthly on subscription renewal date
- Handled by Stripe webhook on `invoice.payment_succeeded`

### `tier_features` Table

Defines feature limits and capabilities per tier.

```sql
CREATE TABLE tier_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier VARCHAR(20) NOT NULL UNIQUE CHECK (tier IN ('free', 'premium', 'pro')),
  features JSONB NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  price_monthly INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Sample Data:**
```json
{
  "tier": "free",
  "features": {
    "conversations_per_month": 50,
    "clips_per_month": 5,
    "memory_entries": 1000,
    "api_calls_per_day": 100,
    "room_creation": false,
    "priority_support": false,
    "analytics": false
  },
  "display_name": "Free Tier",
  "price_monthly": 0
}
```

---

## API Reference

### Base URL
```
http://localhost:8000/api/subscription
```

### Authentication
All endpoints (except webhook) require JWT Bearer token:
```
Authorization: Bearer <token>
```

### Endpoints

#### 1. Get All Tiers
```http
GET /api/subscription/tiers
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "tier": "free",
      "display_name": "Free Tier",
      "price_monthly": 0,
      "features": {
        "conversations_per_month": 50,
        "clips_per_month": 5,
        "memory_entries": 1000,
        "room_creation": false
      }
    },
    {
      "tier": "premium",
      "display_name": "Premium",
      "price_monthly": 999,
      "features": {
        "conversations_per_month": 500,
        "clips_per_month": 50,
        "memory_entries": 5000,
        "room_creation": true,
        "priority_support": true
      }
    },
    {
      "tier": "pro",
      "display_name": "Pro",
      "price_monthly": 1999,
      "features": {
        "conversations_per_month": -1,
        "clips_per_month": 100,
        "memory_entries": 10000,
        "room_creation": true,
        "priority_support": true,
        "analytics": true,
        "api_access": true
      }
    }
  ]
}
```

**Note:** `-1` indicates unlimited quota.

#### 2. Get Current Subscription
```http
GET /api/subscription/current
```

**Response (Active Subscription):**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "user_123",
    "tier": "premium",
    "status": "active",
    "current_period_start": "2025-10-01T00:00:00Z",
    "current_period_end": "2025-11-01T00:00:00Z",
    "cancel_at_period_end": false,
    "features": {
      "conversations_per_month": 500,
      "clips_per_month": 50,
      "memory_entries": 5000,
      "room_creation": true,
      "priority_support": true
    }
  }
}
```

**Response (No Active Subscription):**
```json
{
  "success": true,
  "data": null
}
```

#### 3. Create Checkout Session
```http
POST /api/subscription/checkout
Content-Type: application/json

{
  "tier": "premium",
  "successUrl": "http://localhost:5173/subscription/success",
  "cancelUrl": "http://localhost:5173/pricing"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "cs_test_a1b2c3d4e5f6",
    "url": "https://checkout.stripe.com/pay/cs_test_a1b2c3d4e5f6"
  }
}
```

**Frontend Usage:**
```typescript
const response = await fetch('http://localhost:8000/api/subscription/checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    tier: 'premium',
    successUrl: window.location.origin + '/subscription/success',
    cancelUrl: window.location.origin + '/pricing'
  })
});

const { data } = await response.json();
window.location.href = data.url; // Redirect to Stripe
```

#### 4. Create Customer Portal Link
```http
POST /api/subscription/portal
Content-Type: application/json

{
  "returnUrl": "http://localhost:5173/subscription"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://billing.stripe.com/session/live_abc123"
  }
}
```

**Purpose:** Allows users to update payment methods, view invoices, and cancel subscriptions through Stripe's hosted portal.

#### 5. Stripe Webhook Handler
```http
POST /api/subscription/webhook
Content-Type: application/json
Stripe-Signature: t=1234567890,v1=abcdef...

{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_a1b2c3d4e5f6",
      "customer": "cus_abc123",
      "subscription": "sub_xyz789",
      "metadata": {
        "userId": "user_123",
        "tier": "premium"
      }
    }
  }
}
```

**Handled Events:**
- `checkout.session.completed` - Create subscription record
- `customer.subscription.updated` - Update subscription status
- `customer.subscription.deleted` - Cancel subscription
- `invoice.payment_succeeded` - Log payment, reset quotas
- `invoice.payment_failed` - Mark subscription as past_due

**Response:**
```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

**Security:** Webhook signature verified using `STRIPE_WEBHOOK_SECRET`.

---

## Feature Gates Middleware

### Overview

Feature gates enforce tier-based access control and quota limits across the application.

### Middleware Functions

#### 1. `requireTier(minTier)`

Blocks access if user's tier is below minimum required.

**Usage:**
```javascript
import { requireTier } from '../middleware/featureGates.js';

router.post('/api/rooms/create', 
  authMiddleware, 
  requireTier('premium'), 
  async (req, res) => {
    // Only premium+ users reach here
  }
);
```

**Response (Insufficient Tier):**
```json
{
  "success": false,
  "error": "This feature requires premium subscription",
  "code": "TIER_REQUIRED",
  "requiredTier": "premium",
  "currentTier": "free"
}
```
**Status Code:** 403 Forbidden

#### 2. `checkQuota(feature)`

Validates user hasn't exceeded usage quota for feature.

**Usage:**
```javascript
import { checkQuota, trackUsage } from '../middleware/featureGates.js';

router.post('/api/clips/create', 
  authMiddleware, 
  checkQuota('clips'), 
  trackUsage('clips'),
  async (req, res) => {
    // Only users with remaining quota reach here
  }
);
```

**Response (Quota Exceeded):**
```json
{
  "success": false,
  "error": "Monthly quota exceeded for clips",
  "code": "QUOTA_EXCEEDED",
  "feature": "clips",
  "usage": 50,
  "limit": 50,
  "resetDate": "2025-11-01T00:00:00Z"
}
```
**Status Code:** 403 Forbidden

#### 3. `trackUsage(feature)`

Increments usage counter after successful operation.

**Note:** Always use after `checkQuota` to ensure atomic check-then-increment.

**Example:**
```javascript
router.post('/api/memory/:sessionId', 
  authMiddleware, 
  checkQuota('memories'), 
  trackUsage('memories'),
  async (req, res) => {
    // Memory creation logic
  }
);
```

### Tier Level Mapping

```javascript
const TIER_LEVELS = {
  free: 1,
  premium: 2,
  pro: 3
};
```

Higher numbers indicate higher tiers. `requireTier('premium')` allows premium and pro users.

---

## Frontend Components

### 1. PricingPage.tsx

**Location:** `/workspace/big-snuggles/frontend/src/pages/PricingPage.tsx`  
**Lines:** 392  
**Route:** `/pricing`

**Features:**
- Three-tier comparison table (Free, Premium, Pro)
- "Most Popular" badge on Premium tier
- Feature checklist with checkmarks
- CTA buttons: "Get Started" (free), "Start 7-Day Trial" (premium/pro)
- Responsive design (mobile-first)

**Key Functions:**
```typescript
const handleSelectTier = async (tier: string) => {
  if (tier === 'free') {
    navigate('/signup');
    return;
  }

  const response = await fetch('http://localhost:8000/api/subscription/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      tier,
      successUrl: `${window.location.origin}/subscription/success`,
      cancelUrl: `${window.location.origin}/pricing`
    })
  });

  const { data } = await response.json();
  window.location.href = data.url;
};
```

### 2. SubscriptionPage.tsx

**Location:** `/workspace/big-snuggles/frontend/src/pages/SubscriptionPage.tsx`  
**Lines:** 432  
**Route:** `/subscription` (Protected)

**Features:**
- Current plan display with tier badge
- Billing information (next payment date, amount)
- Usage statistics with progress bars (conversations, clips, memories)
- Upgrade/downgrade buttons
- "Manage Billing" button (opens Stripe Customer Portal)
- Cancel subscription with confirmation dialog

**Data Fetching:**
```typescript
useEffect(() => {
  fetchSubscription();
  fetchUsage();
}, []);

const fetchSubscription = async () => {
  const response = await fetch('http://localhost:8000/api/subscription/current', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const { data } = await response.json();
  setSubscription(data);
};
```

**Progress Bar Example:**
```typescript
<Progress 
  value={(usage.conversations / limit.conversations) * 100} 
  className="h-2"
/>
<p className="text-sm text-gray-600">
  {usage.conversations} / {limit.conversations} conversations used
</p>
```

### 3. SubscriptionSuccessPage.tsx

**Location:** `/workspace/big-snuggles/frontend/src/pages/SubscriptionSuccessPage.tsx`  
**Lines:** 157  
**Route:** `/subscription/success` (Protected)

**Features:**
- Success confirmation with checkmark icon
- 2-second delay to allow webhook processing
- Verification of subscription activation
- Feature list display (tier-specific)
- CTAs: "View Subscription" or "Start Using"
- Error state if verification fails

**Verification Flow:**
```typescript
const verifySubscription = async () => {
  const sessionId = searchParams.get('session_id');
  
  // Wait for webhook to process
  await new Promise(resolve => setTimeout(resolve, 2000));

  const response = await fetch('http://localhost:8000/api/subscription/current', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  const { data } = await response.json();
  if (data) {
    setStatus('success');
    setSubscription(data);
  } else {
    setStatus('error');
  }
};
```

### 4. PremiumGate.tsx

**Location:** `/workspace/big-snuggles/frontend/src/components/PremiumGate.tsx`  
**Lines:** 166

**Purpose:** Wrapper component that locks features for non-eligible users.

**Usage:**
```typescript
<PremiumGate requiredTier="premium">
  <Button onClick={handleCreateRoom}>Create Room</Button>
</PremiumGate>
```

**Behavior:**
- Shows blurred overlay with lock icon for ineligible users
- Displays "Upgrade to Premium" message
- Redirects to /pricing on click
- Renders children normally for eligible users

---

## Stripe Integration

### Configuration

**Required Environment Variables:**
```bash
# Backend (.env)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Product Setup

Products are created programmatically by `subscriptionManager.ensureStripeProducts()`:

```javascript
const TIER_CONFIG = {
  premium: {
    name: 'Big Snuggles Premium',
    price: 999, // $9.99 in cents
    interval: 'month',
    features: [
      '500 AI conversations per month',
      '50 highlight clips per month',
      '5,000 memory entries',
      'Create private rooms',
      'Priority support'
    ]
  },
  pro: {
    name: 'Big Snuggles Pro',
    price: 1999, // $19.99 in cents
    interval: 'month',
    features: [
      'Unlimited AI conversations',
      '100 highlight clips per month',
      '10,000 memory entries',
      'Create unlimited rooms',
      'Priority support',
      'Advanced analytics',
      'API access'
    ]
  }
};
```

**Auto-Creation:** Products are created on first checkout or manually via:
```javascript
await subscriptionManager.ensureStripeProducts();
```

### Webhook Setup

**Local Testing (Stripe CLI):**
```bash
stripe listen --forward-to localhost:8000/api/subscription/webhook
```

**Production Setup:**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/subscription/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

### Security

**Signature Verification:**
```javascript
const sig = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  req.rawBody, 
  sig, 
  process.env.STRIPE_WEBHOOK_SECRET
);
```

**Raw Body Required:** Webhook endpoint must receive raw request body (not parsed JSON) for signature verification.

---

## Testing Guide

### Prerequisites

1. **Stripe Test Keys:**
   - Sign up at https://stripe.com
   - Navigate to Developers → API keys
   - Copy test mode keys (sk_test_... and pk_test_...)

2. **Stripe CLI (for local webhooks):**
   ```bash
   brew install stripe/stripe-cli/stripe
   stripe login
   ```

### Test Scenarios

#### Scenario 1: Upgrade to Premium

**Steps:**
1. Start backend: `cd backend && pnpm dev`
2. Start frontend: `cd frontend && pnpm dev`
3. Login as test user
4. Navigate to http://localhost:5173/pricing
5. Click "Start 7-Day Trial" on Premium tier
6. Use Stripe test card: `4242 4242 4242 4242`
7. Expiry: Any future date, CVC: Any 3 digits
8. Complete checkout
9. Verify redirect to `/subscription/success`
10. Check subscription dashboard at `/subscription`

**Expected:**
- Checkout session created
- Redirect to Stripe payment page
- Payment succeeds
- Webhook fires and creates subscription record
- Success page shows "Welcome to Premium!"
- Dashboard shows Premium badge and updated quotas

#### Scenario 2: Feature Gate Enforcement

**Steps:**
1. Login as free tier user
2. Try to create room: `POST /api/rooms/create`
3. Observe 403 error with "requires premium subscription"
4. Upgrade to Premium
5. Retry room creation
6. Verify success

**Backend Test (cURL):**
```bash
# Free user attempting premium feature
curl -X POST http://localhost:8000/api/rooms/create \
  -H "Authorization: Bearer <free_user_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Room"}'

# Expected response:
{
  "success": false,
  "error": "This feature requires premium subscription",
  "code": "TIER_REQUIRED"
}
```

#### Scenario 3: Quota Enforcement

**Steps:**
1. Login as Premium user
2. Generate 50 clips (monthly limit)
3. Attempt 51st clip generation
4. Observe 403 error with "Monthly quota exceeded"
5. Wait for quota reset (or manually reset in DB)
6. Verify new quota cycle allows clips again

**Database Query (Manual Reset):**
```sql
-- Reset clips quota for user
UPDATE usage_quotas 
SET usage_count = 0, 
    period_start = NOW(), 
    period_end = NOW() + INTERVAL '1 month'
WHERE user_id = '<user_uuid>' AND feature = 'clips';
```

#### Scenario 4: Subscription Cancellation

**Steps:**
1. Login as Premium user
2. Navigate to `/subscription`
3. Click "Manage Billing"
4. Verify redirect to Stripe Customer Portal
5. Click "Cancel Subscription" in portal
6. Confirm cancellation
7. Return to app
8. Verify `cancel_at_period_end = true` in subscription record
9. Wait for period end (or manually trigger)
10. Verify downgrade to free tier

**Webhook Test:**
```bash
stripe trigger customer.subscription.deleted
```

### Test Cards

**Success:** 4242 4242 4242 4242  
**Requires Authentication:** 4000 0027 6000 3184  
**Declined:** 4000 0000 0000 0002

**Full List:** https://stripe.com/docs/testing

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Conversion Rate:**
   - Free → Premium: Target 5-10%
   - Free → Pro: Target 1-3%

2. **Churn Rate:**
   - Monthly cancellations / Total subscribers
   - Target: <5% monthly churn

3. **Average Revenue Per User (ARPU):**
   - Total MRR / Total active users

4. **Quota Utilization:**
   - Users hitting quota limits (potential upsell opportunity)

### SQL Queries

**Active Subscriptions by Tier:**
```sql
SELECT tier, COUNT(*) as count
FROM subscriptions
WHERE status = 'active'
GROUP BY tier;
```

**Monthly Recurring Revenue (MRR):**
```sql
SELECT 
  SUM(CASE 
    WHEN tier = 'premium' THEN 9.99
    WHEN tier = 'pro' THEN 19.99
    ELSE 0
  END) as mrr
FROM subscriptions
WHERE status = 'active';
```

**Users Exceeding 80% Quota:**
```sql
SELECT 
  uq.user_id,
  uq.feature,
  uq.usage_count,
  tf.features->>uq.feature as limit,
  ROUND((uq.usage_count::float / (tf.features->>uq.feature)::int) * 100, 2) as utilization_pct
FROM usage_quotas uq
JOIN subscriptions s ON uq.user_id = s.user_id
JOIN tier_features tf ON s.tier = tf.tier
WHERE 
  s.status = 'active'
  AND uq.usage_count::float / (tf.features->>uq.feature)::int > 0.8;
```

**Failed Payments (Last 30 Days):**
```sql
SELECT user_id, amount_paid, payment_date
FROM payment_history
WHERE status = 'failed'
  AND payment_date > NOW() - INTERVAL '30 days'
ORDER BY payment_date DESC;
```

---

## Security Considerations

### 1. Webhook Signature Verification

**Critical:** Always verify Stripe webhook signatures to prevent spoofed requests.

```javascript
const sig = req.headers['stripe-signature'];
try {
  const event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  // Process event
} catch (err) {
  return res.status(400).json({ error: 'Invalid signature' });
}
```

### 2. Row Level Security (RLS)

**Enabled on all subscription tables:**
- Users can only read their own subscription data
- Only service_role can modify subscriptions (via backend)
- Prevents privilege escalation attacks

**Example Policy:**
```sql
CREATE POLICY "Users can view own subscription"
ON subscriptions FOR SELECT
USING (auth.uid() = user_id);
```

### 3. API Key Protection

**Never expose Stripe secret keys:**
- Store in `.env` file (not committed to git)
- Use environment variables in production
- Rotate keys if compromised

### 4. Frontend Validation

**Always validate on backend:**
- Frontend tier checks are for UX only
- Backend middleware enforces actual access control
- Prevents manipulation via browser dev tools

---

## Troubleshooting

### Issue: Webhook Not Firing

**Symptoms:**
- Checkout succeeds but subscription not created
- Database has no record after payment

**Solutions:**
1. Check Stripe CLI is running: `stripe listen --forward-to localhost:8000/api/subscription/webhook`
2. Verify webhook secret matches: `console.log(process.env.STRIPE_WEBHOOK_SECRET)`
3. Check backend logs for webhook errors
4. Verify Stripe Dashboard → Webhooks shows recent attempts

### Issue: Quota Not Enforcing

**Symptoms:**
- Users exceed quota without 403 error
- Feature gates not blocking access

**Solutions:**
1. Verify middleware order:
   ```javascript
   router.post('/endpoint', 
     authMiddleware,        // First: authenticate
     checkQuota('feature'), // Second: check quota
     trackUsage('feature'), // Third: track usage
     handler                // Last: actual logic
   );
   ```
2. Check `usage_quotas` table has record for user/feature
3. Verify `tier_features` table has correct limits

### Issue: Checkout Session Fails

**Symptoms:**
- Error when clicking "Start 7-Day Trial"
- Stripe redirect doesn't work

**Solutions:**
1. Verify Stripe keys are test mode keys (sk_test_...)
2. Check products exist in Stripe Dashboard
3. Run `ensureStripeProducts()` to create products
4. Check backend logs for Stripe API errors

### Issue: User Stuck on Success Page

**Symptoms:**
- Success page shows "Verifying..." forever
- Subscription not appearing in database

**Solutions:**
1. Increase verification delay (currently 2 seconds)
2. Check webhook processed successfully (Stripe Dashboard)
3. Verify subscription record exists in database:
   ```sql
   SELECT * FROM subscriptions WHERE user_id = '<uuid>';
   ```

---

## Future Enhancements

### Phase 1: Core Improvements
- [ ] Annual billing option (2 months free discount)
- [ ] Team/organization accounts (5+ users)
- [ ] Usage notifications (80%, 90%, 100% quota)
- [ ] Grace period for failed payments (3 days)
- [ ] Proration for mid-cycle upgrades/downgrades

### Phase 2: Advanced Features
- [ ] Referral program (1 month free per referral)
- [ ] Enterprise tier with custom pricing
- [ ] Add-on purchases (extra clips, storage)
- [ ] Gift subscriptions
- [ ] Student/educator discounts

### Phase 3: Analytics
- [ ] Revenue dashboard for admins
- [ ] Cohort analysis (retention by signup month)
- [ ] Churn prediction model
- [ ] A/B testing framework for pricing

---

## File Manifest

### Backend Files

```
backend/src/
├── services/
│   └── subscriptionManager.js      (722 lines) - Stripe integration & business logic
├── routes/
│   ├── subscription.js             (285 lines) - REST API endpoints
│   ├── rooms.js                    (UPDATED) - Applied requireTier('premium')
│   ├── clips.js                    (UPDATED) - Applied checkQuota/trackUsage
│   └── memory.js                   (UPDATED) - Applied checkQuota/trackUsage
├── middleware/
│   └── featureGates.js             (268 lines) - Quota enforcement middleware
└── server.js                       (UPDATED) - Integrated subscription routes
```

### Frontend Files

```
frontend/src/
├── pages/
│   ├── PricingPage.tsx             (392 lines) - Tier comparison & purchase
│   ├── SubscriptionPage.tsx        (432 lines) - Subscription management dashboard
│   └── SubscriptionSuccessPage.tsx (157 lines) - Post-checkout confirmation
├── components/
│   ├── PremiumGate.tsx             (166 lines) - Feature access wrapper
│   └── ui/
│       └── progress.tsx            (26 lines) - Progress bar component
└── App.tsx                         (UPDATED) - Added /pricing, /subscription routes
```

### Database Files

```
supabase/migrations/
└── 1761641570_create_subscription_system.sql (448 lines)
    ├── subscriptions table
    ├── payment_history table
    ├── usage_quotas table
    ├── tier_features table
    ├── RLS policies
    └── Indexes
```

### Documentation Files

```
docs/
├── PHASE8_COMPONENT4_PREMIUM_TIER.md (This file)
└── COMPONENT4_SETUP_GUIDE.md         (Quick setup reference)
```

---

## Summary

The Premium Tier System successfully introduces monetization to Big Snuggles through a three-tier subscription model powered by Stripe. The implementation includes:

✅ **Backend Complete:**
- Stripe integration with checkout, webhooks, and customer portal
- Feature gate middleware for tier and quota enforcement
- REST API for subscription management
- Database schema with RLS policies

✅ **Frontend Complete:**
- Pricing page with tier comparison
- Subscription dashboard with usage tracking
- Success page for post-checkout confirmation
- Premium gate component for feature locking

✅ **Integration Complete:**
- Feature gates applied to rooms, clips, and memories
- Quota enforcement on resource-intensive operations
- Webhook handling for subscription lifecycle events

🔧 **Pending Configuration:**
- Requires Stripe API keys (test mode) for full functionality
- Webhook endpoint must be configured in Stripe Dashboard for production

**Next Steps:**
1. Add Stripe API keys to backend `.env` file
2. Test complete checkout flow with test cards
3. Configure production webhook endpoint
4. Monitor conversion rates and optimize pricing

**Questions or Issues?** Refer to the Troubleshooting section or consult the Stripe API documentation at https://stripe.com/docs/api
