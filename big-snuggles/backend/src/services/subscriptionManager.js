import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Stripe (will be null if keys not provided)
let stripe = null;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (stripeSecretKey) {
  stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-11-20.acacia'
  });
  console.log('Stripe initialized successfully');
} else {
  console.warn('STRIPE_SECRET_KEY not found - Stripe features will be unavailable');
}

/**
 * Subscription Manager Service
 * Handles tier management, Stripe integration, and feature gates
 */
class SubscriptionManager {
  constructor() {
    this.stripe = stripe;
    this.tierLimits = {
      free: {
        memories: { limit: 100, retention_days: 7 },
        conversations: { monthly_limit: 20 },
        clips: { monthly_limit: 3 },
        rooms: { can_create: false, can_join: true, max_participants: 10 }
      },
      premium: {
        memories: { limit: 500, retention_days: 30 },
        conversations: { unlimited: true },
        clips: { monthly_limit: 20 },
        rooms: { can_create: true, can_join: true, max_participants: 20 }
      },
      pro: {
        memories: { unlimited: true },
        conversations: { unlimited: true },
        clips: { unlimited: true },
        rooms: { can_create: true, can_join: true, max_participants: 100 }
      }
    };
  }

  /**
   * Get all available subscription tiers
   */
  async getTiers() {
    try {
      const { data, error } = await supabase
        .from('tier_features')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching tiers:', error);
      throw new Error('Failed to fetch subscription tiers');
    }
  }

  /**
   * Get user's current subscription
   */
  async getUserSubscription(userId) {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // Ignore "not found" error
        throw error;
      }

