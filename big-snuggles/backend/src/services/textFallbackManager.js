/**
 * Graceful Text Fallback System
 * Ensures smooth degradation from voice to text mode when voice fails
 */

class TextFallbackManager {
  constructor() {
    this.fallbackActive = false;
    this.fallbackReason = null;
    this.fallbackStartTime = null;
    this.retryAttempts = 0;
    this.maxRetryAttempts = 3;
    this.retryDelay = 2000; // 2 seconds
    
    // Error categories for intelligent fallback
    this.errorCategories = {
      NETWORK: ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'NETWORK_ERROR'],
      API_LIMIT: ['RATE_LIMIT', 'QUOTA_EXCEEDED', 'API_LIMIT'],
      AUDIO_PROCESSING: ['INVALID_AUDIO', 'CODEC_ERROR', 'SAMPLE_RATE_ERROR'],
      API_KEY: ['INVALID_API_KEY', 'AUTHENTICATION_FAILED', 'UNAUTHORIZED'],
      BROWSER: ['MICROPHONE_ACCESS_DENIED', 'AUDIO_CONTEXT_ERROR', 'MEDIA_DEVICE_ERROR'],
      UNKNOWN: ['UNKNOWN_ERROR']
    };
  }

  /**
   * Determine if error should trigger fallback
   */
  shouldFallback(error) {
    const errorCode = error.code || error.message || '';
    
    // Critical errors that require immediate fallback
    const criticalErrors = [
      ...this.errorCategories.API_KEY,
      ...this.errorCategories.BROWSER,
      'MICROPHONE_ACCESS_DENIED'
    ];

    if (criticalErrors.some(err => errorCode.includes(err))) {
      return {
        shouldFallback: true,
        retryable: false,
        reason: this.categorizeError(error)
      };
    }

    // Transient errors that might recover
    const transientErrors = [
      ...this.errorCategories.NETWORK,
      ...this.errorCategories.API_LIMIT
    ];

    if (transientErrors.some(err => errorCode.includes(err))) {
      return {
        shouldFallback: this.retryAttempts >= this.maxRetryAttempts,
        retryable: true,
        reason: this.categorizeError(error)
      };
    }

    // Default: fallback after max retries
    return {
      shouldFallback: this.retryAttempts >= this.maxRetryAttempts,
      retryable: true,
      reason: 'UNKNOWN_ERROR'
    };
  }

  /**
   * Categorize error for appropriate handling
   */
  categorizeError(error) {
    const errorStr = JSON.stringify(error).toUpperCase();
    
    for (const [category, keywords] of Object.entries(this.errorCategories)) {
      if (keywords.some(keyword => errorStr.includes(keyword))) {
        return category;
      }
    }
    
    return 'UNKNOWN';
  }

  /**
   * Activate text fallback mode
   */
  activateFallback(reason, userMessage = null) {
    this.fallbackActive = true;
    this.fallbackReason = reason;
    this.fallbackStartTime = Date.now();

    console.log(`[TextFallback] Activated due to: ${reason}`);

    // Generate user-friendly message
    const message = this.generateFallbackMessage(reason);

    return {
      fallbackActive: true,
      reason,
      message,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate user-friendly fallback message
   */
  generateFallbackMessage(reason) {
    const messages = {
      NETWORK: "🔌 Connection issue detected. Switched to text mode for reliability.",
      API_LIMIT: "⏸️ Voice service temporarily unavailable. Using text mode to continue our conversation.",
      AUDIO_PROCESSING: "🎤 Audio processing issue. Let's continue with text instead.",
      API_KEY: "🔑 Voice service configuration needed. Text mode is ready!",
      BROWSER: "🎙️ Microphone access needed. No worries, text works great too!",
      UNKNOWN: "💬 Switched to text mode to ensure smooth conversation."
    };

    return messages[reason] || messages.UNKNOWN;
  }

  /**
   * Attempt to recover from fallback
   */
  async attemptRecovery(voiceService) {
    if (!this.fallbackActive) {
      return { recovered: false, reason: 'Not in fallback mode' };
    }

    console.log(`[TextFallback] Attempting recovery (attempt ${this.retryAttempts + 1}/${this.maxRetryAttempts})`);

    try {
      // Test voice service availability
      const isAvailable = await this.testVoiceService(voiceService);
      
      if (isAvailable) {
        this.deactivateFallback();
        return {
          recovered: true,
          message: "✅ Voice mode restored!",
          fallbackDuration: Date.now() - this.fallbackStartTime
        };
      }

      this.retryAttempts++;
      return {
        recovered: false,
        reason: 'Voice service still unavailable',
        retryAttempts: this.retryAttempts
      };
    } catch (error) {
      console.error('[TextFallback] Recovery attempt failed:', error);
      this.retryAttempts++;
      return {
        recovered: false,
        error: error.message,
        retryAttempts: this.retryAttempts
      };
    }
  }

  /**
   * Test if voice service is available
   */
  async testVoiceService(voiceService) {
    try {
      // Attempt to create a test session
      const testSession = await voiceService.createSession('test-user', 'gangster_mode');
      if (testSession && testSession.sessionId) {
        await voiceService.endSession(testSession.sessionId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[TextFallback] Voice service test failed:', error);
      return false;
    }
  }

  /**
   * Deactivate fallback mode
   */
  deactivateFallback() {
    const duration = this.fallbackStartTime ? Date.now() - this.fallbackStartTime : 0;
    
    console.log(`[TextFallback] Deactivated after ${duration}ms`);
    
    this.fallbackActive = false;
    this.fallbackReason = null;
    this.fallbackStartTime = null;
    this.retryAttempts = 0;

    return {
      deactivated: true,
      duration,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get current fallback status
   */
  getStatus() {
    return {
      active: this.fallbackActive,
      reason: this.fallbackReason,
      duration: this.fallbackStartTime ? Date.now() - this.fallbackStartTime : 0,
      retryAttempts: this.retryAttempts,
      maxRetries: this.maxRetryAttempts
    };
  }

  /**
   * Handle voice error with intelligent fallback
   */
  async handleVoiceError(error, voiceService, websocket = null) {
    console.error('[TextFallback] Voice error detected:', error);

    const fallbackDecision = this.shouldFallback(error);

    if (fallbackDecision.retryable && this.retryAttempts < this.maxRetryAttempts) {
      this.retryAttempts++;
      
      // Notify user of retry
      if (websocket) {
        websocket.send(JSON.stringify({
          type: 'voice_retry',
          attempt: this.retryAttempts,
          maxAttempts: this.maxRetryAttempts,
          message: `Reconnecting... (${this.retryAttempts}/${this.maxRetryAttempts})`
        }));
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));

      // Attempt recovery
      const recovery = await this.attemptRecovery(voiceService);
      
      if (recovery.recovered) {
        if (websocket) {
          websocket.send(JSON.stringify({
            type: 'voice_recovered',
            message: recovery.message
          }));
        }
        return {
          fallbackActivated: false,
          recovered: true,
          message: recovery.message
        };
      }
    }

    // Activate fallback if retries exhausted or non-retryable error
    if (fallbackDecision.shouldFallback) {
      const fallbackInfo = this.activateFallback(fallbackDecision.reason);
      
      if (websocket) {
        websocket.send(JSON.stringify({
          type: 'fallback_activated',
          reason: fallbackInfo.reason,
          message: fallbackInfo.message,
          userMessage: fallbackInfo.message
        }));
      }

      return {
        fallbackActivated: true,
        ...fallbackInfo
      };
    }

    return {
      fallbackActivated: false,
      retrying: true,
      attempt: this.retryAttempts
    };
  }

  /**
   * Process message in text mode
   */
  async processTextMessage(message, personalityMode, userId) {
    try {
      // Import personality service for text-based responses
      const { default: personalityService } = await import('./personalityService.js');
      
      // Get personality configuration
      const personalityConfig = await personalityService.getPersonalityMode(userId);
      
      // For now, return a simple acknowledgment
      // In production, this would integrate with the text-based AI model
      return {
        success: true,
        response: `[Text Mode - ${personalityMode}] Message received: "${message}"`,
        mode: 'text',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[TextFallback] Error processing text message:', error);
      return {
        success: false,
        error: error.message,
        response: "I'm having trouble processing that. Could you try again?"
      };
    }
  }

  /**
   * Log fallback event for analytics
   */
  async logFallbackEvent(userId, sessionId, eventType, details = {}) {
    try {
      const logEntry = {
        user_id: userId,
        session_id: sessionId,
        event_type: eventType,
        fallback_reason: this.fallbackReason,
        retry_attempts: this.retryAttempts,
        details: JSON.stringify(details),
        timestamp: new Date().toISOString()
      };

      console.log('[TextFallback] Event logged:', logEntry);

      // In production, store in database
      // await supabaseAdmin.from('fallback_logs').insert(logEntry);

      return { success: true };
    } catch (error) {
      console.error('[TextFallback] Failed to log event:', error);
      return { success: false, error: error.message };
    }
  }
}

export default TextFallbackManager;
