/**
 * Transcript Routes - Phase 5
 * RESTful API endpoints for transcript management
 */

import express from 'express';
import transcriptService from '../services/transcriptService.js';
import { authMiddleware } from '../middleware/auth.js';
import { supabaseAdmin } from '../utils/supabase.js';

const router = express.Router();

// All transcript routes require authentication
router.use(authMiddleware);

/**
 * POST /api/transcripts/store
 * Store a conversation transcript with metadata
 */
router.post('/store', async (req, res) => {
  try {
    const { sessionId, messages, metadata } = req.body;

    if (!sessionId || !messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sessionId, messages (array)'
      });
    }

    // Calculate metadata if not provided
    const enhancedMetadata = {
      duration: metadata?.duration || 0,
      startTime: metadata?.startTime || new Date().toISOString(),
      personalityMode: metadata?.personalityMode || 'gangster_mode',
      emotionalTone: metadata?.emotionalTone || 'neutral',
      topics: metadata?.topics || [],
      sentimentScore: metadata?.sentimentScore || 0,
      highlightMoments: metadata?.highlightMoments || []
    };

    // If highlight moments not provided, generate them
    if (!enhancedMetadata.highlightMoments || enhancedMetadata.highlightMoments.length === 0) {
      enhancedMetadata.highlightMoments = await transcriptService.generateHighlightMoments(messages);
    }

    // If sentiment score not provided, analyze it
    if (!enhancedMetadata.sentimentScore) {
      const sentiment = await transcriptService.analyzeSentiment(messages);
      enhancedMetadata.sentimentScore = sentiment.overall;
    }

    const transcript = await transcriptService.storeTranscript(sessionId, messages, enhancedMetadata);

    res.json({
      success: true,
      data: transcript,
      message: 'Transcript stored successfully'
    });

  } catch (error) {
    console.error('Error storing transcript:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to store transcript',
      details: error.message
    });
  }
});

/**
 * GET /api/transcripts
 * Retrieve user's transcripts with filtering
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const filters = {
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      personalityMode: req.query.personalityMode,
      minSentiment: req.query.minSentiment ? parseFloat(req.query.minSentiment) : undefined,
      maxSentiment: req.query.maxSentiment ? parseFloat(req.query.maxSentiment) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
      offset: req.query.offset ? parseInt(req.query.offset) : 0
    };

    const transcripts = await transcriptService.getUserTranscripts(userId, filters);

    // Parse JSON fields that were stored as strings
    const parsedTranscripts = transcripts.map(transcript => ({
      ...transcript,
      full_conversation: JSON.parse(transcript.full_conversation),
      topics: JSON.parse(transcript.topics || '[]'),
      highlight_moments: JSON.parse(transcript.highlight_moments || '[]'),
      conversation_stats: JSON.parse(transcript.conversation_stats || '{}')
    }));

    res.json({
      success: true,
      data: parsedTranscripts,
      count: parsedTranscripts.length
    });

  } catch (error) {
    console.error('Error retrieving transcripts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve transcripts',
      details: error.message
    });
  }
});

/**
 * GET /api/transcripts/:id
 * Get a specific transcript by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const transcriptId = req.params.id;

    const { data: transcript, error } = await supabaseAdmin
      .from('transcripts')
      .select(`
        *,
        session_analytics!inner(session_id, user_id)
      `)
      .eq('id', transcriptId)
      .eq('session_analytics.user_id', userId)
      .single();

    if (error || !transcript) {
      return res.status(404).json({
        success: false,
        error: 'Transcript not found'
      });
    }

    // Parse JSON fields
    const parsedTranscript = {
      ...transcript,
      full_conversation: JSON.parse(transcript.full_conversation),
      topics: JSON.parse(transcript.topics || '[]'),
      highlight_moments: JSON.parse(transcript.highlight_moments || '[]'),
      conversation_stats: JSON.parse(transcript.conversation_stats || '{}')
    };

    res.json({
      success: true,
      data: parsedTranscript
    });

  } catch (error) {
    console.error('Error retrieving transcript:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve transcript',
      details: error.message
    });
  }
});

/**
 * POST /api/transcripts/search
 * Search transcripts using full-text search
 */
