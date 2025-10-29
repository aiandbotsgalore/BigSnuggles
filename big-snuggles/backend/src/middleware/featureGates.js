import subscriptionManager from '../services/subscriptionManager.js';

/**
 * Feature Gate Middleware
 * Protects routes based on subscription tier requirements
 */

/**
 * Middleware to require minimum tier level
 * @param {string} requiredTier - Minimum tier required ('free', 'premium', 'pro')
 */
export function requireTier(requiredTier) {
  const tierLevels = { free: 0, premium: 1, pro: 2 };
  const requiredLevel = tierLevels[requiredTier];

  if (requiredLevel === undefined) {
    throw new Error(`Invalid tier: ${requiredTier}`);
  }

  return async (req, res, next) => {
    try {
      const userId = req.body.userId || req.query.userId;

      if (!userId) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const subscription = await subscriptionManager.getUserSubscription(userId);
      const userLevel = tierLevels[subscription.tier];

      if (userLevel < requiredLevel) {
        return res.status(403).json({
          error: `This feature requires ${requiredTier} tier or higher`,
          code: 'TIER_REQUIRED',
          required_tier: requiredTier,
          current_tier: subscription.tier,
          upgrade_url: '/pricing'
        });
      }

      // Attach subscription to request for use in route handlers
      req.subscription = subscription;
      next();
    } catch (error) {
      console.error('Error in requireTier middleware:', error);
      res.status(500).json({ error: 'Failed to verify subscription tier' });
    }
  };
}

/**
 * Middleware to check and enforce quota limits
 * @param {string} quotaType - Type of quota to check ('conversations', 'clips', 'memories', 'rooms_created')
 */
export function checkQuota(quotaType) {
  return async (req, res, next) => {
    try {
      const userId = req.body.userId || req.query.userId;

      if (!userId) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const quota = await subscriptionManager.checkQuota(userId, quotaType);

      if (!quota.allowed) {
        const subscription = await subscriptionManager.getUserSubscription(userId);

        return res.status(403).json({
          error: `Monthly ${quotaType} quota exceeded`,
          code: 'QUOTA_EXCEEDED',
          quota: {
            used: quota.used,
            limit: quota.limit,
            remaining: 0
          },
          current_tier: subscription.tier,
          upgrade_url: '/pricing',
          message: quota.unlimited ? 'Feature not available in current tier' : `You've reached your monthly limit of ${quota.limit} ${quotaType}`
        });
      }

      // Attach quota info to request
      req.quota = quota;
      next();
    } catch (error) {
      console.error('Error in checkQuota middleware:', error);
      res.status(500).json({ error: 'Failed to check quota' });
    }
  };
}

/**
 * Middleware to automatically track usage after successful request
 * @param {string} usageType - Type of usage to track ('conversations', 'clips', 'memories', 'api_calls', 'rooms_created')
 */
export function trackUsage(usageType) {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;

    // Override send function to track usage on successful responses
    res.send = function (data) {
      // Only track on successful responses (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const userId = req.body.userId || req.query.userId;

        if (userId) {
          subscriptionManager.trackUsage(userId, usageType, 1)
            .catch(error => {
              console.error(`Failed to track ${usageType} usage for user ${userId}:`, error);
            });
        }
      }

      // Call original send function
      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Middleware to check feature access
 * @param {string} featurePath - Path to feature in tier_features.features (e.g., 'rooms.can_create')
 */
export function requireFeature(featurePath) {
  return async (req, res, next) => {
    try {
      const userId = req.body.userId || req.query.userId;

      if (!userId) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const access = await subscriptionManager.checkFeatureAccess(userId, featurePath);

      if (!access.hasAccess) {
        const subscription = await subscriptionManager.getUserSubscription(userId);

        return res.status(403).json({
          error: `Feature not available: ${featurePath}`,
          code: 'FEATURE_NOT_AVAILABLE',
          reason: access.reason,
          current_tier: subscription.tier,
          upgrade_url: '/pricing'
        });
      }

      // Attach feature config to request
      req.featureConfig = access.config;
      next();
    } catch (error) {
      console.error('Error in requireFeature middleware:', error);
      res.status(500).json({ error: 'Failed to check feature access' });
    }
  };
}

/**
 * Combined middleware: Check quota and track usage
 * @param {string} usageType - Type of usage ('conversations', 'clips', 'memories', 'rooms_created')
 */
export function enforceQuota(usageType) {
  return async (req, res, next) => {
    try {
      const userId = req.body.userId || req.query.userId;

      if (!userId) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Check quota first
      const quota = await subscriptionManager.checkQuota(userId, usageType);

      if (!quota.allowed) {
        const subscription = await subscriptionManager.getUserSubscription(userId);

        // Determine if at soft limit (80-99%)
        const isAtSoftLimit = quota.percentage && quota.percentage >= 80 && quota.percentage < 100;

        if (isAtSoftLimit) {
          // Allow action but send warning in response
          req.quotaWarning = {
            used: quota.used,
            limit: quota.limit,
            remaining: quota.remaining,
            percentage: quota.percentage,
            message: `You've used ${Math.round(quota.percentage)}% of your monthly ${usageType} quota`
          };
        } else {
          // Hard limit reached
          return res.status(403).json({
            error: `Monthly ${usageType} quota exceeded`,
            code: 'QUOTA_EXCEEDED',
            quota: {
              used: quota.used,
              limit: quota.limit,
              remaining: 0,
              percentage: 100
            },
            current_tier: subscription.tier,
            upgrade_url: '/pricing'
          });
        }
      }

      // Store original send function
      const originalSend = res.send;

      // Override send to track usage on successful responses
      res.send = function (data) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          subscriptionManager.trackUsage(userId, usageType, 1)
            .catch(error => {
              console.error(`Failed to track ${usageType} usage:`, error);
            });
        }
        return originalSend.call(this, data);
      };

      // Attach quota info to request
      req.quota = quota;
      next();
    } catch (error) {
      console.error('Error in enforceQuota middleware:', error);
      res.status(500).json({ error: 'Failed to enforce quota' });
    }
  };
}

/**
 * Middleware to add quota warning to response
 */
export function addQuotaWarning(req, res, next) {
  const originalJson = res.json;

  res.json = function (data) {
    if (req.quotaWarning && res.statusCode >= 200 && res.statusCode < 300) {
      data.quota_warning = req.quotaWarning;
    }
    return originalJson.call(this, data);
  };

  next();
}

export default {
  requireTier,
  checkQuota,
  trackUsage,
  requireFeature,
  enforceQuota,
  addQuotaWarning
};
