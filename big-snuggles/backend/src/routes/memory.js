import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import memoryService from '../services/memoryService.js';
import { checkQuota, trackUsage } from '../middleware/featureGates.js';

const router = express.Router();

/**
 * GET /api/memory/:sessionId
 * Get memories for a specific session
 */
router.get('/:sessionId', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const memories = await memoryService.getSessionMemories(userId, sessionId);
    
    res.json({
      success: true,
      data: memories
    });
  } catch (error) {
    console.error('Error fetching session memories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch memories'
    });
  }
});

/**
 * GET /api/memory/user/all
 * Get all memories for the authenticated user
 */
router.get('/user/all', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;

    const memories = await memoryService.getUserMemories(userId, limit);
    
    res.json({
      success: true,
      data: memories
    });
  } catch (error) {
    console.error('Error fetching user memories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch memories'
    });
  }
});

/**
 * GET /api/memory/important
 * Get important memories across all sessions
 */
router.get('/important', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const minImportance = parseInt(req.query.minImportance) || 5;
    const limit = parseInt(req.query.limit) || 20;

    const memories = await memoryService.getImportantMemories(userId, minImportance, limit);
    
    res.json({
      success: true,
      data: memories
    });
  } catch (error) {
    console.error('Error fetching important memories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch important memories'
    });
  }
});

/**
 * POST /api/memory/:sessionId
 * Store a new memory
 * Enforces memory quota based on subscription tier
 */
router.post('/:sessionId', authMiddleware, checkQuota('memories'), trackUsage('memories'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const { key, value, importanceScore, emotionalWeight, expiresAt } = req.body;

    if (!key || !value) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: key and value'
      });
    }

    const memory = await memoryService.storeMemory({
      userId,
      sessionId,
      key,
      value,
      importanceScore,
      emotionalWeight,
      expiresAt
    });
    
    res.status(201).json({
      success: true,
      data: memory
    });
  } catch (error) {
    console.error('Error storing memory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store memory'
    });
  }
});

/**
 * PUT /api/memory/:sessionId/:memoryId
 * Update an existing memory
 */
router.put('/:sessionId/:memoryId', authMiddleware, async (req, res) => {
  try {
    const { memoryId } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const memory = await memoryService.updateMemory(memoryId, userId, updates);
    
    res.json({
      success: true,
      data: memory
    });
  } catch (error) {
    console.error('Error updating memory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update memory'
    });
  }
});

/**
 * DELETE /api/memory/:sessionId/:memoryId
 * Delete a memory
 */
router.delete('/:sessionId/:memoryId', authMiddleware, async (req, res) => {
  try {
    const { memoryId } = req.params;
    const userId = req.user.id;

    await memoryService.deleteMemory(memoryId, userId);
    
    res.json({
      success: true,
      message: 'Memory deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting memory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete memory'
    });
  }
});

export default router;