router.post('/search', async (req, res) => {
  try {
    const userId = req.user.id;
    const { query, filters } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const searchFilters = {
      dateFrom: filters?.dateFrom,
      dateTo: filters?.dateTo,
      personalityMode: filters?.personalityMode
    };

    const transcripts = await transcriptService.searchTranscripts(userId, query, searchFilters);

    // Parse JSON fields
    const parsedTranscripts = transcripts.map(transcript => ({
      ...transcript,
      full_conversation: JSON.parse(transcript.full_conversation),
      topics: JSON.parse(transcript.topics || '[]'),
      highlight_moments: JSON.parse(transcript.highlight_moments || '[]'),
      conversation_stats: JSON.parse(transcript.conversation_stats || '{}')
    }));

    res.json({
      success: true,
      data: parsedTranscripts,
      query,
      count: parsedTranscripts.length
    });

  } catch (error) {
    console.error('Error searching transcripts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search transcripts',
      details: error.message
    });
  }
});

/**
 * POST /api/transcripts/generate-highlights
 * Generate highlight moments from conversation messages
 */
router.post('/generate-highlights', async (req, res) => {
  try {
    const { messages, criteria } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Messages array is required'
      });
    }

    const highlights = await transcriptService.generateHighlightMoments(messages, criteria);

    res.json({
      success: true,
      data: highlights,
      count: highlights.length
    });

  } catch (error) {
    console.error('Error generating highlights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate highlights',
      details: error.message
    });
  }
});

/**
 * POST /api/transcripts/analyze-sentiment
 * Analyze sentiment for a conversation
 */
router.post('/analyze-sentiment', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        error: 'Messages array is required'
      });
    }

    const sentiment = await transcriptService.analyzeSentiment(messages);

    res.json({
      success: true,
      data: sentiment
    });

  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze sentiment',
      details: error.message
    });
  }
});

/**
 * GET /api/transcripts/statistics
 * Get conversation statistics for user
 */
router.get('/statistics', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { data: transcripts, error } = await supabaseAdmin
      .from('transcripts')
      .select(`
        *,
        session_analytics!inner(session_id, user_id)
      `)
      .eq('session_analytics.user_id', userId);

    if (error) {
      throw error;
    }

    // Calculate overall statistics
    const stats = {
      totalConversations: transcripts.length,
      totalMessages: transcripts.reduce((sum, t) => sum + (t.message_count || 0), 0),
      averageSentiment: transcripts.length > 0 
        ? transcripts.reduce((sum, t) => sum + (t.sentiment_score || 0), 0) / transcripts.length 
        : 0,
      conversationDuration: transcripts.reduce((sum, t) => sum + (t.duration_minutes || 0), 0),
      personalityModeDistribution: {},
      sentimentDistribution: {
        very_negative: 0,
        negative: 0,
        neutral: 0,
        positive: 0,
        very_positive: 0
      },
      recentActivity: []
    };

    // Calculate personality mode distribution
    transcripts.forEach(transcript => {
      const mode = transcript.personality_mode || 'gangster_mode';
      stats.personalityModeDistribution[mode] = (stats.personalityModeDistribution[mode] || 0) + 1;

      // Sentiment distribution
      const sentiment = transcript.sentiment_score || 0;
      if (sentiment <= -0.6) stats.sentimentDistribution.very_negative++;
      else if (sentiment <= -0.2) stats.sentimentDistribution.negative++;
      else if (sentiment < 0.2) stats.sentimentDistribution.neutral++;
      else if (sentiment < 0.6) stats.sentimentDistribution.positive++;
      else stats.sentimentDistribution.very_positive++;
    });

    // Recent activity (last 10 transcripts)
    stats.recentActivity = transcripts
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10)
      .map(t => ({
        id: t.id,
        date: t.created_at,
        duration: t.duration_minutes,
        messageCount: t.message_count,
        personalityMode: t.personality_mode,
        sentiment: t.sentiment_score
      }));

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error retrieving statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics',
      details: error.message
    });
  }
});

export default router;