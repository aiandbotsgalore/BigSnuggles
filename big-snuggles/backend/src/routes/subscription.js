import express from 'express';
import subscriptionManager from '../services/subscriptionManager.js';
import Stripe from 'stripe';

const router = express.Router();

// Get Stripe webhook secret from environment
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * GET /api/subscription/tiers
 * List all available subscription tiers
 */
router.get('/tiers', async (req, res) => {
  try {
    const tiers = await subscriptionManager.getTiers();
    res.json({ tiers });
  } catch (error) {
    console.error('Error fetching tiers:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/subscription/current
 * Get user's current subscription
 */
router.get('/current', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const subscription = await subscriptionManager.getUserSubscription(userId);
    res.json({ subscription });
  } catch (error) {
    console.error('Error fetching current subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/subscription/usage
 * Get user's current usage statistics vs quotas
 */
router.get('/usage', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const [subscription, usage] = await Promise.all([
      subscriptionManager.getUserSubscription(userId),
      subscriptionManager.getUserUsage(userId)
    ]);

    // Get quotas for each feature
    const quotas = {
      conversations: await subscriptionManager.checkQuota(userId, 'conversations'),
      clips: await subscriptionManager.checkQuota(userId, 'clips'),
      memories: await subscriptionManager.checkQuota(userId, 'memories'),
      rooms_created: await subscriptionManager.checkQuota(userId, 'rooms_created')
    };

    res.json({
      subscription: {
        tier: subscription.tier,
        status: subscription.status
      },
      usage,
      quotas
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/subscription/checkout
 * Create Stripe checkout session for upgrading
 */
router.post('/checkout', async (req, res) => {
  try {
    const { userId, tier, interval = 'monthly' } = req.body;

    if (!userId || !tier) {
      return res.status(400).json({ error: 'userId and tier are required' });
    }

    // Validate tier
    if (!['premium', 'pro'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier. Must be premium or pro' });
    }

    // Validate interval
    if (!['monthly', 'yearly'].includes(interval)) {
      return res.status(400).json({ error: 'Invalid interval. Must be monthly or yearly' });
    }

    // Build success and cancel URLs
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const successUrl = `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/pricing?checkout=cancelled`;

    const result = await subscriptionManager.createCheckoutSession(
      userId,
      tier,
      interval,
      successUrl,
      cancelUrl
    );

    res.json(result);
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/subscription/portal
 * Create Stripe customer portal link for managing subscription
 */
router.post('/portal', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const returnUrl = `${baseUrl}/subscription`;

    const result = await subscriptionManager.createPortalSession(userId, returnUrl);

    res.json(result);
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/subscription/cancel
 * Cancel subscription (at end of billing period)
 */
router.post('/cancel', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const result = await subscriptionManager.cancelSubscription(userId);

    res.json(result);
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/subscription/payment-history
 * Get user's payment history
 */
router.get('/payment-history', async (req, res) => {
  try {
    const { userId, limit = 10, offset = 0 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    const { data, error, count } = await subscriptionManager.supabase
      .from('payment_history')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({
      payments: data,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/subscription/webhook/stripe
 * Handle Stripe webhook events
 * 
 * NOTE: This endpoint must use raw body parser, not JSON parser
 */
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event;

  try {
    // Verify webhook signature
    const stripe = subscriptionManager.stripe;
    if (!stripe) {
      throw new Error('Stripe not initialized');
    }

    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    // Handle the event
    await subscriptionManager.handleWebhookEvent(event);
    
    res.json({ received: true, event_type: event.type });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * POST /api/subscription/check-quota
 * Check if user has quota for a specific feature
 */
router.post('/check-quota', async (req, res) => {
  try {
    const { userId, quotaType } = req.body;

    if (!userId || !quotaType) {
      return res.status(400).json({ error: 'userId and quotaType are required' });
    }

    const quota = await subscriptionManager.checkQuota(userId, quotaType);

    res.json({ quota });
  } catch (error) {
    console.error('Error checking quota:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/subscription/track-usage
 * Track usage for a feature (internal use)
 */
router.post('/track-usage', async (req, res) => {
  try {
    const { userId, usageType, increment = 1 } = req.body;

    if (!userId || !usageType) {
      return res.status(400).json({ error: 'userId and usageType are required' });
    }

    await subscriptionManager.trackUsage(userId, usageType, increment);

    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking usage:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
