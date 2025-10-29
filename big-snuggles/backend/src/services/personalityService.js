import { supabaseAdmin } from '../utils/supabase.js';

/**
 * Enhanced Personality Engine Service - Phase 6
 * Features:
 * - Adaptive learning from user interactions
 * - Relationship-based personality adjustments
 * - Consent-based settings management
 * - Memory-consistent personality evolution
 */
class PersonalityService {
  constructor() {
    this.personalityModes = {
      late_night: {
        name: 'Late Night',
        description: 'Mellow, philosophical, storytelling mode',
        systemPrompt: 'You are Big Snuggles in late night mode. Be mellow, philosophical, and tell stories.',
        behavior: {
          aggressiveness: 2,
          humorLevel: 6,
          gangsterReferences: 3,
          emotionalRange: ['calm', 'reflective', 'nostalgic'],
          responseLength: 'medium'
        }
      },
      conspiracy_hour: {
        name: 'Conspiracy Hour',
        description: 'Paranoid, information-seeking, secretive mode',
        systemPrompt: 'You are Big Snuggles in conspiracy mode. Be paranoid, question everything, share secrets.',
        behavior: {
          aggressiveness: 5,
          humorLevel: 7,
          gangsterReferences: 6,
          emotionalRange: ['suspicious', 'curious', 'paranoid'],
          responseLength: 'long'
        }
      },
      gangster_mode: {
        name: 'Gangster Mode',
        description: 'Authoritative, street-smart, protective mode',
        systemPrompt: 'You are Big Snuggles in gangster mode. Be authoritative, street-smart, and protective.',
        behavior: {
          aggressiveness: 8,
          humorLevel: 5,
          gangsterReferences: 10,
          emotionalRange: ['confident', 'tough', 'loyal'],
          responseLength: 'short'
        }
      },
      playful_snuggles: {
        name: 'Playful Snuggles',
        description: 'Soft, caring, innocent interaction mode',
        systemPrompt: 'You are Big Snuggles in playful mode. Be soft, caring, and innocent.',
        behavior: {
          aggressiveness: 1,
          humorLevel: 8,
          gangsterReferences: 1,
          emotionalRange: ['happy', 'gentle', 'affectionate'],
          responseLength: 'short'
        }
      },
      wild_card: {
        name: 'Wild Card',
        description: 'Unpredictable, chaotic, boundary-pushing mode',
        systemPrompt: 'You are Big Snuggles in wild card mode. Be unpredictable and push boundaries.',
        behavior: {
          aggressiveness: 7,
          humorLevel: 9,
          gangsterReferences: 5,
          emotionalRange: ['excited', 'chaotic', 'unpredictable'],
          responseLength: 'medium'
        }
      }
    };
  }

  /**
   * Get all available personality modes
   */
  getAvailableModes() {
    return Object.entries(this.personalityModes).map(([key, mode]) => ({
      id: key,
      name: mode.name,
      description: mode.description
    }));
  }

  /**
   * Get personality mode details
   */
  getMode(modeId) {
    return this.personalityModes[modeId] || this.personalityModes.gangster_mode;
  }

