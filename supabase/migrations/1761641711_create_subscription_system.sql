-- Migration: create_subscription_system
-- Created at: 1761641711

-- Migration 009: Premium Tier System with Stripe Integration
-- Creates subscription management, payment tracking, and usage quota tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. SUBSCRIPTIONS TABLE
-- ============================================================================
-- Tracks user subscription tiers and Stripe subscription data

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'pro')),
  
  -- Stripe integration fields
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  
  -- Subscription status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  
  -- Billing period
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  
  -- Trial period
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster user lookups
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_tier ON subscriptions(tier);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- ============================================================================
-- 2. PAYMENT HISTORY TABLE
-- ============================================================================
-- Tracks all payment transactions and invoices

CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  
  -- Stripe invoice data
  stripe_invoice_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  
  -- Payment details
  amount_paid INTEGER NOT NULL, -- in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('paid', 'failed', 'pending', 'refunded')),
  
  -- Invoice metadata
  invoice_pdf_url TEXT,
  hosted_invoice_url TEXT,
  
  -- Payment timing
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX idx_payment_history_subscription_id ON payment_history(subscription_id);
CREATE INDEX idx_payment_history_status ON payment_history(status);
CREATE INDEX idx_payment_history_created_at ON payment_history(created_at DESC);

-- ============================================================================
-- 3. USAGE QUOTAS TABLE
-- ============================================================================
-- Tracks monthly usage against tier quotas

CREATE TABLE IF NOT EXISTS usage_quotas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Month tracking (format: 'YYYY-MM')
  month TEXT NOT NULL,
  
  -- Usage counters
  conversations_count INTEGER DEFAULT 0,
  clips_count INTEGER DEFAULT 0,
  memories_count INTEGER DEFAULT 0,
  api_calls_count INTEGER DEFAULT 0,
  rooms_created_count INTEGER DEFAULT 0,
  
  -- Tracking metadata
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one record per user per month
  UNIQUE(user_id, month)
);

-- Create indexes
CREATE INDEX idx_usage_quotas_user_id ON usage_quotas(user_id);
CREATE INDEX idx_usage_quotas_month ON usage_quotas(month);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_usage_quotas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_usage_quotas_updated_at
  BEFORE UPDATE ON usage_quotas
  FOR EACH ROW
  EXECUTE FUNCTION update_usage_quotas_updated_at();

-- ============================================================================
-- 4. TIER FEATURES TABLE (Reference Data)
-- ============================================================================
-- Defines features and limits for each subscription tier

