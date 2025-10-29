import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import personalityService from '../services/personalityService.js';

const router = express.Router();

/**
 * GET /api/personality/modes
 * Get all available personality modes
 */
router.get('/modes', (req, res) => {
  try {
    const modes = personalityService.getAvailableModes();
    
    res.json({
      success: true,
      data: modes
    });
  } catch (error) {
    console.error('Error fetching personality modes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch personality modes'
    });
  }
});

/**
 * GET /api/personality/mode/:modeId
 * Get details for a specific personality mode
 */
router.get('/mode/:modeId', (req, res) => {
  try {
    const { modeId } = req.params;
    const mode = personalityService.getMode(modeId);
    
    res.json({
      success: true,
      data: mode
    });
  } catch (error) {
    console.error('Error fetching personality mode:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch personality mode'
    });
  }
});

/**
 * GET /api/personality/state
 * Get user's current personality state
 */
router.get('/state', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const state = await personalityService.getUserPersonalityState(userId);
    
    res.json({
      success: true,
      data: state
    });
  } catch (error) {
    console.error('Error fetching personality state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch personality state'
    });
  }
});

/**
 * POST /api/personality/mode
 * Set the current personality mode
 */
router.post('/mode', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { modeId } = req.body;

    if (!modeId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: modeId'
      });
    }

    const state = await personalityService.setPersonalityMode(userId, modeId);
    
    res.json({
      success: true,
      data: state,
      message: 'Personality mode updated successfully'
    });
  } catch (error) {
    console.error('Error setting personality mode:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to set personality mode'
    });
  }
});

/**
 * PUT /api/personality/mood
 * Update mood state
 */
router.put('/mood', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { moodState } = req.body;

    if (!moodState) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: moodState'
      });
    }

    const state = await personalityService.updateMoodState(userId, moodState);
    
    res.json({
      success: true,
      data: state,
      message: 'Mood state updated successfully'
    });
  } catch (error) {
    console.error('Error updating mood state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update mood state'
    });
  }
});

/**
 * PUT /api/personality/preferences
 * Update user preferences
 */
router.put('/preferences', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = req.body;

    const state = await personalityService.updatePreferences(userId, preferences);
    
    res.json({
      success: true,
      data: state,
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    });
  }
});

export default router;
