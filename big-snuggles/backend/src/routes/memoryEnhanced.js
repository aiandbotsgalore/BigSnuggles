/**
 * Enhanced Memory Routes - Phase 6
 * Advanced memory management with associations, filtering, and statistics
 */

import express from 'express';
import memoryService from '../services/memoryService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/memory/enhanced
 * Store memory with enhanced features
 */
router.post('/enhanced', async (req, res) => {
  try {
    const { userId } = req.user;
    const memoryData = req.body;

    // Validate required fields
    if (!memoryData.key || !memoryData.value) {
      return res.status(400).json({ 
        error: 'Missing required fields: key, value' 
      });
    }

    const result = await memoryService.storeEnhancedMemory({
      userId,
      sessionId: memoryData.sessionId,
      key: memoryData.key,
      value: memoryData.value,
      memoryType: memoryData.memoryType || 'episodic',
      tags: memoryData.tags || [],
      contextData: memoryData.contextData || {},
      sourceConversationId: memoryData.sourceConversationId,
      emotionalWeight: memoryData.emotionalWeight,
      keywords: memoryData.keywords,
      expiresAt: memoryData.expiresAt
    });

    res.json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    console.error('Error storing enhanced memory:', error);
    res.status(500).json({ 
      error: 'Failed to store memory',
      details: error.message 
    });
  }
});

/**
 * GET /api/memory/search
 * Advanced memory search with filters
 */
router.get('/search', async (req, res) => {
  try {
    const { userId } = req.user;
    const options = {
      memoryType: req.query.memoryType,
      tags: req.query.tags ? req.query.tags.split(',') : null,
      minImportance: req.query.minImportance ? parseInt(req.query.minImportance) : null,
      searchText: req.query.q,
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
      dateRange: req.query.startDate && req.query.endDate ? {
        start: req.query.startDate,
        end: req.query.endDate
      } : null
    };

    const results = await memoryService.searchMemories(userId, options);
    
    res.json({ 
      success: true, 
      data: results,
      count: results.length 
    });
  } catch (error) {
    console.error('Error searching memories:', error);
    res.status(500).json({ 
      error: 'Failed to search memories',
      details: error.message 
    });
  }
});

/**
 * POST /api/memory/associate
 * Create association between two memories
 */
router.post('/associate', async (req, res) => {
  try {
    const { userId } = req.user;
    const { memoryId1, memoryId2, associationType, strength } = req.body;

    if (!memoryId1 || !memoryId2 || !associationType) {
      return res.status(400).json({ 
        error: 'Missing required fields: memoryId1, memoryId2, associationType' 
      });
    }

    // Verify user owns both memories
    const memories = await Promise.all([
      memoryService.getUserMemories(userId, 1000),
      Promise.resolve([]) // We'll validate ownership in the association creation
    ]);

    const userMemoryIds = memories[0].map(m => m.id);
    if (!userMemoryIds.includes(memoryId1) || !userMemoryIds.includes(memoryId2)) {
      return res.status(403).json({ 
        error: 'You can only associate your own memories' 
      });
    }

    const association = await memoryService.createMemoryAssociation(
      memoryId1, 
      memoryId2, 
      associationType, 
      strength || 0.5
    );

    res.json({ 
      success: true, 
      data: association 
    });
  } catch (error) {
    console.error('Error creating memory association:', error);
    res.status(500).json({ 
      error: 'Failed to create association',
      details: error.message 
    });
  }
});

/**
 * GET /api/memory/:id/associations
 * Get associated memories for a specific memory
 */
router.get('/:id/associations', async (req, res) => {
  try {
    const { userId } = req.user;
    const { id } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    // Verify user owns the memory
    const userMemories = await memoryService.getUserMemories(userId, 1000);
    const memoryExists = userMemories.some(m => m.id === id);
    
    if (!memoryExists) {
      return res.status(404).json({ 
        error: 'Memory not found' 
      });
    }

    const associations = await memoryService.getAssociatedMemories(id, limit);
    
    res.json({ 
      success: true, 
      data: associations 
    });
  } catch (error) {
    console.error('Error getting memory associations:', error);
    res.status(500).json({ 
      error: 'Failed to get associations',
      details: error.message 
    });
  }
});

/**
 * GET /api/memory/statistics
 * Get memory statistics for the user
 */
router.get('/statistics', async (req, res) => {
  try {
    const { userId } = req.user;
    
    const statistics = await memoryService.getMemoryStatistics(userId);
    
    res.json({ 
      success: true, 
      data: statistics 
    });
  } catch (error) {
    console.error('Error getting memory statistics:', error);
    res.status(500).json({ 
      error: 'Failed to get statistics',
      details: error.message 
    });
  }
});

/**
 * POST /api/memory/cleanup
 * Clean up expired memories (admin/scheduled task)
 */
router.post('/cleanup', async (req, res) => {
  try {
    // This could be restricted to admin users in production
    const cleanedMemories = await memoryService.cleanupExpiredMemories();
    
    res.json({ 
      success: true, 
      data: {
        cleanedCount: cleanedMemories.length,
        message: `Cleaned up ${cleanedMemories.length} expired memories`
      }
    });
  } catch (error) {
    console.error('Error cleaning up memories:', error);
    res.status(500).json({ 
      error: 'Failed to cleanup memories',
      details: error.message 
    });
  }
});

/**
 * GET /api/memory/types
 * Get available memory types
 */
router.get('/types', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../utils/supabase.js');
    
    const { data, error } = await supabaseAdmin
      .from('memory_types')
      .select('*')
      .order('type_name');

    if (error) throw error;
    
    res.json({ 
      success: true, 
      data: data 
    });
  } catch (error) {
    console.error('Error getting memory types:', error);
    res.status(500).json({ 
      error: 'Failed to get memory types',
      details: error.message 
    });
  }
});

export default router;