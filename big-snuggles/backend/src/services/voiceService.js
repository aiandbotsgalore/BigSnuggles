/**
 * Voice Service
 * Handles Google Gemini Live API integration for real-time voice streaming
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabase.js';
import { AudioBuffer, convertToPCM16, resampleAudio, detectVoiceActivity } from '../utils/audioProcessing.js';
import personalityService from '../services/personalityService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const voiceConfig = JSON.parse(readFileSync(join(__dirname, '../../voice_config.json'), 'utf-8'));

// Active voice sessions map
const activeSessions = new Map();

/**
 * Voice Session Manager
 */
export class VoiceSession {
  constructor(userId, personalityMode = 'gangster_mode', websocket = null) {
    this.sessionId = uuidv4();
    this.userId = userId;
    this.personalityMode = personalityMode;
    this.websocket = websocket;
    this.geminiSession = null;
    this.audioBuffer = new AudioBuffer(
      voiceConfig.audioConfig.bufferConfig.maxBufferMs,
      voiceConfig.audioConfig.inputFormat.sampleRate
    );
    this.isActive = false;
    this.startTime = null;
    this.metrics = {
      totalAudioSent: 0,
      totalAudioReceived: 0,
      averageLatency: 0,
      latencySamples: [],
      interruptions: 0,
      errors: 0
    };
    this.lastActivityTime = Date.now();
  }

