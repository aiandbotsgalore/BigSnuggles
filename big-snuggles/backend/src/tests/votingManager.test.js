/**
 * Voting Manager Service Tests
 * 
 * Tests for poll creation, voting, results, and expiration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import votingManager from '../services/votingManager.js';

// Test configuration
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';
const supabase = createClient(supabaseUrl, supabaseKey);

describe('VotingManager Service', () => {
  let testRoomId;
  let testUserId1;
  let testUserId2;
  let testPollId;

  beforeAll(async () => {
    // Create test room
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert({
        room_code: 'TEST001',
        host_user_id: '00000000-0000-0000-0000-000000000001',
        is_active: true,
        current_mode: 'gangster'
      })
      .select()
      .single();

    if (roomError) throw roomError;
    testRoomId = room.id;
    testUserId1 = '00000000-0000-0000-0000-000000000001';
    testUserId2 = '00000000-0000-0000-0000-000000000002';
  });

  afterAll(async () => {
    // Cleanup test data
    await supabase.from('polls').delete().eq('room_id', testRoomId);
    await supabase.from('rooms').delete().eq('id', testRoomId);
  });

  beforeEach(async () => {
    // Clean up polls before each test
    await supabase.from('poll_votes').delete().eq('poll_id', testPollId);
    await supabase.from('polls').delete().eq('room_id', testRoomId);
  });

  describe('createPoll', () => {
    it('should create a valid topic voting poll', async () => {
      const result = await votingManager.createPoll(testRoomId, testUserId1, {
        pollType: 'topic_voting',
        question: 'What should we discuss?',
        options: ['AI', 'Blockchain', 'Quantum Computing'],
        durationSeconds: 60
      });

      expect(result.success).toBe(true);
      expect(result.poll).toBeDefined();
      expect(result.poll.poll_type).toBe('topic_voting');
      expect(result.poll.question).toBe('What should we discuss?');
      expect(result.poll.options).toHaveLength(3);
      expect(result.poll.status).toBe('active');

      testPollId = result.poll.id;
    });

    it('should create a personality mode poll', async () => {
      const result = await votingManager.createPoll(testRoomId, testUserId1, {
        pollType: 'personality_mode',
        question: 'Which personality mode?',
        options: ['Gangster', 'Wise Mentor', 'Comedy Roaster'],
        durationSeconds: 30
      });

      expect(result.success).toBe(true);
      expect(result.poll.poll_type).toBe('personality_mode');
    });

    it('should reject poll with too few options', async () => {
      await expect(
        votingManager.createPoll(testRoomId, testUserId1, {
          pollType: 'topic_voting',
          question: 'Invalid poll',
          options: ['Only one'],
          durationSeconds: 60
        })
      ).rejects.toThrow('Poll must have between 2 and 6 options');
    });

    it('should reject poll with too many options', async () => {
      await expect(
        votingManager.createPoll(testRoomId, testUserId1, {
          pollType: 'topic_voting',
          question: 'Too many options',
          options: ['1', '2', '3', '4', '5', '6', '7'],
          durationSeconds: 60
        })
      ).rejects.toThrow('Poll must have between 2 and 6 options');
    });

    it('should reject poll with invalid duration', async () => {
      await expect(
        votingManager.createPoll(testRoomId, testUserId1, {
          pollType: 'topic_voting',
          question: 'Invalid duration',
          options: ['A', 'B'],
          durationSeconds: 10 // Too short
        })
      ).rejects.toThrow('Duration must be between 30 and 600 seconds');
    });

    it('should enforce rate limiting (3 polls per minute)', async () => {
      // Create 3 polls
      for (let i = 0; i < 3; i++) {
        await votingManager.createPoll(testRoomId, testUserId1, {
          pollType: 'quick_reaction',
          question: `Poll ${i + 1}`,
          options: ['Yes', 'No'],
          durationSeconds: 30
        });
      }

      // 4th poll should fail
      await expect(
        votingManager.createPoll(testRoomId, testUserId1, {
          pollType: 'quick_reaction',
          question: 'Poll 4',
          options: ['Yes', 'No'],
          durationSeconds: 30
        })
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('castVote', () => {
    beforeEach(async () => {
      const result = await votingManager.createPoll(testRoomId, testUserId1, {
        pollType: 'topic_voting',
        question: 'Test poll for voting',
        options: ['Option A', 'Option B', 'Option C'],
        durationSeconds: 120
      });
      testPollId = result.poll.id;
    });

    it('should allow user to cast a vote', async () => {
      const result = await votingManager.castVote(testPollId, testUserId1, 'option_1');

      expect(result.success).toBe(true);
      expect(result.vote).toBeDefined();
      expect(result.vote.optionId).toBe('option_1');
      expect(result.results).toBeDefined();
    });

    it('should prevent duplicate votes', async () => {
      await votingManager.castVote(testPollId, testUserId1, 'option_1');

      await expect(
        votingManager.castVote(testPollId, testUserId1, 'option_2')
      ).rejects.toThrow('You have already voted');
    });

    it('should update vote counts correctly', async () => {
      await votingManager.castVote(testPollId, testUserId1, 'option_1');
      await votingManager.castVote(testPollId, testUserId2, 'option_1');

      const results = await votingManager.getPollResults(testPollId);
      const option1 = results.results.find(r => r.option_id === 'option_1');

      expect(option1.vote_count).toBe('2');
    });

    it('should calculate percentages correctly', async () => {
      await votingManager.castVote(testPollId, testUserId1, 'option_1');
      await votingManager.castVote(testPollId, testUserId2, 'option_2');

      const results = await votingManager.getPollResults(testPollId);

      const option1 = results.results.find(r => r.option_id === 'option_1');
      const option2 = results.results.find(r => r.option_id === 'option_2');

      expect(parseFloat(option1.percentage)).toBeCloseTo(50, 0);
      expect(parseFloat(option2.percentage)).toBeCloseTo(50, 0);
    });
  });

  describe('getPollResults', () => {
    beforeEach(async () => {
      const result = await votingManager.createPoll(testRoomId, testUserId1, {
        pollType: 'topic_voting',
        question: 'Results test',
        options: ['Option A', 'Option B'],
        durationSeconds: 120
      });
      testPollId = result.poll.id;
    });

    it('should return results with zero votes', async () => {
      const results = await votingManager.getPollResults(testPollId);

      expect(results.success).toBe(true);
      expect(results.results).toHaveLength(2);
      expect(results.results[0].vote_count).toBe('0');
    });

    it('should include winning option when votes exist', async () => {
      await votingManager.castVote(testPollId, testUserId1, 'option_1');
      await votingManager.castVote(testPollId, testUserId2, 'option_1');

      const results = await votingManager.getPollResults(testPollId);

      expect(results.results[0].winning_option).toBe('option_1');
    });
  });

  describe('closePoll', () => {
    beforeEach(async () => {
      const result = await votingManager.createPoll(testRoomId, testUserId1, {
        pollType: 'topic_voting',
        question: 'Close test',
        options: ['A', 'B'],
        durationSeconds: 120
      });
      testPollId = result.poll.id;
    });

    it('should allow creator to close poll', async () => {
      const result = await votingManager.closePoll(testPollId, testUserId1);

      expect(result.success).toBe(true);
      expect(result.poll.status).toBe('closed');
    });

    it('should prevent non-creator from closing poll', async () => {
      await expect(
        votingManager.closePoll(testPollId, testUserId2)
      ).rejects.toThrow('Only the poll creator can close the poll');
    });

    it('should prevent closing already closed poll', async () => {
      await votingManager.closePoll(testPollId, testUserId1);

      await expect(
        votingManager.closePoll(testPollId, testUserId1)
      ).rejects.toThrow('Poll is not active');
    });
  });

  describe('Personality Mode Auto-apply', () => {
    it('should auto-apply personality mode when poll closes', async () => {
      const result = await votingManager.createPoll(testRoomId, testUserId1, {
        pollType: 'personality_mode',
        question: 'Which personality?',
        options: ['Gangster', 'Wise Mentor', 'Comedy Roaster'],
        durationSeconds: 120
      });
      testPollId = result.poll.id;

      // Vote for Wise Mentor
      await votingManager.castVote(testPollId, testUserId1, 'option_2');
      await votingManager.castVote(testPollId, testUserId2, 'option_2');

      // Close poll
      await votingManager.closePoll(testPollId, testUserId1);

      // Check room personality was updated
      const { data: room } = await supabase
        .from('rooms')
        .select('current_mode')
        .eq('id', testRoomId)
        .single();

      expect(room.current_mode).toBe('wise_mentor');
    });

    it('should handle Gangster personality', async () => {
      const result = await votingManager.createPoll(testRoomId, testUserId1, {
        pollType: 'personality_mode',
        question: 'Which personality?',
        options: ['Gangster', 'Wise Mentor'],
        durationSeconds: 120
      });
      testPollId = result.poll.id;

      await votingManager.castVote(testPollId, testUserId1, 'option_1');
      await votingManager.closePoll(testPollId, testUserId1);

      const { data: room } = await supabase
        .from('rooms')
        .select('current_mode')
        .eq('id', testRoomId)
        .single();

      expect(room.current_mode).toBe('gangster');
    });
  });

  describe('getRoomPolls', () => {
    it('should return active polls only', async () => {
      await votingManager.createPoll(testRoomId, testUserId1, {
        pollType: 'topic_voting',
        question: 'Active poll',
        options: ['A', 'B'],
        durationSeconds: 120
      });

      const result = await votingManager.getRoomPolls(testRoomId, false);

      expect(result.success).toBe(true);
      expect(result.polls.length).toBeGreaterThan(0);
      expect(result.polls[0].status).toBe('active');
    });

    it('should include history when requested', async () => {
      const createResult = await votingManager.createPoll(testRoomId, testUserId1, {
        pollType: 'topic_voting',
        question: 'History test',
        options: ['A', 'B'],
        durationSeconds: 120
      });

      await votingManager.closePoll(createResult.poll.id, testUserId1);

      const result = await votingManager.getRoomPolls(testRoomId, true);

      expect(result.success).toBe(true);
      expect(result.polls.some(p => p.status === 'closed')).toBe(true);
    });
  });
});