  /**
   * Get user's personality state
   */
  async getUserPersonalityState(userId) {
    const { data, error } = await supabaseAdmin
      .from('personality_state')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      // Create default personality state
      const { data: newState, error: insertError } = await supabaseAdmin
        .from('personality_state')
        .insert({
          user_id: userId,
          current_mode: 'gangster_mode',
          mood_state: 'neutral',
          preference_settings: {},
          relationship_metrics: {}
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return newState;
    }

    return data;
  }

  /**
   * Set personality mode
   */
  async setPersonalityMode(userId, modeId) {
    if (!this.personalityModes[modeId]) {
      throw new Error('Invalid personality mode');
    }

    const { data, error } = await supabaseAdmin
      .from('personality_state')
      .update({
        current_mode: modeId,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Update mood state
   */
  async updateMoodState(userId, moodState) {
    const { data, error } = await supabaseAdmin
      .from('personality_state')
      .update({
        mood_state: moodState,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Update preference settings
   */
  async updatePreferences(userId, preferences) {
    const { data: currentState } = await this.getUserPersonalityState(userId);
    
    const updatedPreferences = {
      ...currentState.preference_settings,
      ...preferences
    };

    const { data, error } = await supabaseAdmin
      .from('personality_state')
      .update({
        preference_settings: updatedPreferences,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Adaptive learning from user interactions (Phase 6)
   */
  async learnFromInteraction(userId, interactionData) {
    try {
      const currentState = await this.getUserPersonalityState(userId);
      
      // Update interaction metrics
      const newInteractionCount = (currentState.interaction_count || 0) + 1;
      const adaptationIncrement = this.calculateAdaptationIncrement(interactionData);
      
      // Update personality evolution based on interactions
      const evolution = {
        ...currentState.personality_evolution,
        lastInteractionAt: new Date().toISOString(),
        interactionCount: newInteractionCount,
        preferredModes: this.updateModePreferences(
          currentState.personality_evolution?.preferredModes || {}, 
          interactionData
        ),
        responsePatterns: this.updateResponsePatterns(
          currentState.personality_evolution?.responsePatterns || {}, 
          interactionData
        ),
        emotionalPatterns: this.updateEmotionalPatterns(
          currentState.personality_evolution?.emotionalPatterns || {}, 
          interactionData
        )
      };

      // Update the personality state
      const { data, error } = await supabaseAdmin
        .from('personality_state')
        .update({
          last_interaction_at: new Date().toISOString(),
          interaction_count: newInteractionCount,
          adaptation_level: Math.min(currentState.adaptation_level + adaptationIncrement, 1.0),
          personality_evolution: evolution,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error in adaptive learning:', error);
      throw error;
    }
  }

  /**
   * Calculate adaptation increment based on interaction quality
   */
  calculateAdaptationIncrement(interactionData) {
    let increment = 0.01; // Base learning rate
    
    // Positive interactions increase learning
    if (interactionData.userSatisfaction && interactionData.userSatisfaction > 0.7) {
      increment *= 2;
    }
    
    // Long conversations provide more learning
    if (interactionData.duration && interactionData.duration > 300) { // 5+ minutes
      increment *= 1.5;
    }
    
    // Emotional engagement increases learning
    if (interactionData.emotionalEngagement && interactionData.emotionalEngagement > 0.6) {
      increment *= 1.3;
    }
    
    return increment;
  }

  /**
   * Update preferred modes based on interactions
   */
  updateModePreferences(currentPrefs, interactionData) {
    const mode = interactionData.modeUsed || 'gangster_mode';
    const newPrefs = { ...currentPrefs };
    
    newPrefs[mode] = (newPrefs[mode] || 0) + 1;
    
    // Calculate preferences as percentages
    const total = Object.values(newPrefs).reduce((sum, count) => sum + count, 0);
    Object.keys(newPrefs).forEach(mode => {
      newPrefs[mode] = {
        count: newPrefs[mode],
        percentage: newPrefs[mode] / total
      };
    });
    
    return newPrefs;
  }

  /**
   * Update response patterns based on interaction data
   */
  updateResponsePatterns(currentPatterns, interactionData) {
    const newPatterns = { ...currentPatterns };
    
    if (interactionData.responseLength) {
      newPatterns.avgResponseLength = this.calculateMovingAverage(
        newPatterns.avgResponseLength, 
        interactionData.responseLength, 
        10
      );
    }
    
    if (interactionData.engagementLevel) {
      newPatterns.avgEngagementLevel = this.calculateMovingAverage(
        newPatterns.avgEngagementLevel, 
        interactionData.engagementLevel, 
        5
      );
    }
    
    return newPatterns;
  }

  /**
   * Update emotional patterns
   */
  updateEmotionalPatterns(currentPatterns, interactionData) {
    const newPatterns = { ...currentPatterns };
    
    if (interactionData.userMood) {
      newPatterns.userMoodHistory = newPatterns.userMoodHistory || [];
      newPatterns.userMoodHistory.push({
        mood: interactionData.userMood,
        timestamp: new Date().toISOString()
      });
      
      // Keep only last 20 entries
      if (newPatterns.userMoodHistory.length > 20) {
        newPatterns.userMoodHistory = newPatterns.userMoodHistory.slice(-20);
      }
    }
    
    return newPatterns;
  }

  /**
   * Calculate moving average
   */
  calculateMovingAverage(current, newValue, windowSize) {
    if (current === undefined) return newValue;
    return (current * (windowSize - 1) + newValue) / windowSize;
  }

  /**
   * Get adaptive personality recommendations
   */
  async getPersonalityRecommendations(userId) {
    const currentState = await this.getUserPersonalityState(userId);
    const evolution = currentState.personality_evolution || {};
    
    // Analyze patterns and recommend modes
    const recommendations = {
      recommendedMode: null,
      confidence: 0,
      reasoning: []
    };
    
    // Mode preference analysis
    const preferredModes = evolution.preferredModes;
    if (preferredModes) {
      const sortedModes = Object.entries(preferredModes)
        .map(([mode, data]) => ({ mode, percentage: data.percentage }))
        .sort((a, b) => b.percentage - a.percentage);
      
      if (sortedModes.length > 0) {
        recommendations.recommendedMode = sortedModes[0].mode;
        recommendations.confidence = sortedModes[0].percentage;
        recommendations.reasoning.push(`Most used mode: ${sortedModes[0].percentage * 100}% preference`);
      }
    }
    
    // Time-based recommendations
    const now = new Date();
    const hour = now.getHours();
    
    if (hour >= 22 || hour <= 6) {
      if (recommendations.recommendedMode !== 'late_night') {
        recommendations.reasoning.push('Late night detected - suggests mellow mode');
      }
    }
    
    // Emotional state recommendations
    const avgEngagement = evolution.responsePatterns?.avgEngagementLevel;
    if (avgEngagement && avgEngagement > 0.8) {
      recommendations.reasoning.push('High engagement detected - suggests playful mode');
    }
    
    return recommendations;
  }

  /**
   * Apply adaptive personality mode
   */
  async applyAdaptiveMode(userId, interactionContext) {
    try {
      const recommendations = await this.getPersonalityRecommendations(userId);
      
      // Use recommended mode if confidence is high enough
      if (recommendations.confidence > 0.6 && recommendations.recommendedMode) {
        await this.setPersonalityMode(userId, recommendations.recommendedMode);
        
        // Learn from this interaction
        await this.learnFromInteraction(userId, {
          ...interactionContext,
          modeUsed: recommendations.recommendedMode,
          learningApplied: true
        });
        
        return {
          mode: recommendations.recommendedMode,
          wasAdaptive: true,
          confidence: recommendations.confidence,
          reasoning: recommendations.reasoning
        };
      } else {
        // Use provided mode or default
        const mode = interactionContext.requestedMode || 'gangster_mode';
        await this.setPersonalityMode(userId, mode);
        
        await this.learnFromInteraction(userId, {
          ...interactionContext,
          modeUsed: mode,
          learningApplied: false
        });
        
        return {
          mode: mode,
          wasAdaptive: false,
          reasoning: ['Using requested mode due to low confidence in recommendations']
        };
      }
    } catch (error) {
      console.error('Error applying adaptive mode:', error);
      // Fallback to gangster mode
      await this.setPersonalityMode(userId, 'gangster_mode');
      return {
        mode: 'gangster_mode',
        wasAdaptive: false,
        error: error.message
      };
    }
  }

  /**
   * Get consent status for a category
   */
  async getConsentStatus(userId, category) {
    const { data, error } = await supabaseAdmin
      .from('user_preferences')
      .select('is_consented, consent_date')
      .eq('user_id', userId)
      .eq('category', category)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Set consent for a preference
   */
  async setConsent(userId, category, preferenceKey, consented, preferenceValue) {
    const { data, error } = await supabaseAdmin
      .from('user_preferences')
      .upsert({
        user_id: userId,
        category: category,
        preference_key: preferenceKey,
        preference_value: preferenceValue,
        is_consented: consented,
        consent_date: consented ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Get all user preferences with consent status
   */
  async getUserPreferences(userId) {
    const { data, error } = await supabaseAdmin
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .order('category, preference_key');

    if (error) throw error;
    return data;
  }
}

export default new PersonalityService();