  /**
   * Initialize Gemini Live API session
   */
  async initialize() {
    try {
      const apiKey = process.env.GOOGLE_AI_API_KEY;
      if (!apiKey) {
        throw new Error('GOOGLE_AI_API_KEY not found in environment variables');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Get personality configuration
      const personality = personalityService.getMode(this.personalityMode);
      
      // Build system instruction with personality
      const systemInstruction = `${voiceConfig.character.systemInstruction}

Current Personality Mode: ${personality.name}
Description: ${personality.description}
Behavioral Traits:
${Object.entries(personality.behaviors).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

Instructions:
${personality.systemPrompt}`;

      // Configure Gemini model
      const model = genAI.getGenerativeModel({
        model: voiceConfig.geminiConfig.model,
        systemInstruction: systemInstruction,
      });

      // Start live session
      this.geminiSession = model.startChat({
        generationConfig: {
          responseModalities: voiceConfig.geminiConfig.responseModalities,
          speechConfig: voiceConfig.character.voiceConfig,
        },
      });

      this.isActive = true;
      this.startTime = Date.now();

      // Store session in database
      await this.saveSession();

      console.log(`Voice session ${this.sessionId} initialized for user ${this.userId}`);
      
      return {
        success: true,
        sessionId: this.sessionId,
        config: {
          sampleRate: voiceConfig.audioConfig.inputFormat.sampleRate,
          outputSampleRate: voiceConfig.audioConfig.outputFormat.sampleRate,
          chunkSizeMs: voiceConfig.audioConfig.bufferConfig.chunkSizeMs
        }
      };
    } catch (error) {
      console.error('Error initializing voice session:', error);
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Process incoming audio chunk from user
   * @param {Buffer} audioChunk - PCM16 audio data at 16kHz
   */
  async processAudioInput(audioChunk) {
    try {
      if (!this.isActive || !this.geminiSession) {
        throw new Error('Voice session not active');
      }

      this.lastActivityTime = Date.now();
      const startTime = Date.now();

      // Detect voice activity
      const hasVoice = detectVoiceActivity(audioChunk);
      
      // Add to buffer
      this.audioBuffer.push(audioChunk);
      this.metrics.totalAudioSent += audioChunk.length;

      // Only send to Gemini if voice is detected
      if (hasVoice) {
        // Convert buffer to base64 for Gemini API
        const base64Audio = audioChunk.toString('base64');

        // Send to Gemini Live API
        const result = await this.geminiSession.sendMessage([
          {
            inlineData: {
              mimeType: 'audio/pcm',
              data: base64Audio
            }
          }
        ]);

        // Process response
        const response = await result.response;
        const audioResponse = this.extractAudioFromResponse(response);

        if (audioResponse) {
          // Calculate latency
          const latency = Date.now() - startTime;
          this.updateLatencyMetrics(latency);

          // Send audio response to client
          if (this.websocket && this.websocket.readyState === 1) {
            this.websocket.send(JSON.stringify({
              type: 'audio_response',
              data: audioResponse.toString('base64'),
              sessionId: this.sessionId,
              latency: latency,
              hasVoice: true
            }));
          }

          this.metrics.totalAudioReceived += audioResponse.length;

          // Save interaction to database
          await this.saveInteraction('audio', audioChunk.length, audioResponse.length);
        }
      }

      return { success: true, hasVoice };
    } catch (error) {
      console.error('Error processing audio input:', error);
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Process text input (fallback mode)
   * @param {string} text - Text message from user
   */
  async processTextInput(text) {
    try {
      if (!this.isActive || !this.geminiSession) {
        throw new Error('Voice session not active');
      }

      const startTime = Date.now();
      
      const result = await this.geminiSession.sendMessage(text);
      const response = await result.response;
      const textResponse = response.text();
      const audioResponse = this.extractAudioFromResponse(response);

      const latency = Date.now() - startTime;
      this.updateLatencyMetrics(latency);

      // Send response to client
      if (this.websocket && this.websocket.readyState === 1) {
        this.websocket.send(JSON.stringify({
          type: 'text_response',
          text: textResponse,
          audioData: audioResponse ? audioResponse.toString('base64') : null,
          sessionId: this.sessionId,
          latency: latency
        }));
      }

      // Save interaction to database
      await this.saveInteraction('text', text.length, textResponse.length);

      return { success: true, text: textResponse };
    } catch (error) {
      console.error('Error processing text input:', error);
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Extract audio data from Gemini response
   * @param {Object} response - Gemini API response
   * @returns {Buffer|null} Audio buffer or null
   */
  extractAudioFromResponse(response) {
    try {
      // Check if response contains audio
      const candidates = response.candidates || [];
      if (candidates.length === 0) return null;

      const content = candidates[0].content;
      if (!content || !content.parts) return null;

      // Find audio part
      for (const part of content.parts) {
        if (part.inlineData && part.inlineData.mimeType === 'audio/pcm') {
          return Buffer.from(part.inlineData.data, 'base64');
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting audio from response:', error);
      return null;
    }
  }

  /**
   * Handle user interruption
   */
  async handleInterruption() {
    try {
      this.metrics.interruptions++;
      
      // Clear audio buffer
      this.audioBuffer.clear();

      // Notify client
      if (this.websocket && this.websocket.readyState === 1) {
        this.websocket.send(JSON.stringify({
          type: 'interruption',
          sessionId: this.sessionId,
          reason: 'user_speaking'
        }));
      }

      console.log(`Interruption handled for session ${this.sessionId}`);
    } catch (error) {
      console.error('Error handling interruption:', error);
    }
  }

  /**
   * Update latency metrics
   * @param {number} latency - Latency in milliseconds
   */
  updateLatencyMetrics(latency) {
    this.metrics.latencySamples.push(latency);
    
    // Keep only last 100 samples
    if (this.metrics.latencySamples.length > 100) {
      this.metrics.latencySamples.shift();
    }

    // Calculate average
    this.metrics.averageLatency = 
      this.metrics.latencySamples.reduce((a, b) => a + b, 0) / 
      this.metrics.latencySamples.length;
  }

  /**
   * Save session to database
   */
  async saveSession() {
    try {
      const { data, error } = await supabase
        .from('session_analytics')
        .insert({
          user_id: this.userId,
          session_id: this.sessionId,
          session_type: 'voice',
          personality_mode: this.personalityMode,
          started_at: new Date().toISOString(),
          is_active: true
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving session to database:', error);
    }
  }

  /**
   * Save interaction to database
   * @param {string} type - Interaction type (audio/text)
   * @param {number} inputSize - Input data size
   * @param {number} outputSize - Output data size
   */
  async saveInteraction(type, inputSize, outputSize) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: this.userId,
          session_id: this.sessionId,
          interaction_type: type,
          input_size: inputSize,
          output_size: outputSize,
          latency_ms: this.metrics.averageLatency,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving interaction to database:', error);
    }
  }

  /**
   * End voice session
   */
  async end() {
    try {
      this.isActive = false;
      
      const duration = Date.now() - this.startTime;

      // Update session in database
      const { data, error } = await supabase
        .from('session_analytics')
        .update({
          ended_at: new Date().toISOString(),
          is_active: false,
          duration_ms: duration,
          total_audio_sent: this.metrics.totalAudioSent,
          total_audio_received: this.metrics.totalAudioReceived,
          average_latency_ms: this.metrics.averageLatency,
          total_interruptions: this.metrics.interruptions,
          total_errors: this.metrics.errors
        })
        .eq('session_id', this.sessionId);

      if (error) throw error;

      console.log(`Voice session ${this.sessionId} ended. Duration: ${duration}ms`);
      
      return {
        success: true,
        sessionId: this.sessionId,
        duration: duration,
        metrics: this.metrics
      };
    } catch (error) {
      console.error('Error ending voice session:', error);
      throw error;
    }
  }

  /**
   * Check if session has exceeded time limit
   * @returns {boolean} True if session should be ended
   */
  shouldEnd() {
    if (!this.startTime) return false;
    
    const duration = Date.now() - this.startTime;
    return duration >= voiceConfig.sessionConfig.maxDurationMs;
  }

  /**
   * Check if session should show warning
   * @returns {boolean} True if warning should be shown
   */
  shouldWarn() {
    if (!this.startTime) return false;
    
    const duration = Date.now() - this.startTime;
    return duration >= voiceConfig.sessionConfig.warningThresholdMs && 
           duration < voiceConfig.sessionConfig.maxDurationMs;
  }
}

/**
 * Create new voice session
 * @param {string} userId - User ID
 * @param {string} personalityMode - Personality mode
 * @param {WebSocket} websocket - WebSocket connection
 * @returns {VoiceSession} Voice session instance
 */
export async function createVoiceSession(userId, personalityMode, websocket) {
  const session = new VoiceSession(userId, personalityMode, websocket);
  await session.initialize();
  
  activeSessions.set(session.sessionId, session);
  
  return session;
}

/**
 * Get active voice session
 * @param {string} sessionId - Session ID
 * @returns {VoiceSession|null} Voice session or null
 */
export function getVoiceSession(sessionId) {
  return activeSessions.get(sessionId) || null;
}

/**
 * End voice session
 * @param {string} sessionId - Session ID
 */
export async function endVoiceSession(sessionId) {
  const session = activeSessions.get(sessionId);
  if (session) {
    await session.end();
    activeSessions.delete(sessionId);
  }
}

/**
 * Get all active sessions for a user
 * @param {string} userId - User ID
 * @returns {VoiceSession[]} Array of active sessions
 */
export function getUserSessions(userId) {
  const sessions = [];
  for (const session of activeSessions.values()) {
    if (session.userId === userId) {
      sessions.push(session);
    }
  }
  return sessions;
}

/**
 * Cleanup inactive sessions (called periodically)
 */
export async function cleanupSessions() {
  const now = Date.now();
  const timeout = 5 * 60 * 1000; // 5 minutes

  for (const [sessionId, session] of activeSessions.entries()) {
    // End sessions that exceeded time limit or are inactive
    if (session.shouldEnd() || (now - session.lastActivityTime > timeout)) {
      console.log(`Cleaning up inactive session: ${sessionId}`);
      await endVoiceSession(sessionId);
    }
  }
}

// Run cleanup every minute
setInterval(cleanupSessions, 60 * 1000);
