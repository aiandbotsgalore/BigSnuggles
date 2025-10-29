import { supabaseAdmin } from '../utils/supabase.js';

/**
 * Enhanced Memory Management Service - Phase 6
 * Handles advanced memory operations including:
 * - Multiple memory types (episodic, semantic, procedural, etc.)
 * - Memory associations and connections
 * - Adaptive importance scoring
 * - Content filtering and consent management
 */
class MemoryService {
  /**
   * Get memories for a specific session
   */
  async getSessionMemories(userId, sessionId) {
    const { data, error } = await supabaseAdmin
      .from('memory')
      .select('*')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .order('importance_score', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Get all memories for a user
   */
  async getUserMemories(userId, limit = 50) {
    const { data, error } = await supabaseAdmin
      .from('memory')
      .select('*')
      .eq('user_id', userId)
      .order('importance_score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  /**
   * Store a new memory
   */
  async storeMemory(memoryData) {
    const { data, error } = await supabaseAdmin
      .from('memory')
      .insert({
        user_id: memoryData.userId,
        session_id: memoryData.sessionId,
        key: memoryData.key,
        value: memoryData.value,
        importance_score: memoryData.importanceScore || 1,
        emotional_weight: memoryData.emotionalWeight || 0.0,
        expires_at: memoryData.expiresAt || null
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update an existing memory
   */
  async updateMemory(memoryId, userId, updates) {
    const { data, error } = await supabaseAdmin
      .from('memory')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', memoryId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a memory
   */
  async deleteMemory(memoryId, userId) {
    const { error } = await supabaseAdmin
      .from('memory')
      .delete()
      .eq('id', memoryId)
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
  }

  /**
   * Get important memories across all sessions
   */
  async getImportantMemories(userId, minImportance = 5, limit = 20) {
    const { data, error } = await supabaseAdmin
      .from('memory')
      .select('*')
      .eq('user_id', userId)
      .gte('importance_score', minImportance)
      .order('importance_score', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  /**
   * Store memory with enhanced features (Phase 6)
   */
  async storeEnhancedMemory(memoryData) {
    // Calculate importance based on multiple factors
    const importanceScore = this.calculateImportanceScore(memoryData);
    
    const { data, error } = await supabaseAdmin
      .from('memory')
      .insert({
        user_id: memoryData.userId,
        session_id: memoryData.sessionId,
        key: memoryData.key,
        value: memoryData.value,
        memory_type: memoryData.memoryType || 'episodic',
        tags: memoryData.tags || [],
        context_data: memoryData.contextData || {},
        source_conversation_id: memoryData.sourceConversationId,
        importance_score: importanceScore.baseScore,
        emotional_weight: memoryData.emotionalWeight || 0.0,
        expires_at: memoryData.expiresAt || null
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Calculate memory importance using multiple factors
   */
  calculateImportanceScore(memoryData) {
    let score = memoryData.importanceScore || 1;
    
    // Factor 1: Emotional weight
    if (memoryData.emotionalWeight) {
      score += memoryData.emotionalWeight * 5;
    }
    
    // Factor 2: Memory type
    const typeMultipliers = {
      'relationship': 3.0,
      'emotional': 2.5,
      'episodic': 1.5,
      'semantic': 1.2,
      'procedural': 1.0,
      'contextual': 0.8
    };
    
    const typeMultiplier = typeMultipliers[memoryData.memoryType] || 1.0;
    score *= typeMultiplier;
    
    // Factor 3: Contextual clues
    if (memoryData.keywords) {
      const highValueKeywords = ['love', 'hate', 'family', 'fear', 'dream', 'goal', 'secret', 'important'];
      const foundKeywords = memoryData.keywords.filter(kw => 
        highValueKeywords.some(hvk => kw.toLowerCase().includes(hvk))
      );
      score += foundKeywords.length * 2;
    }
    
    return {
      baseScore: Math.round(score),
      factors: {
        emotional: memoryData.emotionalWeight || 0,
        typeMultiplier,
        keywordBoost: memoryData.keywords ? foundKeywords?.length || 0 : 0
      }
    };
  }

  /**
   * Create memory association between related memories
   */
  async createMemoryAssociation(memoryId1, memoryId2, associationType, strength = 0.5) {
    const { data, error } = await supabaseAdmin
      .from('memory_associations')
      .insert({
        memory_id_1: memoryId1,
        memory_id_2: memoryId2,
        association_type: associationType,
        strength: strength
      })
      .select()
      .single();

    if (error) throw error;
    
    // Update association count on both memories
    await this.updateAssociationCount(memoryId1);
    await this.updateAssociationCount(memoryId2);
    
    return data;
  }

  /**
   * Update association count for a memory
   */
  async updateAssociationCount(memoryId) {
    const { count, error } = await supabaseAdmin
      .from('memory_associations')
      .select('*', { count: 'exact', head: true })
      .or(`memory_id_1.eq.${memoryId},memory_id_2.eq.${memoryId}`);

    if (error) throw error;
    
    await supabaseAdmin
      .from('memory')
      .update({ associations_count: count })
      .eq('id', memoryId);
  }

  /**
   * Get associated memories for a given memory
   */
  async getAssociatedMemories(memoryId, limit = 10) {
    const { data, error } = await supabaseAdmin
      .from('memory_associations')
      .select(`
        *,
        memory_id_1:memory!memory_associations_memory_id_1_fkey(*),
        memory_id_2:memory!memory_associations_memory_id_2_fkey(*)
      `)
      .or(`memory_id_1.eq.${memoryId},memory_id_2.eq.${memoryId}`)
      .order('strength', { ascending: false })
      .limit(limit);

    if (error) throw error;
    
    return data.map(assoc => {
      const associatedMemory = assoc.memory_id_1.id === memoryId ? assoc.memory_id_2 : assoc.memory_id_1;
      return {
        ...associatedMemory,
        association: {
          type: assoc.association_type,
          strength: assoc.strength
        }
      };
    });
  }

  /**
   * Search memories with enhanced filtering
   */
  async searchMemories(userId, options = {}) {
    let query = supabaseAdmin
      .from('memory')
      .select('*')
      .eq('user_id', userId);

    // Apply filters
    if (options.memoryType) {
      query = query.eq('memory_type', options.memoryType);
    }
    
    if (options.tags && options.tags.length > 0) {
      query = query.overlaps('tags', options.tags);
    }
    
    if (options.minImportance) {
      query = query.gte('importance_score', options.minImportance);
    }
    
    if (options.dateRange) {
      query = query.gte('created_at', options.dateRange.start)
                  .lte('created_at', options.dateRange.end);
    }
    
    // Apply search text if provided
    if (options.searchText) {
      query = query.or(`key.ilike.%${options.searchText}%,value->>text.ilike.%${options.searchText}%`);
    }
    
    // Order and limit
    query = query
      .order('importance_score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(options.limit || 50);

    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  }

  /**
   * Get memory statistics for a user
   */
  async getMemoryStatistics(userId) {
    const { data, error } = await supabaseAdmin
      .from('memory')
      .select('memory_type, importance_score, emotional_weight, created_at')
      .eq('user_id', userId);

    if (error) throw error;
    
    const stats = {
      totalMemories: data.length,
      byType: {},
      avgImportance: 0,
      avgEmotionalWeight: 0,
      recentMemories: 0,
      highImportanceMemories: 0
    };

    let totalImportance = 0;
    let totalEmotional = 0;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    data.forEach(memory => {
      // Count by type
      stats.byType[memory.memory_type] = (stats.byType[memory.memory_type] || 0) + 1;
      
      // Calculate averages
      totalImportance += memory.importance_score;
      totalEmotional += memory.emotional_weight;
      
      // Recent memories
      if (new Date(memory.created_at) > oneWeekAgo) {
        stats.recentMemories++;
      }
      
      // High importance memories
      if (memory.importance_score >= 7) {
        stats.highImportanceMemories++;
      }
    });

    if (data.length > 0) {
      stats.avgImportance = totalImportance / data.length;
      stats.avgEmotionalWeight = totalEmotional / data.length;
    }

    return stats;
  }

  /**
   * Clean up expired memories
   */
  async cleanupExpiredMemories() {
    const { data, error } = await supabaseAdmin
      .from('memory')
      .delete()
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString());

    if (error) throw error;
    return data;
  }
}

export default new MemoryService();
