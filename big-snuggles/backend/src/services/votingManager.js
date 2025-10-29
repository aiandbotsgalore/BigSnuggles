/**
 * Voting Manager Service
 * 
 * Handles poll creation, voting, and result calculation for audience participation:
 * - Create polls with configurable options and duration
 * - Real-time vote counting and aggregation
 * - Vote validation (one vote per user per poll)
 * - Automatic poll expiration
 * - Integration with room system
 */

import { supabase } from '../utils/supabase.js';
import { v4 as uuidv4 } from 'uuid';

class VotingManager {
  constructor() {
    // Store active polls in memory for quick access
    this.activePolls = new Map(); // pollId -> { poll, expirationTimeout }
    
    console.log('VotingManager initialized');
    
    // Schedule poll expiration check every 5 seconds
    this.expirationCheckInterval = setInterval(() => {
      this.checkExpiredPolls();
    }, 5000);
  }

  /**
   * Create a new poll
   */
  async createPoll(roomId, creatorUserId, pollData) {
    try {
      const { pollType, question, options, durationSeconds = 60 } = pollData;

      // Validate inputs
      if (!pollType || !question || !options || !Array.isArray(options)) {
        throw new Error('Invalid poll data: missing required fields');
      }

      if (options.length < 2 || options.length > 6) {
        throw new Error('Poll must have between 2 and 6 options');
      }

      if (durationSeconds < 30 || durationSeconds > 600) {
        throw new Error('Duration must be between 30 and 600 seconds');
      }

      // Check rate limit: max 3 polls per room per minute
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const { data: recentPolls, error: rateLimitError } = await supabase
        .from('polls')
        .select('id')
        .eq('room_id', roomId)
        .gte('created_at', oneMinuteAgo.toISOString());

      if (rateLimitError) throw rateLimitError;

      if (recentPolls && recentPolls.length >= 3) {
        throw new Error('Rate limit exceeded: maximum 3 polls per minute per room');
      }

      // Format options with unique IDs
      const formattedOptions = options.map((opt, index) => ({
        id: opt.id || `option_${index + 1}`,
        text: typeof opt === 'string' ? opt : opt.text
      }));

      // Calculate expiration time
      const expiresAt = new Date(Date.now() + durationSeconds * 1000);

      // Insert poll into database
      const { data: poll, error: insertError } = await supabase
        .from('polls')
        .insert({
          room_id: roomId,
          creator_user_id: creatorUserId,
          poll_type: pollType,
          question,
          options: formattedOptions,
          duration_seconds: durationSeconds,
          status: 'active',
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Store in memory for quick access
      this.activePolls.set(poll.id, {
        poll,
        expirationTimeout: setTimeout(() => {
          this.expirePoll(poll.id);
        }, durationSeconds * 1000)
      });

      console.log(`Poll created: ${poll.id} in room ${roomId}`);

      return {
        success: true,
        poll: {
          id: poll.id,
          roomId: poll.room_id,
          creatorUserId: poll.creator_user_id,
          pollType: poll.poll_type,
          question: poll.question,
          options: poll.options,
          durationSeconds: poll.duration_seconds,
          status: poll.status,
          createdAt: poll.created_at,
          expiresAt: poll.expires_at
        }
      };
    } catch (error) {
      console.error('Error creating poll:', error);
      throw error;
    }
  }

  /**
   * Get active poll in a room
   */
  async getActivePoll(roomId) {
    try {
      const { data: poll, error } = await supabase
        .from('polls')
        .select('*')
        .eq('room_id', roomId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No active poll found
          return { success: true, poll: null };
        }
        throw error;
      }

      return { success: true, poll };
    } catch (error) {
      console.error('Error getting active poll:', error);
      throw error;
    }
  }

  /**
   * Cast a vote
   */
  async castVote(pollId, userId, optionId) {
    try {
      // Check if poll is active
      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .select('*')
        .eq('id', pollId)
        .single();

      if (pollError) throw pollError;

      if (poll.status !== 'active') {
        throw new Error('Poll is not active');
      }

      // Check if poll has expired
      const expiresAt = new Date(poll.expires_at);
      if (expiresAt <= new Date()) {
        throw new Error('Poll has expired');
      }

      // Validate option exists
      const optionExists = poll.options.some(opt => opt.id === optionId);
      if (!optionExists) {
        throw new Error('Invalid option ID');
      }

      // Check if user has already voted
      const { data: hasVoted } = await supabase
        .rpc('has_user_voted', {
          target_poll_id: pollId,
          target_user_id: userId
        });

      if (hasVoted) {
        throw new Error('You have already voted in this poll');
      }

      // Insert vote
      const { data: vote, error: voteError } = await supabase
        .from('poll_votes')
        .insert({
          poll_id: pollId,
          user_id: userId,
          option_id: optionId
        })
        .select()
        .single();

      if (voteError) {
        if (voteError.code === '23505') {
          // Unique constraint violation
          throw new Error('You have already voted in this poll');
        }
        throw voteError;
      }

      console.log(`Vote cast: poll ${pollId}, user ${userId}, option ${optionId}`);

      // Get updated results
      const results = await this.getPollResults(pollId);

      return {
        success: true,
        vote: {
          id: vote.id,
          pollId: vote.poll_id,
          userId: vote.user_id,
          optionId: vote.option_id,
          votedAt: vote.voted_at
        },
        results
      };
    } catch (error) {
      console.error('Error casting vote:', error);
      throw error;
    }
  }

  /**
   * Get poll results
   */
  async getPollResults(pollId) {
    try {
      const { data: results, error } = await supabase
        .rpc('get_poll_results', { target_poll_id: pollId });

      if (error) throw error;

      return { success: true, results: results || [] };
    } catch (error) {
      console.error('Error getting poll results:', error);
      throw error;
    }
  }

  /**
   * Manually close a poll (host only)
   */
  async closePoll(pollId, userId) {
    try {
      // Check if user is the poll creator
      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .select('*')
        .eq('id', pollId)
        .single();

      if (pollError) throw pollError;

      if (poll.creator_user_id !== userId) {
        throw new Error('Only the poll creator can close the poll');
      }

      if (poll.status !== 'active') {
        throw new Error('Poll is not active');
      }

      // Update poll status
      const { data: closedPoll, error: updateError } = await supabase
        .from('polls')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString()
        })
        .eq('id', pollId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Clear expiration timeout
      const activePoll = this.activePolls.get(pollId);
      if (activePoll && activePoll.expirationTimeout) {
        clearTimeout(activePoll.expirationTimeout);
      }
      this.activePolls.delete(pollId);

      console.log(`Poll closed manually: ${pollId}`);

      // Get final results
      const results = await this.getPollResults(pollId);

      // Auto-apply personality mode if this is a personality poll
      if (closedPoll.poll_type === 'personality_mode') {
        await this.applyPersonalityMode(closedPoll.room_id, results.results);
      }

      return {
        success: true,
        poll: closedPoll,
        results
      };
    } catch (error) {
      console.error('Error closing poll:', error);
      throw error;
    }
  }

