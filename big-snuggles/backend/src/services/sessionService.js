import { supabaseAdmin } from '../utils/supabase.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Session Management Service
 * Handles session lifecycle and state management
 */
class SessionService {
  /**
   * Create a new conversation session
   */
  async createSession(userId) {
    const sessionId = uuidv4();
    
    // Initialize personality state if not exists
    const { data: existingState } = await supabaseAdmin
      .from('personality_state')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingState) {
      await supabaseAdmin
        .from('personality_state')
        .insert({
          user_id: userId,
          current_mode: 'gangster_mode',
          mood_state: 'neutral',
          preference_settings: {},
          relationship_metrics: {}
        });
    }

    return {
      sessionId,
      userId,
      startedAt: new Date().toISOString(),
      status: 'active'
    };
  }

  /**
   * Get session details
   */
  async getSession(sessionId, userId) {
    // Get conversations for this session
    const { data: conversations, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('timestamp', { ascending: true });

    if (error) throw error;

    return {
      sessionId,
      userId,
      conversations: conversations || [],
      messageCount: conversations?.length || 0
    };
  }

  /**
   * Update session state
   */
  async updateSessionState(sessionId, userId, state) {
    // Store state as a memory entry
    const { data, error } = await supabaseAdmin
      .from('memory')
      .insert({
        user_id: userId,
        session_id: sessionId,
        key: 'session_state',
        value: state,
        importance_score: 3
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Add conversation message
   */
  async addMessage(sessionId, userId, message) {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .insert({
        session_id: sessionId,
        user_id: userId,
        message_type: message.type,
        content: message.content,
        audio_url: message.audioUrl || null,
        emotion_state: message.emotionState || null,
        metadata: message.metadata || {}
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * End session and store analytics
   */
  async endSession(sessionId, userId, metrics) {
    const { data, error } = await supabaseAdmin
      .from('session_analytics')
      .insert({
        session_id: sessionId,
        user_id: userId,
        metrics: metrics,
        latency_data: metrics.latencyData || {},
        engagement_score: metrics.engagementScore || 0
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export default new SessionService();
