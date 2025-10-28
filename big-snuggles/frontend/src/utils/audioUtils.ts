/**
 * Audio Utilities for Voice Interface
 * Handles browser audio capture, processing, and playback
 */

export interface AudioConfig {
  sampleRate: number;
  channelCount: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  sampleRate: 16000,
  channelCount: 1,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

/**
 * Audio capture manager using MediaRecorder API
 */
export class AudioCapture {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private onDataCallback: ((data: ArrayBuffer) => void) | null = null;
  private isRecording = false;

  constructor(private config: AudioConfig = DEFAULT_AUDIO_CONFIG) {}

  /**
   * Initialize audio capture
   */
  async initialize(): Promise<void> {
    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channelCount,
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          autoGainControl: this.config.autoGainControl,
        },
      });

      // Create audio context
      this.audioContext = new AudioContext({ sampleRate: this.config.sampleRate });

      // Create media recorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      // Handle data available
      this.mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && this.onDataCallback) {
          const arrayBuffer = await event.data.arrayBuffer();
          this.onDataCallback(arrayBuffer);
        }
      };

      console.log('Audio capture initialized');
    } catch (error) {
      console.error('Error initializing audio capture:', error);
      throw new Error('Failed to access microphone. Please grant permission.');
    }
  }

  /**
   * Start recording
   * @param onData Callback for audio data chunks
   * @param chunkSize Chunk size in milliseconds
   */
  start(onData: (data: ArrayBuffer) => void, chunkSize: number = 100): void {
    if (!this.mediaRecorder) {
      throw new Error('Audio capture not initialized');
    }

    this.onDataCallback = onData;
    this.mediaRecorder.start(chunkSize);
    this.isRecording = true;
    console.log('Audio recording started');
  }

  /**
   * Stop recording
   */
  stop(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      console.log('Audio recording stopped');
    }
  }

  /**
   * Check if currently recording
   */
  getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stop();

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.mediaRecorder = null;
    this.onDataCallback = null;
    console.log('Audio capture cleaned up');
  }
}

/**
 * Audio playback manager
 */
export class AudioPlayback {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private volume = 1.0;

  constructor(private sampleRate: number = 24000) {}

  /**
   * Initialize audio playback
   */
  async initialize(): Promise<void> {
    try {
      this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = this.volume;

      console.log('Audio playback initialized');
    } catch (error) {
      console.error('Error initializing audio playback:', error);
      throw error;
    }
  }

  /**
   * Play audio buffer
   * @param audioData Base64 encoded PCM audio
   */
  async play(audioData: string): Promise<void> {
    if (!this.audioContext || !this.gainNode) {
      throw new Error('Audio playback not initialized');
    }

    try {
      // Decode base64 to array buffer
      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create audio buffer
      const audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer);

      // Create buffer source
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.gainNode);
      source.start();
    } catch (error) {
      console.error('Error playing audio:', error);
      throw error;
    }
  }

  /**
   * Set playback volume
   * @param volume Volume level (0-1)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.gainNode = null;
    console.log('Audio playback cleaned up');
  }
}

/**
 * Audio visualizer for showing voice activity
 */
export class AudioVisualizer {
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationId: number | null = null;

  constructor(private stream: MediaStream, private canvas: HTMLCanvasElement) {}

  /**
   * Initialize visualizer
   */
  async initialize(): Promise<void> {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(this.stream);
    
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    
    source.connect(this.analyser);
    
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
  }

  /**
   * Start visualization
   */
  start(): void {
    if (!this.analyser || !this.dataArray) return;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      this.animationId = requestAnimationFrame(draw);

      if (!this.analyser || !this.dataArray) return;

      this.analyser.getByteFrequencyData(this.dataArray);

      ctx.fillStyle = 'rgb(15, 23, 42)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      const barWidth = (this.canvas.width / this.dataArray.length) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < this.dataArray.length; i++) {
        barHeight = (this.dataArray[i] / 255) * this.canvas.height;

        const hue = (i / this.dataArray.length) * 360;
        ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
        ctx.fillRect(x, this.canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();
  }

  /**
   * Stop visualization
   */
  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stop();
    this.analyser = null;
    this.dataArray = null;
  }
}

/**
 * Convert ArrayBuffer to base64
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Calculate RMS volume from audio data
 */
export function calculateVolume(dataArray: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const value = dataArray[i] / 128.0 - 1.0;
    sum += value * value;
  }
  return Math.sqrt(sum / dataArray.length);
}
