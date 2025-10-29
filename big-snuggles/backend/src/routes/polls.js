/**
 * Polls Routes
 * 
 * REST API endpoints for poll management:
 * - POST /api/rooms/:roomId/polls/create - Create new poll (host only)
 * - GET /api/rooms/:roomId/polls/active - Get active poll
 * - POST /api/polls/:pollId/vote - Submit vote
 * - GET /api/polls/:pollId/results - Get poll results
 * - GET /api/rooms/:roomId/polls/history - Get poll history
 * - POST /api/polls/:pollId/close - Manually close poll (creator only)
 * - GET /api/rooms/:roomId/engagement/leaderboard - Get engagement leaderboard
 * - GET /api/rooms/:roomId/engagement/stats - Get user engagement stats
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import votingManager from '../services/votingManager.js';
import roomManager from '../services/roomManager.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/rooms/:roomId/polls/create
 * Create a new poll in a room
 */
router.post('/:roomId/polls/create', async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const { pollType, question, options, durationSeconds } = req.body;

    // Validate required fields
    if (!pollType || !question || !options) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: pollType, question, options'
      });
    }

    // Check if user is in the room
    const roomResult = await roomManager.getRoomById(roomId);
    if (!roomResult.success) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    const result = await votingManager.createPoll(roomId, userId, {
      pollType,
      question,
      options,
      durationSeconds: durationSeconds || 60
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating poll:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create poll'
    });
  }
});

/**
 * GET /api/rooms/:roomId/polls/active
 * Get active poll in a room
 */
router.get('/:roomId/polls/active', async (req, res) => {
  try {
    const { roomId } = req.params;

    const result = await votingManager.getActivePoll(roomId);

    if (!result.poll) {
      return res.json({
        success: true,
        poll: null,
        message: 'No active poll in this room'
      });
    }

    // Get results for the active poll
    const resultsData = await votingManager.getPollResults(result.poll.id);

    res.json({
      success: true,
      poll: result.poll,
      results: resultsData.results
    });
  } catch (error) {
    console.error('Error getting active poll:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active poll'
    });
  }
});

/**
 * POST /api/polls/:pollId/vote
 * Submit a vote for a poll
 */
router.post('/polls/:pollId/vote', async (req, res) => {
  try {
    const { pollId } = req.params;
    const userId = req.user.id;
    const { optionId } = req.body;

    if (!optionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: optionId'
      });
    }

    const result = await votingManager.castVote(pollId, userId, optionId);

    res.json(result);
  } catch (error) {
    console.error('Error casting vote:', error);
    
    const statusCode = error.message.includes('already voted') ? 409 : 500;
    
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to cast vote'
    });
  }
});

/**
 * GET /api/polls/:pollId/results
 * Get poll results
 */
router.get('/polls/:pollId/results', async (req, res) => {
  try {
    const { pollId } = req.params;

    const result = await votingManager.getPollResults(pollId);

    res.json(result);
  } catch (error) {
    console.error('Error getting poll results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get poll results'
    });
  }
});

/**
 * GET /api/rooms/:roomId/polls/history
 * Get poll history for a room
 */
router.get('/:roomId/polls/history', async (req, res) => {
  try {
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const result = await votingManager.getPollHistory(roomId, limit);

    res.json(result);
  } catch (error) {
    console.error('Error getting poll history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get poll history'
    });
  }
});

/**
 * POST /api/polls/:pollId/close
 * Manually close a poll (creator only)
 */
router.post('/polls/:pollId/close', async (req, res) => {
  try {
    const { pollId } = req.params;
    const userId = req.user.id;

    const result = await votingManager.closePoll(pollId, userId);

    res.json(result);
  } catch (error) {
    console.error('Error closing poll:', error);
    
    const statusCode = error.message.includes('Only the poll creator') ? 403 : 500;
    
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to close poll'
    });
  }
});

/**
 * GET /api/rooms/:roomId/engagement/leaderboard
 * Get engagement leaderboard for a room
 */
router.get('/:roomId/engagement/leaderboard', async (req, res) => {
  try {
    const { roomId } = req.params;

    const result = await votingManager.getRoomLeaderboard(roomId);

    res.json(result);
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboard'
    });
  }
});

/**
 * GET /api/rooms/:roomId/engagement/stats
 * Get user engagement stats for a room
 */
router.get('/:roomId/engagement/stats', async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const result = await votingManager.getEngagementStats(userId, roomId);

    res.json(result);
  } catch (error) {
    console.error('Error getting engagement stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get engagement stats'
    });
  }
});

export default router;
