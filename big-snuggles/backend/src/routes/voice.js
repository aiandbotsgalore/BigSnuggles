import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { createVoiceSession, getVoiceSession, endVoiceSession, getUserSessions } from '../services/voiceService.js';

const router = express.Router();

/**
 * POST /api/voice/session/create
 * Create a new voice session with Gemini Live API
 */
router.post('/session/create', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { personalityMode = 'gangster_mode' } = req.body;
    
    // Check if user already has an active session
    const existingSessions = getUserSessions(userId);
    if (existingSessions.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'User already has an active voice session. Please end it first.'
      });
    }

    // Create new session (websocket will be attached later)
    const session = await createVoiceSession(userId, personalityMode, null);
    
    res.status(201).json({
      success: true,
      data: {
        sessionId: session.sessionId,
        userId: session.userId,
        personalityMode: session.personalityMode,
        status: 'ready',
        config: {
          sampleRate: 16000,
          outputSampleRate: 24000,
          chunkSizeMs: 100
        },
        message: 'Voice session created. Connect via WebSocket to start streaming.'
      }
    });
  } catch (error) {
    console.error('Error creating voice session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create voice session'
    });
  }
});

/**
 * GET /api/voice/session/:id/status
 * Get voice session status and metrics
 */
router.get('/session/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const userId = req.user.id;
    
    const session = getVoiceSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Voice session not found'
      });
    }

    // Verify user owns this session
    if (session.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to voice session'
      });
    }

    const duration = session.startTime ? Date.now() - session.startTime : 0;
    const remainingTime = Math.max(0, 900000 - duration); // 15 minutes max

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        userId: session.userId,
        personalityMode: session.personalityMode,
        isActive: session.isActive,
        duration: duration,
        remainingTime: remainingTime,
        shouldWarn: session.shouldWarn(),
        metrics: {
          totalAudioSent: session.metrics.totalAudioSent,
          totalAudioReceived: session.metrics.totalAudioReceived,
          averageLatency: session.metrics.averageLatency,
          interruptions: session.metrics.interruptions,
          errors: session.metrics.errors
        }
      }
    });
  } catch (error) {
    console.error('Error fetching voice session status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch voice session status'
    });
  }
});

/**
 * POST /api/voice/session/:id/end
 * End voice session and get final metrics
 */
router.post('/session/:id/end', authMiddleware, async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const userId = req.user.id;
    
    const session = getVoiceSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Voice session not found'
      });
    }

    // Verify user owns this session
    if (session.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to voice session'
      });
    }

    const result = await endVoiceSession(sessionId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error ending voice session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end voice session'
    });
  }
});

/**
 * GET /api/voice/sessions
 * Get all active sessions for current user
 */
router.get('/sessions', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const sessions = getUserSessions(userId);

    res.json({
      success: true,
      data: {
        count: sessions.length,
        sessions: sessions.map(s => ({
          sessionId: s.sessionId,
          personalityMode: s.personalityMode,
          isActive: s.isActive,
          duration: s.startTime ? Date.now() - s.startTime : 0,
          metrics: {
            averageLatency: s.metrics.averageLatency,
            interruptions: s.metrics.interruptions,
            errors: s.metrics.errors
          }
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user sessions'
    });
  }
});

/**
 * POST /api/voice/session/:id/text
 * Send text message in fallback mode
 */
router.post('/session/:id/text', authMiddleware, async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const { text } = req.body;
    const userId = req.user.id;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text message is required'
      });
    }

    const session = getVoiceSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Voice session not found'
      });
    }

    // Verify user owns this session
    if (session.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to voice session'
      });
    }

    const result = await session.processTextInput(text);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error processing text input:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process text input'
    });
  }
});

export default router;
