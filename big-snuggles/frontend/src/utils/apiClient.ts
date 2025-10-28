/**
 * API Client Utility - Phase 5
 * Centralized API client for all HTTP requests to the backend
 */

import { supabase } from '@/lib/supabase';

const BASE_URL = process.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  constructor() {
    this.baseURL = BASE_URL;
  }

  /**
   * Get authentication headers
   */
  async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Make a GET request
   */
  async get(endpoint) {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`GET ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * Make a POST request
   */
  async post(endpoint, body) {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`POST ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * Make a PUT request
   */
  async put(endpoint, body) {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`PUT ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * Make a DELETE request
   */
  async delete(endpoint) {
    try {
      const headers = await this.getAuthHeaders();
      
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'DELETE',
        headers
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`DELETE ${endpoint} failed:`, error);
      throw error;
    }
  }

  // Specialized API methods

  /**
   * Memory API
   */
  async getMemories() {
    return this.get('/api/memory');
  }

  async createMemory(data) {
    return this.post('/api/memory', data);
  }

  async updateMemory(id, data) {
    return this.put(`/api/memory/${id}`, data);
  }

  async deleteMemory(id) {
    return this.delete(`/api/memory/${id}`);
  }

  /**
   * Session API
   */
  async startSession() {
    return this.post('/api/session/start', {});
  }

  async endSession(sessionId) {
    return this.post('/api/session/end', { sessionId });
  }

  /**
   * Personality API
   */
  async getPersonalityModes() {
    return this.get('/api/personality/modes');
  }

  async switchPersonality(mode) {
    return this.post('/api/personality/switch', { mode });
  }

  /**
   * Voice API
   */
  async startVoiceSession() {
    return this.post('/api/voice/session/start', {});
  }

  async endVoiceSession(sessionId) {
    return this.post('/api/voice/session/end', { sessionId });
  }

  // Phase 5: Transcript API
  async getTranscripts(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const endpoint = `/api/transcripts${queryParams ? `?${queryParams}` : ''}`;
    return this.get(endpoint);
  }

  async getTranscript(id) {
    return this.get(`/api/transcripts/${id}`);
  }

  async storeTranscript(sessionId, messages, metadata = {}) {
    return this.post('/api/transcripts/store', {
      sessionId,
      messages,
      metadata
    });
  }

  async searchTranscripts(query, filters = {}) {
    return this.post('/api/transcripts/search', {
      query,
      filters
    });
  }

  async generateHighlights(messages, criteria = {}) {
    return this.post('/api/transcripts/generate-highlights', {
      messages,
      criteria
    });
  }

  async analyzeSentiment(messages) {
    return this.post('/api/transcripts/analyze-sentiment', {
      messages
    });
  }

  async getStatistics() {
    return this.get('/api/transcripts/statistics');
  }

  // ========== PHASE 6: ENHANCED MEMORY API ==========

  async storeEnhancedMemory(memoryData) {
    return this.post('/api/memory/enhanced', memoryData);
  }

  async searchMemories(options = {}) {
    const params = new URLSearchParams();
    if (options.memoryType) params.append('memoryType', options.memoryType);
    if (options.tags) params.append('tags', options.tags.join(','));
    if (options.minImportance) params.append('minImportance', options.minImportance);
    if (options.searchText) params.append('q', options.searchText);
    if (options.limit) params.append('limit', options.limit);
    if (options.startDate && options.endDate) {
      params.append('startDate', options.startDate);
      params.append('endDate', options.endDate);
    }

    return this.get(`/api/memory/search?${params.toString()}`);
  }

  async createMemoryAssociation(memoryId1, memoryId2, associationType, strength = 0.5) {
    return this.post('/api/memory/associate', {
      memoryId1,
      memoryId2,
      associationType,
      strength
    });
  }

  async getMemoryAssociations(memoryId, limit = 10) {
    return this.get(`/api/memory/${memoryId}/associations?limit=${limit}`);
  }

  async getMemoryStatistics() {
    return this.get('/api/memory/statistics');
  }

  async getMemoryTypes() {
    return this.get('/api/memory/types');
  }

  async cleanupExpiredMemories() {
    return this.post('/api/memory/cleanup');
  }

  // ========== PHASE 6: ENHANCED PERSONALITY API ==========

  async learnFromInteraction(interactionData) {
    return this.post('/api/personality/enhanced/learn', interactionData);
  }

  async getPersonalityRecommendations() {
    return this.get('/api/personality/enhanced/recommendations');
  }

  async applyAdaptiveMode(interactionContext) {
    return this.post('/api/personality/enhanced/adaptive-mode', interactionContext);
  }

  async getConsentStatus(category) {
    return this.get(`/api/personality/enhanced/consent/${category}`);
  }

  async setConsent(category, preferenceKey, consented, preferenceValue) {
    return this.post('/api/personality/enhanced/consent', {
      category,
      preferenceKey,
      consented,
      preferenceValue
    });
  }

  async getUserPreferences() {
    return this.get('/api/personality/enhanced/preferences');
  }

  async setPersonalityMode(modeId, forceMode = false, reason = '') {
    return this.put(`/api/personality/enhanced/mode/${modeId}`, {
      forceMode,
      reason
    });
  }

  async getAdaptiveStatus() {
    return this.get('/api/personality/enhanced/adaptive-status');
  }

  async updateAdaptiveSettings(settings) {
    return this.put('/api/personality/enhanced/adaptive-settings', settings);
  }

  async getEnhancedPersonalityModes() {
    return this.get('/api/personality/enhanced/modes/enhanced');
  }
}

// Create a singleton instance
const apiClient = new ApiClient();

export { apiClient as ApiClient };
export default apiClient;
export { getApiClient };

/**
 * Factory function to get a fresh API client instance
 */
function getApiClient() {
  return new ApiClient();
}