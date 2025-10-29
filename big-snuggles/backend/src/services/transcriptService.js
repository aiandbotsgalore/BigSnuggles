/**
 * Transcript Service - Phase 5
 * Handles conversation transcript storage, retrieval, search, and highlight generation
 */

import { supabaseAdmin } from '../utils/supabase.js';

export class TranscriptService {
  /**
   * Store a conversation transcript with metadata
   */
  async storeTranscript(sessionId, messages, metadata = {}) {
    try {
      const transcriptData = {
        session_id: sessionId,
        full_conversation: JSON.stringify(messages),
        message_count: messages.length,
        duration_minutes: metadata.duration || 0,
        start_time: metadata.startTime ? new Date(metadata.startTime).toISOString() : new Date().toISOString(),
        end_time: new Date().toISOString(),
        personality_mode: metadata.personalityMode || 'gangster_mode',
        emotional_tone: metadata.emotionalTone || 'neutral',
        topics: JSON.stringify(metadata.topics || []),
        sentiment_score: metadata.sentimentScore || 0,
        highlight_moments: JSON.stringify(metadata.highlightMoments || []),
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabaseAdmin
        .from('transcripts')
        .insert([transcriptData])
        .select()
        .single();

      if (error) {
        console.error('Error storing transcript:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('TranscriptService.storeTranscript error:', error);
      throw error;
    }
  }

  /**
   * Retrieve transcripts for a user with filtering
   */
  async getUserTranscripts(userId, filters = {}) {
    try {
      let query = supabase
        .from('transcripts')
        .select(`
          *,
          session_analytics!inner(session_id, user_id)
        `)
        .eq('session_analytics.user_id', userId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      if (filters.personalityMode) {
        query = query.eq('personality_mode', filters.personalityMode);
      }
      if (filters.minSentiment !== undefined) {
        query = query.gte('sentiment_score', filters.minSentiment);
      }
      if (filters.maxSentiment !== undefined) {
        query = query.lte('sentiment_score', filters.maxSentiment);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error retrieving transcripts:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('TranscriptService.getUserTranscripts error:', error);
      throw error;
    }
  }

  /**
   * Search transcripts using full-text search
   */
  async searchTranscripts(userId, searchQuery, filters = {}) {
    try {
      let query = supabase
        .from('transcripts')
        .select(`
          *,
          session_analytics!inner(session_id, user_id)
        `)
        .eq('session_analytics.user_id', userId)
        .textSearch('full_conversation', searchQuery, {
          type: 'websearch',
          config: 'english'
        })
        .order('created_at', { ascending: false });

      // Apply additional filters
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      if (filters.personalityMode) {
        query = query.eq('personality_mode', filters.personalityMode);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error searching transcripts:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('TranscriptService.searchTranscripts error:', error);
      throw error;
    }
  }

  /**
   * Generate highlight moments from conversation
   */
  async generateHighlightMoments(messages, criteria = {}) {
    try {
      const highlights = [];
      const defaultCriteria = {
        maxHighlights: 10,
        minMessageLength: 20,
        emotionalThreshold: 0.7,
        conversationPaces: ['question', 'reveal', 'confession', 'explanation']
      };

      const settings = { ...defaultCriteria, ...criteria };

      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        const nextMessage = messages[i + 1];

        // Skip short messages
        if (message.content.length < settings.minMessageLength) continue;

        // Calculate emotional intensity
        const emotionalIntensity = this.calculateEmotionalIntensity(message);

        // Check for conversation pace moments
        const isPaceMoment = this.isConversationPaceMoment(message, nextMessage);

        if (emotionalIntensity >= settings.emotionalThreshold || isPaceMoment) {
          const highlight = {
            id: `highlight_${Date.now()}_${i}`,
            timestamp: message.timestamp,
            messageIndex: i,
            content: message.content,
            speaker: message.role,
            emotionalIntensity,
            context: this.getContext(messages, i, 2),
            categories: this.categorizeMoment(message, nextMessage)
          };

          highlights.push(highlight);

          if (highlights.length >= settings.maxHighlights) break;
        }
      }

      return highlights;
    } catch (error) {
      console.error('TranscriptService.generateHighlightMoments error:', error);
      throw error;
    }
  }

  /**
   * Calculate sentiment score for conversation
   */
  async analyzeSentiment(messages) {
    try {
      const sentiments = {
        overall: 0,
        distribution: {
          very_negative: 0,
          negative: 0,
          neutral: 0,
          positive: 0,
          very_positive: 0
        },
        timeline: []
      };

      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        const score = this.calculateMessageSentiment(message);
        
        sentiments.timeline.push({
          timestamp: message.timestamp,
          score,
          message: message.content.substring(0, 100) + '...'
        });

        // Update distribution
        if (score <= -0.6) sentiments.distribution.very_negative++;
        else if (score <= -0.2) sentiments.distribution.negative++;
        else if (score < 0.2) sentiments.distribution.neutral++;
        else if (score < 0.6) sentiments.distribution.positive++;
        else sentiments.distribution.very_positive++;

        sentiments.overall += score;
      }

      // Calculate average
      if (messages.length > 0) {
        sentiments.overall = sentiments.overall / messages.length;
      }

      return sentiments;
    } catch (error) {
      console.error('TranscriptService.analyzeSentiment error:', error);
      throw error;
    }
  }

  /**
   * Generate conversation statistics
   */
  async generateStatistics(messages, durationMinutes) {
    try {
      const stats = {
        totalMessages: messages.length,
        durationMinutes: durationMinutes,
        averageMessageLength: 0,
        conversationPace: 'normal', // slow, normal, fast
        dominantSentiment: 'neutral',
        keyTopics: [],
        engagementMetrics: {}
      };

      // Calculate average message length
      const totalLength = messages.reduce((sum, msg) => sum + msg.content.length, 0);
      stats.averageMessageLength = Math.round(totalLength / messages.length);

      // Calculate conversation pace
      const messagesPerMinute = messages.length / durationMinutes;
      if (messagesPerMinute < 2) stats.conversationPace = 'slow';
      else if (messagesPerMinute > 8) stats.conversationPace = 'fast';
      else stats.conversationPace = 'normal';

      // Extract key topics (simple keyword extraction)
      stats.keyTopics = this.extractKeyTopics(messages);

      // Calculate engagement metrics
      stats.engagementMetrics = this.calculateEngagement(messages);

      return stats;
    } catch (error) {
      console.error('TranscriptService.generateStatistics error:', error);
      throw error;
    }
  }

  // Helper methods

  calculateEmotionalIntensity(message) {
    // Simple keyword-based emotion detection
    const emotionalKeywords = {
      laughter: ['lol', 'haha', 'laugh', 'funny', 'hilarious'],
      excitement: ['amazing', 'incredible', 'wow', 'awesome', 'fantastic'],
      concern: ['worry', 'concern', 'problem', 'issue', 'trouble'],
      confession: ['secret', 'truth', 'admit', 'confess', 'honestly'],
      surprise: ['surprise', 'shock', 'unexpected', 'didnt expect'],
      anger: ['angry', 'mad', 'furious', 'rage', 'annoyed']
    };

    const content = message.content.toLowerCase();
    let intensity = 0.1; // Base intensity

    Object.values(emotionalKeywords).forEach(keywords => {
      keywords.forEach(keyword => {
        if (content.includes(keyword)) {
          intensity += 0.2;
        }
      });
    });

    return Math.min(intensity, 1.0);
  }

  isConversationPaceMoment(message, nextMessage) {
    // Check for question-answer pairs
    if (message.role === 'user' && message.content.includes('?')) return true;
    
    // Check for long explanations from AI
    if (message.role === 'assistant' && message.content.length > 200) return true;
    
    // Check for user sharing stories
    if (message.role === 'user' && message.content.length > 100) return true;
    
    return false;
  }

  getContext(messages, index, contextSize = 2) {
    const start = Math.max(0, index - contextSize);
    const end = Math.min(messages.length, index + contextSize + 1);
    
    return messages.slice(start, end);
  }

  categorizeMoment(message, nextMessage) {
    const categories = [];
    const content = message.content.toLowerCase();

    if (content.includes('?')) categories.push('question');
    if (content.includes('story') || content.includes('tell you')) categories.push('storytelling');
    if (content.includes('secret') || content.includes('confess')) categories.push('confession');
    if (content.includes('laugh') || content.includes('funny')) categories.push('humor');
    if (content.includes('love') || content.includes('care')) categories.push('emotion');

    return categories;
  }

  calculateMessageSentiment(message) {
    const positiveWords = ['good', 'great', 'love', 'amazing', 'awesome', 'happy', 'wonderful', 'fantastic', 'beautiful'];
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'sad', 'horrible', 'angry', 'frustrated', 'disappointed'];

    const content = message.content.toLowerCase();
    let score = 0;

    positiveWords.forEach(word => {
      if (content.includes(word)) score += 0.1;
    });

    negativeWords.forEach(word => {
      if (content.includes(word)) score -= 0.1;
    });

    return Math.max(-1, Math.min(1, score));
  }

  extractKeyTopics(messages) {
    // Simple keyword extraction
    const wordCounts = {};
    
    messages.forEach(message => {
      const words = message.content.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3);

      words.forEach(word => {
        if (!wordCounts[word]) wordCounts[word] = 0;
        wordCounts[word]++;
      });
    });

    // Return top 5 most common words
    return Object.entries(wordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  calculateEngagement(messages) {
    const metrics = {
      userInitiatives: 0,
      aiResponses: 0,
      averageResponseTime: 0,
      conversationDepth: 0
    };

    messages.forEach(message => {
      if (message.role === 'user') metrics.userInitiatives++;
      else if (message.role === 'assistant') metrics.aiResponses++;
    });

    metrics.conversationDepth = messages.length;
    
    return metrics;
  }
}

export default new TranscriptService();