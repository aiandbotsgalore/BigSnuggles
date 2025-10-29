/**
 * Room Routes
 * 
 * REST API endpoints for room management:
 * - POST /api/rooms/create - Create new room
 * - GET /api/rooms/:roomId - Get room details
 * - GET /api/rooms/code/:roomCode - Get room by code
 * - POST /api/rooms/:roomId/join - Join room
 * - DELETE /api/rooms/:roomId/leave - Leave room
 * - GET /api/rooms/:roomId/participants - Get participants
 * - GET /api/rooms/:roomId/messages - Get messages
 * - DELETE /api/rooms/:roomId - Delete room (host only)
 * - PATCH /api/rooms/:roomId/state - Update room state
 */

import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import roomManager from '../services/roomManager.js';
import { requireFeature, enforceQuota } from '../middleware/featureGates.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/rooms/create
 * Create a new room (Premium+ only)
 */
router.post('/create', requireFeature('rooms.can_create'), enforceQuota('rooms_created'), async (req, res) => {
  try {
    const { name, maxParticipants = 10 } = req.body;
    const userId = req.user.id;

    // Validate max participants
    if (maxParticipants < 1 || maxParticipants > 50) {
      return res.status(400).json({
        success: false,
        error: 'Max participants must be between 1 and 50'
      });
    }

    const result = await roomManager.createRoom(userId, name, maxParticipants);

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create room'
    });
  }
});

/**
 * GET /api/rooms/code/:roomCode
 * Get room details by room code
 */
router.get('/code/:roomCode', async (req, res) => {
  try {
    const { roomCode } = req.params;

    if (!roomCode || roomCode.length !== 6) {
      return res.status(400).json({
        success: false,
        error: 'Invalid room code format'
      });
    }

    const result = await roomManager.getRoomByCode(roomCode);

    res.json(result);
  } catch (error) {
    console.error('Error fetching room:', error);
    
    if (error.message === 'Room not found') {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch room'
    });
  }
});

/**
 * GET /api/rooms/:roomId
 * Get room details by ID
 */
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    const result = await roomManager.getRoomById(roomId);

    res.json(result);
  } catch (error) {
    console.error('Error fetching room:', error);
    
    if (error.message === 'Room not found') {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch room'
    });
  }
});

/**
 * POST /api/rooms/:roomId/join
 * Join a room (initial database entry, WebSocket connection handles real-time)
 */
router.post('/:roomId/join', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { displayName } = req.body;
    const userId = req.user.id;

    if (!displayName || displayName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Display name is required'
      });
    }

    // Note: Full join happens via WebSocket, this just validates and returns room info
    const result = await roomManager.getRoomById(roomId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Check if room is full
    const room = result.room;
    const onlineCount = room.participants.filter(p => p.is_online).length;

    if (onlineCount >= room.maxParticipants) {
      return res.status(403).json({
        success: false,
        error: 'Room is full'
      });
    }

    res.json({
      success: true,
      message: 'Ready to join room. Connect via WebSocket to complete.',
      room: {
        id: room.id,
        roomCode: room.roomCode,
        name: room.name,
        currentMode: room.currentMode,
        hostUserId: room.hostUserId,
        participantCount: onlineCount,
        maxParticipants: room.maxParticipants
      }
    });
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to join room'
    });
  }
});

/**
 * DELETE /api/rooms/:roomId/leave
 * Leave a room
 */
router.delete('/:roomId/leave', async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    // This is primarily handled via WebSocket disconnect
    // But can also be called directly
    res.json({
      success: true,
      message: 'Leave room via WebSocket disconnect'
    });
  } catch (error) {
    console.error('Error leaving room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to leave room'
    });
  }
});

/**
 * GET /api/rooms/:roomId/participants
 * Get all participants in a room
 */
router.get('/:roomId/participants', async (req, res) => {
  try {
    const { roomId } = req.params;

    const result = await roomManager.getParticipants(roomId);

    res.json(result);
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch participants'
    });
  }
});

/**
 * GET /api/rooms/:roomId/messages
 * Get recent messages in a room
 */
router.get('/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const result = await roomManager.getRoomMessages(roomId, limit);

    res.json(result);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
});

/**
 * PATCH /api/rooms/:roomId/state
 * Update room state (host only)
 */
router.patch('/:roomId/state', async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    // Verify user is host
    const isHost = await roomManager.isHost(roomId, userId);
    if (!isHost) {
      return res.status(403).json({
        success: false,
        error: 'Only the host can update room state'
      });
    }

    const result = await roomManager.updateRoomState(roomId, updates);

    res.json(result);
  } catch (error) {
    console.error('Error updating room state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update room state'
    });
  }
});

/**
 * DELETE /api/rooms/:roomId
 * Delete a room (host only)
 */
router.delete('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const result = await roomManager.deleteRoom(roomId, userId);

    res.json(result);
  } catch (error) {
    console.error('Error deleting room:', error);
    
    if (error.message === 'Only the host can delete the room') {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete room'
    });
  }
});

export default router;