CREATE TABLE IF NOT EXISTS tier_features (
  tier TEXT PRIMARY KEY CHECK (tier IN ('free', 'premium', 'pro')),
  
  -- Feature limits (JSONB for flexibility)
  features JSONB NOT NULL,
  
  -- Pricing (in cents)
  price_monthly INTEGER NOT NULL,
  price_yearly INTEGER NOT NULL,
  
  -- Display configuration
  display_order INTEGER NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default tier configurations
INSERT INTO tier_features (tier, features, price_monthly, price_yearly, display_order, display_name, description) VALUES
('free', '{
  "memories": {
    "limit": 100,
    "retention_days": 7,
    "priority": false
  },
  "conversations": {
    "monthly_limit": 20,
    "unlimited": false
  },
  "clips": {
    "monthly_limit": 3,
    "quality": "standard"
  },
  "rooms": {
    "can_create": false,
    "can_join": true,
    "max_participants": 10
  },
  "personality_modes": {
    "available": ["playful", "wise", "gangster"],
    "custom_creation": false
  },
  "voice": {
    "quality": "standard",
    "priority_processing": false
  },
  "support": {
    "level": "community",
    "priority": false
  },
  "badge": "none"
}', 0, 0, 1, 'Free', 'Perfect for trying out Big Snuggles'),

('premium', '{
  "memories": {
    "limit": 500,
    "retention_days": 30,
    "priority": false
  },
  "conversations": {
    "monthly_limit": null,
    "unlimited": true
  },
  "clips": {
    "monthly_limit": 20,
    "quality": "enhanced"
  },
  "rooms": {
    "can_create": true,
    "can_join": true,
    "max_participants": 20
  },
  "personality_modes": {
    "available": ["playful", "wise", "gangster", "empathetic", "mysterious"],
    "custom_creation": false
  },
  "voice": {
    "quality": "enhanced",
    "priority_processing": true
  },
  "support": {
    "level": "priority",
    "priority": true
  },
  "special_features": ["custom_themes", "priority_support"],
  "badge": "premium",
  "trial_days": 7
}', 999, 9990, 2, 'Premium', 'Best for regular users'),

('pro', '{
  "memories": {
    "limit": null,
    "retention_days": null,
    "priority": true,
    "unlimited": true
  },
  "conversations": {
    "monthly_limit": null,
    "unlimited": true
  },
  "clips": {
    "monthly_limit": null,
    "quality": "premium",
    "unlimited": true
  },
  "rooms": {
    "can_create": true,
    "can_join": true,
    "max_participants": 100
  },
  "personality_modes": {
    "available": ["playful", "wise", "gangster", "empathetic", "mysterious"],
    "custom_creation": true
  },
  "voice": {
    "quality": "premium",
    "priority_processing": true,
    "lowest_latency": true
  },
  "support": {
    "level": "priority",
    "priority": true,
    "dedicated": true
  },
  "special_features": ["api_access", "custom_avatars", "analytics_dashboard", "white_label"],
  "badge": "pro"
}', 1999, 19990, 3, 'Pro', 'For power users and businesses')
ON CONFLICT (tier) DO NOTHING;

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_features ENABLE ROW LEVEL SECURITY;

-- Subscriptions: Users can only read their own subscription
CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Payment history: Users can only read their own payment history
CREATE POLICY "Users can read own payment history"
  ON payment_history FOR SELECT
  USING (auth.uid() = user_id);

-- Usage quotas: Users can read their own usage quotas
CREATE POLICY "Users can read own usage quotas"
  ON usage_quotas FOR SELECT
  USING (auth.uid() = user_id);

-- Tier features: Publicly readable (for pricing page)
CREATE POLICY "Tier features are publicly readable"
  ON tier_features FOR SELECT
  USING (true);

-- Service role can manage all subscription data
CREATE POLICY "Service role can manage subscriptions"
  ON subscriptions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage payment history"
  ON payment_history FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can manage usage quotas"
  ON usage_quotas FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to initialize subscription for new user (defaults to free tier)
CREATE OR REPLACE FUNCTION initialize_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (user_id, tier, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Initialize usage quota for current month
  INSERT INTO usage_quotas (user_id, month)
  VALUES (NEW.id, TO_CHAR(NOW(), 'YYYY-MM'))
  ON CONFLICT (user_id, month) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create subscription on user signup
CREATE TRIGGER trigger_initialize_user_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_subscription();

-- Function to get current month's usage quota
CREATE OR REPLACE FUNCTION get_user_usage_quota(p_user_id UUID)
RETURNS TABLE (
  conversations_used INTEGER,
  clips_used INTEGER,
  memories_used INTEGER,
  api_calls_used INTEGER,
  rooms_created_used INTEGER,
  month TEXT
) AS $$
DECLARE
  current_month TEXT := TO_CHAR(NOW(), 'YYYY-MM');
BEGIN
  -- Ensure usage quota record exists for current month
  INSERT INTO usage_quotas (user_id, month)
  VALUES (p_user_id, current_month)
  ON CONFLICT (user_id, month) DO NOTHING;
  
  -- Return usage data
  RETURN QUERY
  SELECT 
    uq.conversations_count,
    uq.clips_count,
    uq.memories_count,
    uq.api_calls_count,
    uq.rooms_created_count,
    uq.month
  FROM usage_quotas uq
  WHERE uq.user_id = p_user_id AND uq.month = current_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment usage counter
CREATE OR REPLACE FUNCTION increment_usage_counter(
  p_user_id UUID,
  p_counter_type TEXT, -- 'conversations', 'clips', 'memories', 'api_calls', 'rooms_created'
  p_increment INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  current_month TEXT := TO_CHAR(NOW(), 'YYYY-MM');
BEGIN
  -- Ensure record exists
  INSERT INTO usage_quotas (user_id, month)
  VALUES (p_user_id, current_month)
  ON CONFLICT (user_id, month) DO NOTHING;
  
  -- Increment the specified counter
  CASE p_counter_type
    WHEN 'conversations' THEN
      UPDATE usage_quotas SET conversations_count = conversations_count + p_increment
      WHERE user_id = p_user_id AND month = current_month;
    WHEN 'clips' THEN
      UPDATE usage_quotas SET clips_count = clips_count + p_increment
      WHERE user_id = p_user_id AND month = current_month;
    WHEN 'memories' THEN
      UPDATE usage_quotas SET memories_count = memories_count + p_increment
      WHERE user_id = p_user_id AND month = current_month;
    WHEN 'api_calls' THEN
      UPDATE usage_quotas SET api_calls_count = api_calls_count + p_increment
      WHERE user_id = p_user_id AND month = current_month;
    WHEN 'rooms_created' THEN
      UPDATE usage_quotas SET rooms_created_count = rooms_created_count + p_increment
      WHERE user_id = p_user_id AND month = current_month;
    ELSE
      RETURN FALSE;
  END CASE;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset monthly quotas (run via cron on 1st of each month)
CREATE OR REPLACE FUNCTION reset_monthly_quotas()
RETURNS void AS $$
DECLARE
  current_month TEXT := TO_CHAR(NOW(), 'YYYY-MM');
BEGIN
  -- Archive old quota data could go here if needed
  
  -- Create new quota records for all active users for the new month
  INSERT INTO usage_quotas (user_id, month)
  SELECT DISTINCT user_id, current_month
  FROM subscriptions
  WHERE status = 'active'
  ON CONFLICT (user_id, month) DO NOTHING;
  
  RAISE NOTICE 'Monthly quotas reset for month: %', current_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE subscriptions IS 'Stores user subscription tier and Stripe integration data';
COMMENT ON TABLE payment_history IS 'Tracks all payment transactions and invoices from Stripe';
COMMENT ON TABLE usage_quotas IS 'Tracks monthly usage against tier quotas for rate limiting';
COMMENT ON TABLE tier_features IS 'Reference data defining features and limits for each subscription tier';

COMMENT ON FUNCTION initialize_user_subscription() IS 'Auto-creates free tier subscription for new users';
COMMENT ON FUNCTION get_user_usage_quota(UUID) IS 'Retrieves current month usage quota for a user';
COMMENT ON FUNCTION increment_usage_counter(UUID, TEXT, INTEGER) IS 'Increments a specific usage counter for a user';
COMMENT ON FUNCTION reset_monthly_quotas() IS 'Resets all usage quotas on 1st of each month (scheduled job)';;