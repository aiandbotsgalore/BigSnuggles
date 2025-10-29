/**
 * Socket.IO Room Event Handlers
 * 
 * Real-time WebSocket events for multi-user rooms:
 * - room:join - User joins room
 * - room:leave - User leaves room
 * - room:message - Broadcast message to room
 * - room:state-update - Sync conversation state
 * - room:presence-update - Update user online status
 * - room:voice-start - Start voice conversation
 * - room:voice-stop - Stop voice conversation
 */

import roomManager from '../services/roomManager.js';
import votingManager from '../services/votingManager.js';
import { supabase } from '../utils/supabase.js';

/**
 * Initialize Socket.IO room handlers
 */
export function initializeRoomHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`Socket.IO client connected: ${socket.id}`);

    // Track authenticated user
    let authenticatedUserId = null;
    let currentRoomId = null;

    /**
     * Authenticate Socket.IO connection
     */
    socket.on('room:authenticate', async (data) => {
      try {
        const { token } = data;

        if (!token) {
          socket.emit('room:error', { message: 'Authentication token required' });
          return;
        }

        // Verify token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
          socket.emit('room:error', { message: 'Invalid authentication token' });
          return;
        }

        authenticatedUserId = user.id;
        socket.emit('room:authenticated', { userId: user.id });
        
        console.log(`Socket ${socket.id} authenticated as user ${user.id}`);
      } catch (error) {
        console.error('Authentication error:', error);
        socket.emit('room:error', { message: 'Authentication failed' });
      }
    });

    /**
     * Join a room
     */
    socket.on('room:join', async (data) => {
      try {
        if (!authenticatedUserId) {
          socket.emit('room:error', { message: 'Not authenticated' });
          return;
        }

        const { roomId, displayName } = data;

        if (!roomId || !displayName) {
          socket.emit('room:error', { message: 'Room ID and display name required' });
          return;
        }

        // Join room via room manager
        const result = await roomManager.joinRoom(roomId, authenticatedUserId, displayName, socket.id);

        if (!result.success) {
          socket.emit('room:error', { message: result.error || 'Failed to join room' });
          return;
        }

        currentRoomId = roomId;

        // Join Socket.IO room
        socket.join(roomId);

        // Get current participants
        const participants = roomManager.getRoomParticipants(roomId);
        const roomState = roomManager.getRoomState(roomId);

        // Notify user they joined
        socket.emit('room:joined', {
          room: result.room,
          participants,
          state: roomState
        });

        // Notify other participants
        socket.to(roomId).emit('room:participant-joined', {
          participant: {
            userId: authenticatedUserId,
            displayName,
            socketId: socket.id,
            joinedAt: new Date().toISOString()
          }
        });

        // Get recent messages
        const messagesResult = await roomManager.getRoomMessages(roomId, 50);
        if (messagesResult.success) {
          socket.emit('room:messages-history', {
            messages: messagesResult.messages
          });
        }

        console.log(`User ${displayName} joined room ${roomId}`);
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('room:error', { message: error.message || 'Failed to join room' });
      }
    });

    /**
     * Leave a room
     */
    socket.on('room:leave', async () => {
      try {
        if (!currentRoomId) {
          return;
        }

        await handleLeaveRoom(socket, currentRoomId, authenticatedUserId);
      } catch (error) {
        console.error('Error leaving room:', error);
        socket.emit('room:error', { message: 'Failed to leave room' });
      }
    });

    /**
     * Send a message to the room
     */
    socket.on('room:message', async (data) => {
      try {
        if (!authenticatedUserId || !currentRoomId) {
          socket.emit('room:error', { message: 'Not in a room' });
          return;
        }

        const { messageType, content, metadata = {} } = data;

        if (!messageType || !content) {
          socket.emit('room:error', { message: 'Message type and content required' });
          return;
        }

        // Store message in database
        const result = await roomManager.insertMessage(
          currentRoomId,
          authenticatedUserId,
          messageType,
          content,
          metadata
        );

        if (!result.success) {
          socket.emit('room:error', { message: 'Failed to store message' });
          return;
        }

        // Broadcast to all participants in the room
        io.to(currentRoomId).emit('room:message-received', {
          message: result.message
        });

        console.log(`Message sent to room ${currentRoomId}: ${messageType}`);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('room:error', { message: 'Failed to send message' });
      }
    });

    /**
     * Update room state (host only)
     */
    socket.on('room:state-update', async (data) => {
      try {
        if (!authenticatedUserId || !currentRoomId) {
          socket.emit('room:error', { message: 'Not in a room' });
          return;
        }

        // Verify user is host
        const isHost = await roomManager.isHost(currentRoomId, authenticatedUserId);
        if (!isHost) {
          socket.emit('room:error', { message: 'Only host can update room state' });
          return;
        }

        const { updates } = data;

        // Update room state
        const result = await roomManager.updateRoomState(currentRoomId, updates);

        if (!result.success) {
          socket.emit('room:error', { message: 'Failed to update room state' });
          return;
        }

        // Broadcast state update to all participants
        io.to(currentRoomId).emit('room:state-updated', {
          state: result.state
        });

        console.log(`Room ${currentRoomId} state updated:`, updates);
      } catch (error) {
        console.error('Error updating room state:', error);
        socket.emit('room:error', { message: 'Failed to update room state' });
      }
    });

    /**
     * Update presence (heartbeat)
     */
    socket.on('room:presence-update', async () => {
      try {
        if (!authenticatedUserId || !currentRoomId) {
          return;
        }

        // Update last_seen timestamp
        await supabase
          .from('room_participants')
          .update({ last_seen: new Date().toISOString() })
          .eq('room_id', currentRoomId)
          .eq('user_id', authenticatedUserId);

      } catch (error) {
        console.error('Error updating presence:', error);
      }
    });

    /**
     * Voice conversation started
     */
    socket.on('room:voice-start', async (data) => {
      try {
        if (!authenticatedUserId || !currentRoomId) {
          socket.emit('room:error', { message: 'Not in a room' });
          return;
        }

        // Broadcast to room that voice conversation started
        io.to(currentRoomId).emit('room:voice-started', {
          userId: authenticatedUserId,
          timestamp: new Date().toISOString()
        });

        // Update room state
        await roomManager.updateRoomState(currentRoomId, {
          conversationActive: true
        });

        console.log(`Voice conversation started in room ${currentRoomId}`);
      } catch (error) {
        console.error('Error starting voice:', error);
        socket.emit('room:error', { message: 'Failed to start voice' });
      }
    });

    /**
     * Voice conversation stopped
     */
    socket.on('room:voice-stop', async (data) => {
      try {
        if (!authenticatedUserId || !currentRoomId) {
          return;
        }

        // Broadcast to room that voice conversation stopped
        io.to(currentRoomId).emit('room:voice-stopped', {
          userId: authenticatedUserId,
          timestamp: new Date().toISOString()
        });

        // Update room state
        await roomManager.updateRoomState(currentRoomId, {
          conversationActive: false
        });

        console.log(`Voice conversation stopped in room ${currentRoomId}`);
      } catch (error) {
        console.error('Error stopping voice:', error);
      }
    });

    /**
     * Create poll
     */
    socket.on('poll:create', async (data) => {
      try {
        if (!authenticatedUserId || !currentRoomId) {
          socket.emit('poll:error', { message: 'Not in a room' });
          return;
        }

        const { pollType, question, options, durationSeconds } = data;

        // Create poll via voting manager
        const result = await votingManager.createPoll(currentRoomId, authenticatedUserId, {
          pollType,
          question,
          options,
          durationSeconds: durationSeconds || 60
        });

        if (!result.success) {
          socket.emit('poll:error', { message: result.error || 'Failed to create poll' });
          return;
        }

        // Broadcast poll to all room participants
        io.to(currentRoomId).emit('poll:created', {
          poll: result.poll
        });

        // Schedule automatic poll expiration broadcast
        setTimeout(async () => {
          const expireResult = await votingManager.expirePoll(result.poll.id);
          if (expireResult.success && expireResult.poll) {
            io.to(currentRoomId).emit('poll:expired', {
              poll: expireResult.poll,
              results: expireResult.results.results
            });

            // If personality mode poll, notify about mode change
            if (expireResult.poll.poll_type === 'personality_mode') {
              const { data: updatedRoom } = await supabase
                .from('rooms')
                .select('current_mode')
                .eq('id', currentRoomId)
                .single();

              if (updatedRoom) {
                io.to(currentRoomId).emit('room:personality-changed', {
                  newMode: updatedRoom.current_mode,
                  reason: 'poll_result'
                });
              }
            }
          }
        }, result.poll.durationSeconds * 1000);

        console.log(`Poll created in room ${currentRoomId}: ${result.poll.id}`);
      } catch (error) {
        console.error('Error creating poll:', error);
        socket.emit('poll:error', { message: error.message || 'Failed to create poll' });
      }
    });

    /**
     * Cast vote
     */
    socket.on('poll:vote', async (data) => {
      try {
        if (!authenticatedUserId || !currentRoomId) {
          socket.emit('poll:error', { message: 'Not in a room' });
          return;
        }

        const { pollId, optionId } = data;

        // Cast vote via voting manager
        const result = await votingManager.castVote(pollId, authenticatedUserId, optionId);

        if (!result.success) {
          socket.emit('poll:error', { message: result.error || 'Failed to cast vote' });
          return;
        }

        // Acknowledge vote to voter
        socket.emit('poll:vote-received', {
          vote: result.vote,
          results: result.results.results
        });

        // Broadcast updated results to all room participants
        io.to(currentRoomId).emit('poll:results-update', {
          pollId: pollId,
          results: result.results.results
        });

        console.log(`Vote cast in poll ${pollId} by user ${authenticatedUserId}`);
      } catch (error) {
        console.error('Error casting vote:', error);
        socket.emit('poll:error', { message: error.message || 'Failed to cast vote' });
      }
    });

    /**
     * Close poll manually
     */
    socket.on('poll:close', async (data) => {
      try {
        if (!authenticatedUserId || !currentRoomId) {
          socket.emit('poll:error', { message: 'Not in a room' });
          return;
        }

        const { pollId } = data;

        // Close poll via voting manager
        const result = await votingManager.closePoll(pollId, authenticatedUserId);

        if (!result.success) {
          socket.emit('poll:error', { message: result.error || 'Failed to close poll' });
          return;
        }

        // Broadcast poll closed to all room participants
        io.to(currentRoomId).emit('poll:closed', {
          poll: result.poll,
          results: result.results.results
        });

        // If personality mode poll, notify about mode change
        if (result.poll.poll_type === 'personality_mode') {
          // Fetch updated room to get new personality mode
          const { data: updatedRoom } = await supabase
            .from('rooms')
            .select('current_mode')
            .eq('id', currentRoomId)
            .single();

          if (updatedRoom) {
            io.to(currentRoomId).emit('room:personality-changed', {
              newMode: updatedRoom.current_mode,
              reason: 'poll_result'
            });
          }
        }

        console.log(`Poll ${pollId} closed manually by user ${authenticatedUserId}`);
      } catch (error) {
        console.error('Error closing poll:', error);
        socket.emit('poll:error', { message: error.message || 'Failed to close poll' });
      }
    });

    /**
     * Handle disconnection
     */
    socket.on('disconnect', async () => {
      console.log(`Socket.IO client disconnected: ${socket.id}`);

      if (currentRoomId && authenticatedUserId) {
        await handleLeaveRoom(socket, currentRoomId, authenticatedUserId);
      }
    });
  });

  /**
   * Helper: Handle leaving a room
   */
  async function handleLeaveRoom(socket, roomId, userId) {
    try {
      // Get participant info before leaving
      const participants = roomManager.getRoomParticipants(roomId);
      const leavingParticipant = participants.find(p => p.socketId === socket.id);

      // Leave room via room manager
      const result = await roomManager.leaveRoom(socket.id);

      if (result.success) {
        // Leave Socket.IO room
        socket.leave(roomId);

        // Notify remaining participants
        socket.to(roomId).emit('room:participant-left', {
          participant: leavingParticipant || { userId, socketId: socket.id }
        });

        socket.emit('room:left', { roomId });

        currentRoomId = null;

        console.log(`User ${userId} left room ${roomId}`);
      }
    } catch (error) {
      console.error('Error in handleLeaveRoom:', error);
    }
  }

  console.log('Socket.IO room handlers initialized');
}

export default initializeRoomHandlers;
