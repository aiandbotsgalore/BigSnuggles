import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import sessionService from '../services/sessionService.js';

const router = express.Router();

/**
 * POST /api/session/create
 * Create a new conversation session
 */
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const session = await sessionService.createSession(userId);
    
    res.status(201).json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create session'
    });
  }
});

/**
 * GET /api/session/:id
 * Get session details and conversation history
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const userId = req.user.id;

    const session = await sessionService.getSession(sessionId, userId);
    
    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session'
    });
  }
});

/**
 * PUT /api/session/:id/state
 * Update session state
 */
router.put('/:id/state', authMiddleware, async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const userId = req.user.id;
    const state = req.body;

    const updatedState = await sessionService.updateSessionState(sessionId, userId, state);
    
    res.json({
      success: true,
      data: updatedState
    });
  } catch (error) {
    console.error('Error updating session state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update session state'
    });
  }
});

/**
 * POST /api/session/:id/message
 * Add a message to the conversation
 */
router.post('/:id/message', authMiddleware, async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const userId = req.user.id;
    const message = req.body;

    if (!message.type || !message.content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type and content'
      });
    }

    const savedMessage = await sessionService.addMessage(sessionId, userId, message);
    
    res.status(201).json({
      success: true,
      data: savedMessage
    });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add message'
    });
  }
});

/**
 * POST /api/session/:id/end
 * End a session and store analytics
 */
router.post('/:id/end', authMiddleware, async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const userId = req.user.id;
    const metrics = req.body;

    const analytics = await sessionService.endSession(sessionId, userId, metrics);
    
    res.json({
      success: true,
      data: analytics,
      message: 'Session ended successfully'
    });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end session'
    });
  }
});

export default router;
