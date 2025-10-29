/**
 * Audio Processing Utilities
 * Handles audio format conversion, buffering, and processing for voice streaming
 */

/**
 * Convert audio buffer to PCM16 format
 * @param {ArrayBuffer|Buffer} audioData - Input audio data
 * @param {number} targetSampleRate - Target sample rate (16000 or 24000)
 * @returns {Buffer} PCM16 encoded audio
 */
export function convertToPCM16(audioData, targetSampleRate = 16000) {
  // Convert ArrayBuffer to Buffer if needed
  const buffer = Buffer.isBuffer(audioData) ? audioData : Buffer.from(audioData);
  
  // For now, assume input is already in correct format
  // In production, you'd use a library like fluent-ffmpeg or node-wav
  return buffer;
}

/**
 * Resample audio to target sample rate
 * @param {Buffer} audioBuffer - Input audio buffer
 * @param {number} sourceSampleRate - Source sample rate
 * @param {number} targetSampleRate - Target sample rate
 * @returns {Buffer} Resampled audio
 */
export function resampleAudio(audioBuffer, sourceSampleRate, targetSampleRate) {
  if (sourceSampleRate === targetSampleRate) {
    return audioBuffer;
  }

  // Simple linear interpolation resampling
  const ratio = targetSampleRate / sourceSampleRate;
  const samples = new Int16Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.length / 2);
  const resampledLength = Math.floor(samples.length * ratio);
  const resampled = new Int16Array(resampledLength);

  for (let i = 0; i < resampledLength; i++) {
    const srcIndex = i / ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, samples.length - 1);
    const fraction = srcIndex - srcIndexFloor;

    resampled[i] = Math.round(
      samples[srcIndexFloor] * (1 - fraction) + samples[srcIndexCeil] * fraction
    );
  }

  return Buffer.from(resampled.buffer);
}

/**
 * Audio buffer manager for handling streaming audio
 */
export class AudioBuffer {
  constructor(maxSizeMs = 500, sampleRate = 16000) {
    this.maxSizeMs = maxSizeMs;
    this.sampleRate = sampleRate;
    this.maxSizeBytes = (maxSizeMs * sampleRate * 2) / 1000; // 2 bytes per sample (PCM16)
    this.buffer = [];
    this.totalBytes = 0;
  }

  /**
   * Add audio chunk to buffer
   * @param {Buffer} chunk - Audio chunk to add
   */
  push(chunk) {
    this.buffer.push(chunk);
    this.totalBytes += chunk.length;

    // Remove old chunks if buffer exceeds max size
    while (this.totalBytes > this.maxSizeBytes && this.buffer.length > 0) {
      const removed = this.buffer.shift();
      this.totalBytes -= removed.length;
    }
  }

  /**
   * Get all buffered audio as a single buffer
   * @returns {Buffer} Combined audio buffer
   */
  getAll() {
    return Buffer.concat(this.buffer);
  }

  /**
   * Clear the buffer
   */
  clear() {
    this.buffer = [];
    this.totalBytes = 0;
  }

  /**
   * Get buffer size in milliseconds
   * @returns {number} Buffer size in ms
   */
  getSizeMs() {
    return (this.totalBytes * 1000) / (this.sampleRate * 2);
  }

  /**
   * Check if buffer has data
   * @returns {boolean} True if buffer has data
   */
  hasData() {
    return this.buffer.length > 0;
  }
}

/**
 * Chunk audio data into smaller segments
 * @param {Buffer} audioData - Input audio data
 * @param {number} chunkSizeMs - Chunk size in milliseconds
 * @param {number} sampleRate - Sample rate
 * @returns {Buffer[]} Array of audio chunks
 */
export function chunkAudio(audioData, chunkSizeMs = 100, sampleRate = 16000) {
  const chunkSizeBytes = (chunkSizeMs * sampleRate * 2) / 1000; // 2 bytes per sample
  const chunks = [];

  for (let i = 0; i < audioData.length; i += chunkSizeBytes) {
    chunks.push(audioData.slice(i, i + chunkSizeBytes));
  }

  return chunks;
}

/**
 * Convert base64 audio to buffer
 * @param {string} base64Audio - Base64 encoded audio
 * @returns {Buffer} Audio buffer
 */
export function base64ToBuffer(base64Audio) {
  return Buffer.from(base64Audio, 'base64');
}

/**
 * Convert buffer to base64
 * @param {Buffer} buffer - Audio buffer
 * @returns {string} Base64 encoded audio
 */
export function bufferToBase64(buffer) {
  return buffer.toString('base64');
}

/**
 * Calculate audio RMS (Root Mean Square) for volume level detection
 * @param {Buffer} audioBuffer - PCM16 audio buffer
 * @returns {number} RMS value (0-1)
 */
export function calculateRMS(audioBuffer) {
  const samples = new Int16Array(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.length / 2);
  let sum = 0;

  for (let i = 0; i < samples.length; i++) {
    const normalized = samples[i] / 32768.0; // Normalize to -1 to 1
    sum += normalized * normalized;
  }

  return Math.sqrt(sum / samples.length);
}

/**
 * Detect voice activity based on audio volume
 * @param {Buffer} audioBuffer - PCM16 audio buffer
 * @param {number} threshold - RMS threshold for voice detection (0-1)
 * @returns {boolean} True if voice is detected
 */
export function detectVoiceActivity(audioBuffer, threshold = 0.02) {
  const rms = calculateRMS(audioBuffer);
  return rms > threshold;
}
