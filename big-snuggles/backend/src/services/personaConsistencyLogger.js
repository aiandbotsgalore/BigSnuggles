/**
 * Persona Consistency Logging System
 * Tracks and analyzes personality mode adherence across conversations
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

class PersonaConsistencyLogger {
  constructor() {
    this.logBuffer = [];
    this.bufferSize = 50; // Flush after 50 logs
    this.flushInterval = 30000; // Flush every 30 seconds
    
    // Personality mode definitions
    this.personalityModes = {
      gangster: {
        vocabulary: ['yo', 'homie', 'street', 'real talk', 'respect', 'family', 'business'],
        tone: ['authoritative', 'protective', 'street-smart', 'loyal'],
        prohibited: ['please', 'kindly', 'perhaps', 'might']
      },
      playful: {
        vocabulary: ['cuddle', 'snuggle', 'hugs', 'sweetie', 'bestie', 'fun', 'yay'],
        tone: ['cheerful', 'affectionate', 'energetic', 'friendly'],
        prohibited: ['serious', 'harsh', 'cold']
      },
      late_night: {
        vocabulary: ['philosophy', 'deep', 'universe', 'meaning', 'consciousness', 'reality'],
        tone: ['contemplative', 'mellow', 'profound', 'introspective'],
        prohibited: ['hype', 'excited', 'loud']
      },
      conspiracy: {
        vocabulary: ['truth', 'they', 'hidden', 'wake up', 'matrix', 'system', 'control'],
        tone: ['suspicious', 'intense', 'revealing', 'urgent'],
        prohibited: ['mainstream', 'official', 'accepted']
      },
      wild_card: {
        vocabulary: [], // Anything goes
        tone: ['unpredictable', 'chaotic', 'surprising', 'eccentric'],
        prohibited: []
      }
    };

    // Start auto-flush timer
    this.startAutoFlush();
  }

  /**
   * Log a conversation turn with persona analysis
   */
  async logConversationTurn(data) {
    const {
      userId,
      sessionId,
      conversationId,
      personalityMode,
      userMessage,
      aiResponse,
      timestamp = new Date().toISOString()
    } = data;

    // Analyze persona consistency
    const analysis = this.analyzePersonaConsistency(personalityMode, aiResponse);

    const logEntry = {
      user_id: userId,
      session_id: sessionId,
      conversation_id: conversationId,
      personality_mode: personalityMode,
      user_message: userMessage,
      ai_response: aiResponse,
      consistency_score: analysis.score,
      vocabulary_matches: analysis.vocabularyMatches,
      tone_alignment: analysis.toneAlignment,
      violations: analysis.violations,
      metrics: analysis.metrics,
      timestamp,
      created_at: new Date().toISOString()
    };

    // Add to buffer
    this.logBuffer.push(logEntry);

    // Flush if buffer is full
    if (this.logBuffer.length >= this.bufferSize) {
      await this.flush();
    }

    return analysis;
  }

  /**
   * Analyze how well a response adheres to personality mode
   */
  analyzePersonaConsistency(mode, response) {
    const modeConfig = this.personalityModes[mode];
    if (!modeConfig) {
      return {
        score: 0,
        error: 'Unknown personality mode',
        vocabularyMatches: [],
        toneAlignment: 0,
        violations: [],
        metrics: {}
      };
    }

    const responseLower = response.toLowerCase();
    const words = responseLower.split(/\s+/);

    // Count vocabulary matches
    const vocabularyMatches = modeConfig.vocabulary.filter(word => 
      responseLower.includes(word.toLowerCase())
    );
    const vocabularyScore = modeConfig.vocabulary.length > 0
      ? (vocabularyMatches.length / modeConfig.vocabulary.length) * 100
      : 100; // Wild card mode gets full score

    // Check for prohibited words
    const violations = modeConfig.prohibited.filter(word =>
      responseLower.includes(word.toLowerCase())
    );
    const violationPenalty = violations.length * 10;

    // Analyze tone indicators
    const toneIndicators = this.analyzeTone(response, modeConfig.tone);
    const toneScore = toneIndicators.score;

    // Calculate overall consistency score (0-100)
    let consistencyScore = (vocabularyScore * 0.4) + (toneScore * 0.6);
    consistencyScore = Math.max(0, consistencyScore - violationPenalty);

    // Additional metrics
    const metrics = {
      responseLength: response.length,
      wordCount: words.length,
      uniqueWords: new Set(words).size,
      sentenceCount: response.split(/[.!?]+/).length,
      avgWordLength: words.reduce((sum, word) => sum + word.length, 0) / words.length,
      vocabularyRichness: (new Set(words).size / words.length) * 100
    };

    return {
      score: Math.round(consistencyScore * 10) / 10,
      vocabularyMatches,
      toneAlignment: toneScore,
      violations,
      metrics,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Analyze tone of response
   */
  analyzeTone(response, expectedTones) {
    // Tone indicators mapping
    const toneIndicators = {
      authoritative: ['must', 'need to', 'listen', 'fact is', 'truth is'],
      protective: ['safe', 'protect', 'take care', 'watch out', 'got your back'],
      'street-smart': ['know the game', 'how it works', 'real talk', 'streets'],
      loyal: ['family', 'always', 'never leave', 'together', 'trust'],
      cheerful: ['!', 'happy', 'great', 'awesome', 'yay', 'woohoo'],
      affectionate: ['love', 'dear', 'sweetie', 'cuddle', 'hug'],
      energetic: ['!!!', 'wow', 'amazing', 'exciting', 'lets go'],
      friendly: ['friend', 'buddy', 'pal', 'together', 'we'],
      contemplative: ['perhaps', 'consider', 'ponder', 'reflect', 'think about'],
      mellow: ['calm', 'peaceful', 'relax', 'gentle', 'soft'],
      profound: ['meaning', 'existence', 'consciousness', 'universe', 'reality'],
      introspective: ['within', 'self', 'inner', 'soul', 'mind'],
      suspicious: ['?', 'really', 'sure about', 'think again', 'question'],
      intense: ['!!!', 'must know', 'urgent', 'critical', 'important'],
      revealing: ['truth is', 'actually', 'reality', 'fact', 'hidden'],
      urgent: ['now', 'immediately', 'quickly', 'urgent', 'hurry'],
      unpredictable: ['unexpected', 'surprise', 'random', 'chaos', 'wild'],
      chaotic: ['crazy', 'insane', 'wild', 'random', 'unpredictable'],
      surprising: ['wow', 'woah', 'unexpected', 'surprise', 'plot twist'],
      eccentric: ['weird', 'strange', 'unusual', 'odd', 'peculiar']
    };

    const responseLower = response.toLowerCase();
    let matchCount = 0;
    let totalExpected = 0;

    for (const tone of expectedTones) {
      const indicators = toneIndicators[tone] || [];
      totalExpected += indicators.length;
      
      for (const indicator of indicators) {
        if (responseLower.includes(indicator)) {
          matchCount++;
        }
      }
    }

    const score = totalExpected > 0 ? (matchCount / totalExpected) * 100 : 50;
    return { score, matchCount, totalExpected };
  }

  /**
   * Get consistency statistics for a user
   */
  async getUserConsistencyStats(userId, timeRange = '24h') {
    try {
      let query = supabaseAdmin
        .from('persona_consistency_logs')
        .select('*')
        .eq('user_id', userId);

      // Add time filter
      const now = new Date();
      const timeRanges = {
        '1h': 1,
        '24h': 24,
        '7d': 24 * 7,
        '30d': 24 * 30
      };
      
      const hoursAgo = timeRanges[timeRange] || 24;
      const startTime = new Date(now - hoursAgo * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', startTime);

      const { data: logs, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      if (!logs || logs.length === 0) {
        return {
          totalConversations: 0,
          averageConsistency: 0,
          byMode: {},
          trends: []
        };
      }

      // Calculate statistics
      const totalConsistency = logs.reduce((sum, log) => sum + log.consistency_score, 0);
      const averageConsistency = totalConsistency / logs.length;

      // Group by personality mode
      const byMode = {};
      for (const log of logs) {
        if (!byMode[log.personality_mode]) {
          byMode[log.personality_mode] = {
            count: 0,
            totalScore: 0,
            averageScore: 0,
            violations: []
          };
        }
        
        byMode[log.personality_mode].count++;
        byMode[log.personality_mode].totalScore += log.consistency_score;
        byMode[log.personality_mode].violations.push(...(log.violations || []));
      }

      // Calculate averages
      for (const mode in byMode) {
        byMode[mode].averageScore = byMode[mode].totalScore / byMode[mode].count;
      }

      // Trend analysis (hourly)
      const trends = this.calculateTrends(logs);

      return {
        totalConversations: logs.length,
        averageConsistency: Math.round(averageConsistency * 10) / 10,
        byMode,
        trends,
        recentLogs: logs.slice(0, 10)
      };
    } catch (error) {
      console.error('Error getting consistency stats:', error);
      throw error;
    }
  }

  /**
   * Calculate consistency trends over time
   */
  calculateTrends(logs) {
    const hourlyBuckets = {};

    for (const log of logs) {
      const hour = new Date(log.created_at).setMinutes(0, 0, 0);
      if (!hourlyBuckets[hour]) {
        hourlyBuckets[hour] = {
          timestamp: new Date(hour).toISOString(),
          count: 0,
          totalScore: 0,
          averageScore: 0
        };
      }

      hourlyBuckets[hour].count++;
      hourlyBuckets[hour].totalScore += log.consistency_score;
    }

    // Calculate averages
    const trends = Object.values(hourlyBuckets).map(bucket => ({
      timestamp: bucket.timestamp,
      count: bucket.count,
      averageScore: Math.round((bucket.totalScore / bucket.count) * 10) / 10
    }));

    return trends.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  /**
   * Flush log buffer to database
   */
  async flush() {
    if (this.logBuffer.length === 0) {
      return { success: true, count: 0 };
    }

    try {
      const logsToFlush = [...this.logBuffer];
      this.logBuffer = [];

      // First ensure the table exists by creating it if necessary
      const { error: insertError } = await supabaseAdmin
        .from('persona_consistency_logs')
        .insert(logsToFlush);

      if (insertError) {
        // If table doesn't exist, we'll just log to console for now
        console.warn('Persona consistency logs table not found. Logs will be console-only.');
        console.log('Consistency Logs:', JSON.stringify(logsToFlush, null, 2));
        return { success: true, count: logsToFlush.length, stored: false };
      }

      console.log(`✓ Flushed ${logsToFlush.length} persona consistency logs`);
      return { success: true, count: logsToFlush.length, stored: true };
    } catch (error) {
      console.error('Error flushing consistency logs:', error);
      // Re-add to buffer
      this.logBuffer.unshift(...this.logBuffer);
      throw error;
    }
  }

  /**
   * Start auto-flush timer
   */
  startAutoFlush() {
    this.flushTimer = setInterval(() => {
      this.flush().catch(err => console.error('Auto-flush error:', err));
    }, this.flushInterval);
  }

  /**
   * Stop auto-flush timer
   */
  stopAutoFlush() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Generate consistency report
   */
  async generateReport(userId, timeRange = '24h') {
    const stats = await this.getUserConsistencyStats(userId, timeRange);

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('        PERSONA CONSISTENCY REPORT');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log(`User ID: ${userId}`);
    console.log(`Time Range: ${timeRange}`);
    console.log(`Total Conversations: ${stats.totalConversations}`);
    console.log(`Average Consistency: ${stats.averageConsistency}%\n`);

    console.log('Performance by Personality Mode:');
    for (const [mode, data] of Object.entries(stats.byMode)) {
      const color = data.averageScore >= 80 ? '\x1b[32m' : data.averageScore >= 60 ? '\x1b[33m' : '\x1b[31m';
      console.log(`  ${color}${mode}:\x1b[0m ${data.averageScore.toFixed(1)}% (${data.count} conversations)`);
      
      if (data.violations.length > 0) {
        const uniqueViolations = [...new Set(data.violations)];
        console.log(`    Violations: ${uniqueViolations.join(', ')}`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════\n');

    return stats;
  }
}

export default PersonaConsistencyLogger;
