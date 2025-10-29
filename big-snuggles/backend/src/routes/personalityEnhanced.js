/**
 * Enhanced Personality Routes - Phase 6
 * Adaptive personality learning and consent management
 */

import express from 'express';
import personalityService from '../services/personalityService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/personality/learn
 * Learn from user interaction for adaptive personality
 */
router.post('/learn', async (req, res) => {
  try {
    const { userId } = req.user;
    const interactionData = req.body;

    // Validate required fields
    if (!interactionData) {
      return res.status(400).json({ 
        error: 'Interaction data is required' 
      });
    }

    const result = await personalityService.learnFromInteraction(userId, interactionData);
    
    res.json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    console.error('Error learning from interaction:', error);
    res.status(500).json({ 
      error: 'Failed to learn from interaction',
      details: error.message 
    });
  }
});

/**
 * GET /api/personality/recommendations
 * Get adaptive personality recommendations
 */
router.get('/recommendations', async (req, res) => {
  try {
    const { userId } = req.user;
    
    const recommendations = await personalityService.getPersonalityRecommendations(userId);
    
    res.json({ 
      success: true, 
      data: recommendations 
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ 
      error: 'Failed to get recommendations',
      details: error.message 
    });
  }
});

/**
 * POST /api/personality/adaptive-mode
 * Apply adaptive personality mode based on context
 */
router.post('/adaptive-mode', async (req, res) => {
  try {
    const { userId } = req.user;
    const interactionContext = req.body;

    const result = await personalityService.applyAdaptiveMode(userId, interactionContext);
    
    res.json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    console.error('Error applying adaptive mode:', error);
    res.status(500).json({ 
      error: 'Failed to apply adaptive mode',
      details: error.message 
    });
  }
});

/**
 * GET /api/personality/consent/:category
 * Get consent status for a category
 */
router.get('/consent/:category', async (req, res) => {
  try {
    const { userId } = req.user;
    const { category } = req.params;

    const consentStatus = await personalityService.getConsentStatus(userId, category);
    
    res.json({ 
      success: true, 
      data: {
        category,
        consented: consentStatus?.is_consented || false,
        consentDate: consentStatus?.consent_date
      }
    });
  } catch (error) {
    console.error('Error getting consent status:', error);
    res.status(500).json({ 
      error: 'Failed to get consent status',
      details: error.message 
    });
  }
});

/**
 * POST /api/personality/consent
 * Set consent for a preference
 */
router.post('/consent', async (req, res) => {
  try {
    const { userId } = req.user;
    const { category, preferenceKey, consented, preferenceValue } = req.body;

    if (!category || !preferenceKey) {
      return res.status(400).json({ 
        error: 'Missing required fields: category, preferenceKey' 
      });
    }

    const result = await personalityService.setConsent(
      userId, 
      category, 
      preferenceKey, 
      consented, 
      preferenceValue
    );
    
    res.json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    console.error('Error setting consent:', error);
    res.status(500).json({ 
      error: 'Failed to set consent',
      details: error.message 
    });
  }
});

/**
 * GET /api/personality/preferences
 * Get all user preferences with consent status
 */
router.get('/preferences', async (req, res) => {
  try {
    const { userId } = req.user;
    
    const preferences = await personalityService.getUserPreferences(userId);
    
    // Group preferences by category
    const groupedPreferences = preferences.reduce((acc, pref) => {
      if (!acc[pref.category]) {
        acc[pref.category] = {};
      }
      acc[pref.category][pref.preference_key] = {
        value: pref.preference_value,
        isConsented: pref.is_consented,
        consentDate: pref.consent_date
      };
      return acc;
    }, {});
    
    res.json({ 
      success: true, 
      data: groupedPreferences 
    });
  } catch (error) {
    console.error('Error getting user preferences:', error);
    res.status(500).json({ 
      error: 'Failed to get preferences',
      details: error.message 
    });
  }
});

/**
 * PUT /api/personality/mode/:modeId
 * Set personality mode (enhanced version)
 */
router.put('/mode/:modeId', async (req, res) => {
  try {
    const { userId } = req.user;
    const { modeId } = req.params;
    const { forceMode = false, reason = '' } = req.body;

    // If forceMode is false, check if adaptive mode should be used
    if (!forceMode) {
      const adaptiveResult = await personalityService.applyAdaptiveMode(userId, {
        requestedMode: modeId,
        reason
      });
      
      return res.json({ 
        success: true, 
        data: adaptiveResult 
      });
    }

    // Force mode change
    const result = await personalityService.setPersonalityMode(userId, modeId);
    
    // Learn from this interaction
    await personalityService.learnFromInteraction(userId, {
      modeUsed: modeId,
      forcedChange: true,
      reason,
      userInitiated: true
    });
    
    res.json({ 
      success: true, 
      data: {
        mode: modeId,
        wasAdaptive: false,
        forced: true,
        result
      }
    });
  } catch (error) {
    console.error('Error setting personality mode:', error);
    res.status(500).json({ 
      error: 'Failed to set personality mode',
      details: error.message 
    });
  }
});

/**
 * GET /api/personality/adaptive-status
 * Get current adaptive learning status
 */
router.get('/adaptive-status', async (req, res) => {
  try {
    const { userId } = req.user;
    
    const currentState = await personalityService.getUserPersonalityState(userId);
    const recommendations = await personalityService.getPersonalityRecommendations(userId);
    
    const adaptiveStatus = {
      learningEnabled: currentState.learning_enabled,
      adaptationLevel: currentState.adaptation_level,
      interactionCount: currentState.interaction_count,
      lastInteractionAt: currentState.last_interaction_at,
      recommendations,
      evolution: currentState.personality_evolution
    };
    
    res.json({ 
      success: true, 
      data: adaptiveStatus 
    });
  } catch (error) {
    console.error('Error getting adaptive status:', error);
    res.status(500).json({ 
      error: 'Failed to get adaptive status',
      details: error.message 
    });
  }
});

/**
 * PUT /api/personality/adaptive-settings
 * Update adaptive learning settings
 */
router.put('/adaptive-settings', async (req, res) => {
  try {
    const { userId } = req.user;
    const { learningEnabled, adaptationLevel } = req.body;

    // Get current state
    const currentState = await personalityService.getUserPersonalityState(userId);
    
    const { supabaseAdmin } = await import('../utils/supabase.js');
    const { data, error } = await supabaseAdmin
      .from('personality_state')
      .update({
        learning_enabled: learningEnabled !== undefined ? learningEnabled : currentState.learning_enabled,
        adaptation_level: adaptationLevel !== undefined ? adaptationLevel : currentState.adaptation_level,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) throw error;
    
    res.json({ 
      success: true, 
      data 
    });
  } catch (error) {
    console.error('Error updating adaptive settings:', error);
    res.status(500).json({ 
      error: 'Failed to update adaptive settings',
      details: error.message 
    });
  }
});

/**
 * GET /api/personality/modes/enhanced
 * Get available personality modes with metadata
 */
router.get('/modes/enhanced', (req, res) => {
  try {
    const modes = personalityService.getAvailableModes().map(mode => {
      const fullMode = personalityService.getMode(mode.id);
      return {
        id: mode.id,
        name: mode.name,
        description: mode.description,
        behavior: fullMode.behavior,
        systemPrompt: fullMode.systemPrompt
      };
    });
    
    res.json({ 
      success: true, 
      data: modes 
    });
  } catch (error) {
    console.error('Error getting enhanced personality modes:', error);
    res.status(500).json({ 
      error: 'Failed to get personality modes',
      details: error.message 
    });
  }
});

export default router;