      // If no subscription exists, create default free tier
      if (!data) {
        const { data: newSub, error: createError } = await supabase
          .from('subscriptions')
          .insert({ user_id: userId, tier: 'free', status: 'active' })
          .select()
          .single();

        if (createError) throw createError;
        return newSub;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user subscription:', error);
      throw new Error('Failed to fetch subscription');
    }
  }

  /**
   * Get user's current usage quotas
   */
  async getUserUsage(userId) {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

      const { data, error } = await supabase
        .from('usage_quotas')
        .select('*')
        .eq('user_id', userId)
        .eq('month', currentMonth)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // If no usage record exists, create one
      if (!data) {
        const { data: newUsage, error: createError } = await supabase
          .from('usage_quotas')
          .insert({ user_id: userId, month: currentMonth })
          .select()
          .single();

        if (createError) throw createError;
        return newUsage;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user usage:', error);
      throw new Error('Failed to fetch usage data');
    }
  }

  /**
   * Check if user has access to a feature
   */
  async checkFeatureAccess(userId, feature) {
    try {
      const subscription = await this.getUserSubscription(userId);
      const { data: tierFeatures, error } = await supabase
        .from('tier_features')
        .select('features')
        .eq('tier', subscription.tier)
        .single();

      if (error) throw error;

      // Navigate nested feature object
      const featurePath = feature.split('.');
      let featureConfig = tierFeatures.features;
      
      for (const key of featurePath) {
        if (featureConfig[key] === undefined) {
          return { hasAccess: false, reason: 'Feature not found' };
        }
        featureConfig = featureConfig[key];
      }

      return { hasAccess: true, config: featureConfig };
    } catch (error) {
      console.error('Error checking feature access:', error);
      return { hasAccess: false, reason: 'Error checking access' };
    }
  }

  /**
   * Check if user has reached quota limit for a feature
   */
  async checkQuota(userId, quotaType) {
    try {
      const subscription = await this.getUserSubscription(userId);
      const usage = await this.getUserUsage(userId);
      const { data: tierFeatures, error } = await supabase
        .from('tier_features')
        .select('features')
        .eq('tier', subscription.tier)
        .single();

      if (error) throw error;

      // Map quota type to feature config and usage field
      const quotaMapping = {
        conversations: {
          feature: tierFeatures.features.conversations,
          used: usage.conversations_count,
          field: 'monthly_limit'
        },
        clips: {
          feature: tierFeatures.features.clips,
          used: usage.clips_count,
          field: 'monthly_limit'
        },
        memories: {
          feature: tierFeatures.features.memories,
          used: usage.memories_count,
          field: 'limit'
        },
        rooms_created: {
          feature: tierFeatures.features.rooms,
          used: usage.rooms_created_count,
          field: 'can_create'
        }
      };

      const quota = quotaMapping[quotaType];
      if (!quota) {
        throw new Error(`Unknown quota type: ${quotaType}`);
      }

      // Check if feature is unlimited
      if (quota.feature.unlimited) {
        return {
          allowed: true,
          remaining: null,
          limit: null,
          used: quota.used,
          unlimited: true
        };
      }

      // Check if limit exists
      const limit = quota.feature[quota.field];
      if (limit === null || limit === undefined) {
        return {
          allowed: true,
          remaining: null,
          limit: null,
          used: quota.used,
          unlimited: true
        };
      }

      // For boolean checks (like can_create)
      if (typeof limit === 'boolean') {
        return {
          allowed: limit,
          remaining: null,
          limit: null,
          used: quota.used
        };
      }

      // For numeric limits
      const remaining = Math.max(0, limit - quota.used);
      const allowed = quota.used < limit;

      return {
        allowed,
        remaining,
        limit,
        used: quota.used,
        percentage: (quota.used / limit) * 100
      };
    } catch (error) {
      console.error('Error checking quota:', error);
      throw new Error('Failed to check quota');
    }
  }

  /**
   * Increment usage counter
   */
  async trackUsage(userId, usageType, increment = 1) {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Ensure usage record exists
      const { data: usage, error: fetchError } = await supabase
        .from('usage_quotas')
        .select('*')
        .eq('user_id', userId)
        .eq('month', currentMonth)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (!usage) {
        // Create new usage record
        await supabase
          .from('usage_quotas')
          .insert({ user_id: userId, month: currentMonth });
      }

      // Increment counter using database function
      const { error: incrementError } = await supabase.rpc(
        'increment_usage_counter',
        {
          p_user_id: userId,
          p_counter_type: usageType,
          p_increment: increment
        }
      );

      if (incrementError) throw incrementError;

      return true;
    } catch (error) {
      console.error('Error tracking usage:', error);
      throw new Error('Failed to track usage');
    }
  }

  /**
   * Create Stripe checkout session
   */
  async createCheckoutSession(userId, tier, interval = 'monthly', successUrl, cancelUrl) {
    if (!this.stripe) {
      throw new Error('Stripe not configured. Please contact support.');
    }

    try {
      const subscription = await this.getUserSubscription(userId);
      
      // Get user email from Supabase Auth
      const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (userError) throw userError;

      // Get or create Stripe customer
      let customerId = subscription.stripe_customer_id;
      
      if (!customerId) {
        const customer = await this.stripe.customers.create({
          email: user.email,
          metadata: {
            supabase_user_id: userId
          }
        });
        customerId = customer.id;

        // Save customer ID
        await supabase
          .from('subscriptions')
          .update({ stripe_customer_id: customerId })
          .eq('user_id', userId);
      }

      // Get price ID for tier and interval
      const { data: tierData, error: tierError } = await supabase
        .from('tier_features')
        .select('*')
        .eq('tier', tier)
        .single();

      if (tierError) throw tierError;

      const priceAmount = interval === 'yearly' ? tierData.price_yearly : tierData.price_monthly;
      
      // Create or get Stripe price
      const price = await this.getOrCreatePrice(tier, priceAmount, interval);

      // Create checkout session
      const sessionParams = {
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: price.id,
            quantity: 1
          }
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          user_id: userId,
          tier: tier
        }
      };

      // Add trial for premium tier if first subscription
      if (tier === 'premium' && subscription.tier === 'free') {
        sessionParams.subscription_data = {
          trial_period_days: 7
        };
      }

      const session = await this.stripe.checkout.sessions.create(sessionParams);

      return {
        checkout_url: session.url,
        session_id: session.id
      };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  }

  /**
   * Get or create Stripe price
   */
  async getOrCreatePrice(tier, amount, interval) {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      // Search for existing price
      const prices = await this.stripe.prices.list({
        limit: 100
      });

      const existingPrice = prices.data.find(
        p => p.unit_amount === amount &&
             p.recurring?.interval === (interval === 'yearly' ? 'year' : 'month') &&
             p.metadata.tier === tier
      );

      if (existingPrice) {
        return existingPrice;
      }

      // Create new price
      const product = await this.getOrCreateProduct(tier);
      
      const price = await this.stripe.prices.create({
        product: product.id,
        unit_amount: amount,
        currency: 'usd',
        recurring: {
          interval: interval === 'yearly' ? 'year' : 'month'
        },
        metadata: {
          tier: tier
        }
      });

      return price;
    } catch (error) {
      console.error('Error getting/creating price:', error);
      throw error;
    }
  }

  /**
   * Get or create Stripe product
   */
  async getOrCreateProduct(tier) {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      // Search for existing product
      const products = await this.stripe.products.list({
        limit: 100
      });

      const existingProduct = products.data.find(
        p => p.metadata.tier === tier
      );

      if (existingProduct) {
        return existingProduct;
      }

      // Get tier display name
      const { data: tierData } = await supabase
        .from('tier_features')
        .select('display_name, description')
        .eq('tier', tier)
        .single();

      // Create new product
      const product = await this.stripe.products.create({
        name: `Big Snuggles ${tierData.display_name}`,
        description: tierData.description,
        metadata: {
          tier: tier
        }
      });

      return product;
    } catch (error) {
      console.error('Error getting/creating product:', error);
      throw error;
    }
  }

  /**
   * Create Stripe customer portal session
   */
  async createPortalSession(userId, returnUrl) {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription.stripe_customer_id) {
        throw new Error('No Stripe customer found');
      }

      const session = await this.stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: returnUrl
      });

      return {
        portal_url: session.url
      };
    } catch (error) {
      console.error('Error creating portal session:', error);
      throw new Error('Failed to create portal session');
    }
  }

  /**
   * Handle Stripe webhook event
   */
  async handleWebhookEvent(event) {
    console.log(`Processing webhook event: ${event.type}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return { handled: true };
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }

  /**
   * Handle checkout session completed
   */
  async handleCheckoutCompleted(session) {
    const userId = session.metadata.user_id;
    const tier = session.metadata.tier;

    await supabase
      .from('subscriptions')
      .update({
        tier,
        stripe_subscription_id: session.subscription,
        status: 'active'
      })
      .eq('user_id', userId);

    console.log(`Activated ${tier} subscription for user ${userId}`);
  }

  /**
   * Handle subscription updated
   */
  async handleSubscriptionUpdated(subscription) {
    const customerId = subscription.customer;

    const { data: sub, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('stripe_customer_id', customerId)
      .single();

    if (error) {
      console.error('Subscription not found for customer:', customerId);
      return;
    }

    await supabase
      .from('subscriptions')
      .update({
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        stripe_price_id: subscription.items.data[0].price.id
      })
      .eq('stripe_customer_id', customerId);

    console.log(`Updated subscription for customer ${customerId}`);
  }

  /**
   * Handle subscription deleted/cancelled
   */
  async handleSubscriptionDeleted(subscription) {
    const customerId = subscription.customer;

    await supabase
      .from('subscriptions')
      .update({
        tier: 'free',
        status: 'canceled',
        stripe_subscription_id: null,
        stripe_price_id: null
      })
      .eq('stripe_customer_id', customerId);

    console.log(`Cancelled subscription for customer ${customerId}`);
  }

  /**
   * Handle successful payment
   */
  async handlePaymentSucceeded(invoice) {
    const customerId = invoice.customer;
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('stripe_customer_id', customerId)
      .single();

    if (!sub) return;

    await supabase
      .from('payment_history')
      .insert({
        user_id: sub.user_id,
        subscription_id: sub.id,
        stripe_invoice_id: invoice.id,
        stripe_payment_intent_id: invoice.payment_intent,
        amount_paid: invoice.amount_paid,
        currency: invoice.currency,
        status: 'paid',
        invoice_pdf_url: invoice.invoice_pdf,
        hosted_invoice_url: invoice.hosted_invoice_url,
        paid_at: new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      });

    console.log(`Recorded payment for user ${sub.user_id}`);
  }

  /**
   * Handle failed payment
   */
  async handlePaymentFailed(invoice) {
    const customerId = invoice.customer;
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('stripe_customer_id', customerId)
      .single();

    if (!sub) return;

    await supabase
      .from('subscriptions')
      .update({ status: 'past_due' })
      .eq('stripe_customer_id', customerId);

    await supabase
      .from('payment_history')
      .insert({
        user_id: sub.user_id,
        subscription_id: sub.id,
        stripe_invoice_id: invoice.id,
        amount_paid: invoice.amount_due,
        currency: invoice.currency,
        status: 'failed'
      });

    console.log(`Payment failed for user ${sub.user_id}`);
  }

  /**
   * Cancel subscription (at period end)
   */
  async cancelSubscription(userId) {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      const subscription = await this.getUserSubscription(userId);

      if (!subscription.stripe_subscription_id) {
        throw new Error('No active subscription to cancel');
      }

      await this.stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true
      });

      await supabase
        .from('subscriptions')
        .update({ cancel_at_period_end: true })
        .eq('user_id', userId);

      return { success: true, message: 'Subscription will cancel at period end' };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }
}

// Export singleton instance
const subscriptionManager = new SubscriptionManager();

export default subscriptionManager;
