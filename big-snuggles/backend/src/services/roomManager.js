/**
 * Room Manager Service
 * 
 * Handles multi-user space room operations:
 * - Create/join/leave rooms
 * - User presence tracking
 * - Room capacity management
 * - State synchronization
 * - Broadcast messaging
 */

import { supabase } from '../utils/supabase.js';

class RoomManager {
  constructor() {
    // Store active room connections
    this.rooms = new Map(); // roomId -> { participants: Map(socketId -> userInfo), state: {} }
    this.socketToRoom = new Map(); // socketId -> roomId
    this.socketToUser = new Map(); // socketId -> userId
    
    console.log('RoomManager initialized');
  }

  /**
   * Create a new room
   */
  async createRoom(userId, roomName = null, maxParticipants = 10) {
    try {
      // Check user's active rooms count (rate limiting)
      const { data: userRooms, error: countError } = await supabase
        .from('rooms')
        .select('id')
        .eq('host_user_id', userId)
        .eq('is_active', true);

      if (countError) throw countError;

      if (userRooms && userRooms.length >= 5) {
        throw new Error('Maximum active rooms limit reached (5 per user)');
      }

      // Generate unique room code
      const { data: roomCode, error: codeError } = await supabase
        .rpc('generate_room_code');

      if (codeError) throw codeError;

      // Create room in database
      const { data: room, error: createError } = await supabase
        .from('rooms')
        .insert({
          room_code: roomCode,
          host_user_id: userId,
          name: roomName,
          max_participants: maxParticipants,
          is_active: true,
          current_mode: 'gangster'
        })
        .select()
        .single();

      if (createError) throw createError;

      // Initialize room in memory
      this.rooms.set(room.id, {
        participants: new Map(),
        state: {
          currentMode: 'gangster',
          conversationActive: false,
          hostUserId: userId
        }
      });

      console.log(`Room created: ${room.room_code} (${room.id})`);

      return {
        success: true,
        room: {
          id: room.id,
          roomCode: room.room_code,
          name: room.name,
          maxParticipants: room.max_participants,
          hostUserId: room.host_user_id,
          currentMode: room.current_mode,
          createdAt: room.created_at,
          joinLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/spaces/${room.room_code}`
        }
      };
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  /**
   * Get room details by room code
   */
  async getRoomByCode(roomCode) {
    try {
      const { data: room, error } = await supabase
        .from('rooms')
        .select(`
          *,
          room_participants (
            id,
            user_id,
            display_name,
            is_online,
            joined_at
          )
        `)
        .eq('room_code', roomCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error) throw error;
      if (!room) throw new Error('Room not found');

      return {
        success: true,
        room: {
          id: room.id,
          roomCode: room.room_code,
          name: room.name,
          maxParticipants: room.max_participants,
          hostUserId: room.host_user_id,
          currentMode: room.current_mode,
          isActive: room.is_active,
          participants: room.room_participants || [],
          participantCount: room.room_participants?.filter(p => p.is_online).length || 0,
          createdAt: room.created_at,
          lastActivity: room.last_activity
        }
      };
    } catch (error) {
      console.error('Error fetching room:', error);
      throw error;
    }
  }

  /**
   * Get room details by room ID
   */
  async getRoomById(roomId) {
    try {
      const { data: room, error } = await supabase
        .from('rooms')
        .select(`
          *,
          room_participants (
            id,
            user_id,
            display_name,
            is_online,
            joined_at,
            last_seen
          )
        `)
        .eq('id', roomId)
        .single();

      if (error) throw error;
      if (!room) throw new Error('Room not found');

      return {
        success: true,
        room: {
          id: room.id,
          roomCode: room.room_code,
          name: room.name,
          maxParticipants: room.max_participants,
          hostUserId: room.host_user_id,
          currentMode: room.current_mode,
          isActive: room.is_active,
          participants: room.room_participants || [],
          participantCount: room.room_participants?.filter(p => p.is_online).length || 0,
          createdAt: room.created_at,
          lastActivity: room.last_activity
        }
      };
    } catch (error) {
      console.error('Error fetching room by ID:', error);
      throw error;
    }
  }

  /**
   * Join a room
   */
  async joinRoom(roomId, userId, displayName, socketId) {
    try {
      // Get room details
      const roomResult = await this.getRoomById(roomId);
      if (!roomResult.success) {
        throw new Error('Room not found');
      }

      const room = roomResult.room;

      // Check if room is full
      const { data: isFull, error: fullError } = await supabase
        .rpc('is_room_full', { target_room_id: roomId });

      if (fullError) throw fullError;

      if (isFull) {
        throw new Error('Room is full');
      }

      // Check if user is already a participant
      const existingParticipant = room.participants.find(p => p.user_id === userId);

      if (existingParticipant) {
        // Update existing participant to online
        const { error: updateError } = await supabase
          .from('room_participants')
          .update({
            is_online: true,
            last_seen: new Date().toISOString(),
            display_name: displayName
          })
          .eq('room_id', roomId)
          .eq('user_id', userId);

        if (updateError) throw updateError;
      } else {
        // Add new participant
        const { error: insertError } = await supabase
          .from('room_participants')
          .insert({
            room_id: roomId,
            user_id: userId,
            display_name: displayName,
            is_online: true
          });

        if (insertError) throw insertError;
      }

      // Add participant to in-memory room
      if (!this.rooms.has(roomId)) {
        this.rooms.set(roomId, {
          participants: new Map(),
          state: {
            currentMode: room.currentMode,
            conversationActive: false,
            hostUserId: room.hostUserId
          }
        });
      }

      const roomData = this.rooms.get(roomId);
      roomData.participants.set(socketId, {
        userId,
        displayName,
        socketId,
        joinedAt: new Date().toISOString()
      });

      // Track socket mappings
      this.socketToRoom.set(socketId, roomId);
      this.socketToUser.set(socketId, userId);

      // Insert system message
      await this.insertSystemMessage(roomId, `${displayName} joined the room`);

      console.log(`User ${displayName} (${userId}) joined room ${room.roomCode}`);

      return {
        success: true,
        room: {
          id: room.id,
          roomCode: room.roomCode,
          name: room.name,
          currentMode: room.currentMode,
          hostUserId: room.hostUserId
        }
      };
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  }

  /**
   * Leave a room
   */
  async leaveRoom(socketId) {
    try {
      const roomId = this.socketToRoom.get(socketId);
      const userId = this.socketToUser.get(socketId);

      if (!roomId || !userId) {
        return { success: false, message: 'No active room' };
      }

      // Remove from in-memory structures
      const roomData = this.rooms.get(roomId);
      if (roomData) {
        const participant = roomData.participants.get(socketId);
        const displayName = participant?.displayName || 'User';
        
        roomData.participants.delete(socketId);
        
        // Insert system message
        await this.insertSystemMessage(roomId, `${displayName} left the room`);

        // If room is empty, clean up
        if (roomData.participants.size === 0) {
          this.rooms.delete(roomId);
        }
      }

      // Update participant status in database
      const { error: updateError } = await supabase
        .from('room_participants')
        .update({
          is_online: false,
          last_seen: new Date().toISOString()
        })
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating participant status:', updateError);
      }

      // Clean up socket mappings
      this.socketToRoom.delete(socketId);
      this.socketToUser.delete(socketId);

      console.log(`User ${userId} left room ${roomId}`);

      return { success: true, roomId };
    } catch (error) {
      console.error('Error leaving room:', error);
      throw error;
    }
  }

  /**
   * Get participants in a room
   */
  async getParticipants(roomId) {
    try {
      const { data: participants, error } = await supabase
        .from('room_participants')
        .select('*')
        .eq('room_id', roomId)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        participants: participants || []
      };
    } catch (error) {
      console.error('Error fetching participants:', error);
      throw error;
    }
  }

  /**
   * Update room state (personality mode, conversation status, etc.)
   */
  async updateRoomState(roomId, updates) {
    try {
      const roomData = this.rooms.get(roomId);
      if (!roomData) {
        throw new Error('Room not found in memory');
      }

      // Update in-memory state
      roomData.state = { ...roomData.state, ...updates };

      // Update database if personality mode changed
      if (updates.currentMode) {
        const { error } = await supabase
          .from('rooms')
          .update({ current_mode: updates.currentMode })
          .eq('id', roomId);

        if (error) throw error;
      }

      return { success: true, state: roomData.state };
    } catch (error) {
      console.error('Error updating room state:', error);
      throw error;
    }
  }

  /**
   * Get current room state
   */
  getRoomState(roomId) {
    const roomData = this.rooms.get(roomId);
    return roomData ? roomData.state : null;
  }

  /**
   * Get room ID by socket ID
   */
  getRoomIdBySocket(socketId) {
    return this.socketToRoom.get(socketId);
  }

  /**
   * Get user ID by socket ID
   */
  getUserIdBySocket(socketId) {
    return this.socketToUser.get(socketId);
  }

  /**
   * Get all participants in a room (from memory)
   */
  getRoomParticipants(roomId) {
    const roomData = this.rooms.get(roomId);
    return roomData ? Array.from(roomData.participants.values()) : [];
  }

  /**
   * Insert a message into room_messages table
   */
  async insertMessage(roomId, userId, messageType, content, metadata = {}) {
    try {
      const { data, error } = await supabase
        .from('room_messages')
        .insert({
          room_id: roomId,
          user_id: userId,
          message_type: messageType,
          content: content,
          metadata: metadata
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, message: data };
    } catch (error) {
      console.error('Error inserting message:', error);
      throw error;
    }
  }

  /**
   * Insert a system message
   */
  async insertSystemMessage(roomId, content) {
    return this.insertMessage(roomId, null, 'system', content);
  }

  /**
   * Get room messages
   */
  async getRoomMessages(roomId, limit = 50) {
    try {
      const { data: messages, error } = await supabase
        .from('room_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return {
        success: true,
        messages: (messages || []).reverse() // Return in chronological order
      };
    } catch (error) {
      console.error('Error fetching room messages:', error);
      throw error;
    }
  }

  /**
   * Clean up inactive rooms (called periodically)
   */
  async cleanupInactiveRooms() {
    try {
      const { data, error } = await supabase
        .rpc('cleanup_inactive_rooms');

      if (error) throw error;

      console.log(`Cleaned up ${data} inactive rooms`);
      return { success: true, count: data };
    } catch (error) {
      console.error('Error cleaning up inactive rooms:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user is host of a room
   */
  async isHost(roomId, userId) {
    const roomData = this.rooms.get(roomId);
    if (roomData) {
      return roomData.state.hostUserId === userId;
    }

    // Fallback to database check
    try {
      const { data: room, error } = await supabase
        .from('rooms')
        .select('host_user_id')
        .eq('id', roomId)
        .single();

      if (error) throw error;
      return room?.host_user_id === userId;
    } catch (error) {
      console.error('Error checking host status:', error);
      return false;
    }
  }

  /**
   * Delete a room (host only)
   */
  async deleteRoom(roomId, userId) {
    try {
      // Verify user is host
      const isHost = await this.isHost(roomId, userId);
      if (!isHost) {
        throw new Error('Only the host can delete the room');
      }

      // Delete from database (cascade will handle related records)
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId)
        .eq('host_user_id', userId);

      if (error) throw error;

      // Clean up memory
      this.rooms.delete(roomId);

      console.log(`Room ${roomId} deleted by host ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting room:', error);
      throw error;
    }
  }
}

// Singleton instance
const roomManager = new RoomManager();

// Schedule cleanup every hour
setInterval(() => {
  roomManager.cleanupInactiveRooms();
}, 60 * 60 * 1000); // 1 hour

export default roomManager;