  /**
   * Expire a poll automatically
   */
  async expirePoll(pollId) {
    try {
      const { data: poll, error: updateError } = await supabase
        .from('polls')
        .update({
          status: 'expired',
          closed_at: new Date().toISOString()
        })
        .eq('id', pollId)
        .eq('status', 'active')
        .select()
        .single();

      if (updateError && updateError.code !== 'PGRST116') {
        throw updateError;
      }

      if (poll) {
        console.log(`Poll expired: ${pollId}`);
        
        // Remove from active polls
        this.activePolls.delete(pollId);

        // Get final results
        const results = await this.getPollResults(pollId);

        // Auto-apply personality mode if this is a personality poll
        if (poll.poll_type === 'personality_mode') {
          await this.applyPersonalityMode(poll.room_id, results.results);
        }

        return {
          success: true,
          poll,
          results
        };
      }

      return { success: true, poll: null };
    } catch (error) {
      console.error('Error expiring poll:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check for expired polls (background task)
   */
  async checkExpiredPolls() {
    try {
      const { data } = await supabase.rpc('close_expired_polls');

      if (data > 0) {
        console.log(`Closed ${data} expired polls`);
      }
    } catch (error) {
      console.error('Error checking expired polls:', error);
    }
  }

  /**
   * Get poll history for a room
   */
  async getPollHistory(roomId, limit = 20) {
    try {
      const { data: polls, error } = await supabase
        .from('polls')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Get results for each poll
      const pollsWithResults = await Promise.all(
        (polls || []).map(async (poll) => {
          const { results } = await this.getPollResults(poll.id);
          return { ...poll, results };
        })
      );

      return {
        success: true,
        polls: pollsWithResults
      };
    } catch (error) {
      console.error('Error getting poll history:', error);
      throw error;
    }
  }

  /**
   * Get engagement stats for a user in a room
   */
  async getEngagementStats(userId, roomId) {
    try {
      const { data: stats, error } = await supabase
        .from('user_engagement_stats')
        .select('*')
        .eq('user_id', userId)
        .eq('room_id', roomId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return {
        success: true,
        stats: stats || {
          polls_created: 0,
          votes_cast: 0
        }
      };
    } catch (error) {
      console.error('Error getting engagement stats:', error);
      throw error;
    }
  }

  /**
   * Get room engagement leaderboard
   */
  async getRoomLeaderboard(roomId) {
    try {
      const { data: leaderboard, error } = await supabase
        .from('user_engagement_stats')
        .select(`
          user_id,
          polls_created,
          votes_cast,
          last_activity
        `)
        .eq('room_id', roomId)
        .order('votes_cast', { ascending: false })
        .limit(10);

      if (error) throw error;

      return {
        success: true,
        leaderboard: leaderboard || []
      };
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  /**
   * Auto-apply personality mode based on poll results
   */
  async applyPersonalityMode(roomId, results) {
    try {
      if (!results || results.length === 0) {
        console.log('No results to apply personality mode');
        return;
      }

      // Find the winning option (highest vote count)
      const winningOption = results.reduce((max, option) => 
        (option.vote_count > max.vote_count) ? option : max
      , results[0]);

      if (!winningOption || !winningOption.option_text) {
        console.log('No winning option found');
        return;
      }

      // Map personality option text to mode
      const personalityText = winningOption.option_text.toLowerCase();
      let personalityMode = 'gangster'; // default

      if (personalityText.includes('gangster')) {
        personalityMode = 'gangster';
      } else if (personalityText.includes('wise') || personalityText.includes('mentor')) {
        personalityMode = 'wise_mentor';
      } else if (personalityText.includes('comedy') || personalityText.includes('roaster')) {
        personalityMode = 'comedy_roaster';
      } else if (personalityText.includes('conspiracy')) {
        personalityMode = 'conspiracy_theorist';
      } else if (personalityText.includes('motivational') || personalityText.includes('speaker')) {
        personalityMode = 'motivational_speaker';
      }

      // Update room's current_mode in database
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ current_mode: personalityMode })
        .eq('id', roomId);

      if (updateError) {
        console.error('Error updating room personality:', updateError);
        return;
      }

      console.log(`✨ Auto-applied personality mode "${personalityMode}" to room ${roomId} based on poll results`);

      // Note: Socket.IO broadcast will be handled by the room socket handlers
      // when they detect the poll:closed or poll:expired event
    } catch (error) {
      console.error('Error applying personality mode:', error);
    }
  }

  /**
   * Cleanup on shutdown
   */
  cleanup() {
    if (this.expirationCheckInterval) {
      clearInterval(this.expirationCheckInterval);
    }

    // Clear all expiration timeouts
    for (const [pollId, activePoll] of this.activePolls.entries()) {
      if (activePoll.expirationTimeout) {
        clearTimeout(activePoll.expirationTimeout);
      }
    }

    this.activePolls.clear();
    console.log('VotingManager cleaned up');
  }
}

// Singleton instance
const votingManager = new VotingManager();

// Schedule cleanup of old polls every 24 hours
setInterval(async () => {
  try {
    const { data } = await supabase.rpc('cleanup_old_polls');
    if (data > 0) {
      console.log(`Cleaned up ${data} old polls`);
    }
  } catch (error) {
    console.error('Error cleaning up old polls:', error);
  }
}, 24 * 60 * 60 * 1000); // 24 hours

export default votingManager;
