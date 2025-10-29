import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const FFMPEG_PATH = '/usr/bin/ffmpeg';
const TEMP_DIR = path.join(process.cwd(), 'temp');
const MAX_CLIP_DURATION = 300; // 5 minutes max
const MIN_CLIP_DURATION = 5; // 5 seconds min

/**
 * ClipGenerator Service
 * Handles FFmpeg-based audio/video clip generation with highlight detection
 */
class ClipGenerator {
  constructor() {
    this.activeProcesses = new Map();
    this.initTempDirectory();
  }

  /**
   * Initialize temporary directory for clip processing
   */
  async initTempDirectory() {
    try {
      await fs.mkdir(TEMP_DIR, { recursive: true });
      console.log('✓ Temp directory initialized:', TEMP_DIR);
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  }

  /**
   * Extract audio segment from conversation recording
   * @param {string} inputPath - Path to input audio file
   * @param {number} startTime - Start time in seconds
   * @param {number} endTime - End time in seconds
   * @param {string} outputPath - Path for output file
   * @returns {Promise<{success: boolean, path: string, duration: number}>}
   */
  async extractAudioSegment(inputPath, startTime, endTime, outputPath) {
    try {
      // Validate inputs
      const duration = endTime - startTime;
      if (duration < MIN_CLIP_DURATION) {
        throw new Error(`Clip duration must be at least ${MIN_CLIP_DURATION} seconds`);
      }
      if (duration > MAX_CLIP_DURATION) {
        throw new Error(`Clip duration cannot exceed ${MAX_CLIP_DURATION} seconds`);
      }

      // Check if input file exists
      await fs.access(inputPath);

      // FFmpeg command to extract audio segment
      // -ss: start time, -t: duration, -acodec: audio codec
      const args = [
        '-ss', startTime.toString(),
        '-t', duration.toString(),
        '-i', inputPath,
        '-acodec', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        '-ac', '2',
        '-y', // Overwrite output file
        outputPath
      ];

      const result = await this.runFFmpegCommand(args, 'extract_audio');

      return {
        success: true,
        path: outputPath,
        duration,
        size: (await fs.stat(outputPath)).size
      };
    } catch (error) {
      console.error('Error extracting audio segment:', error);
      throw new Error(`Failed to extract audio: ${error.message}`);
    }
  }

  /**
   * Generate video with waveform visualization and subtitles
   * @param {string} audioPath - Path to audio file
   * @param {array} subtitles - Array of subtitle objects {start, end, text}
   * @param {string} outputPath - Path for output video
   * @param {object} options - Video generation options
   * @returns {Promise<{success: boolean, path: string, duration: number}>}
   */
  async generateVideoWithSubtitles(audioPath, subtitles, outputPath, options = {}) {
    try {
      const {
        width = 1280,
        height = 720,
        backgroundColor = '#1a1a2e',
        waveformColor = '#16213e',
        textColor = '#ffffff'
      } = options;

      // Create subtitle file (SRT format)
      const subtitlePath = outputPath.replace(/\.[^.]+$/, '.srt');
      await this.createSubtitleFile(subtitles, subtitlePath);

      // FFmpeg command to generate video with waveform and subtitles
      const args = [
        '-i', audioPath,
        // Generate waveform visualization
        '-filter_complex',
        `[0:a]showwaves=s=${width}x${height}:mode=line:colors=${waveformColor}:scale=sqrt[v];` +
        `[v]drawbox=x=0:y=0:w=${width}:h=${height}:color=${backgroundColor}@0.7:t=fill[bg];` +
        `[bg]subtitles=${subtitlePath}:force_style='FontName=Arial,FontSize=24,PrimaryColour=&H${this.colorToFFmpeg(textColor)},Alignment=2'[out]`,
        '-map', '[out]',
        '-map', '0:a',
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y',
        outputPath
      ];

      await this.runFFmpegCommand(args, 'generate_video');

      // Clean up subtitle file
      await fs.unlink(subtitlePath).catch(() => {});

      const stats = await fs.stat(outputPath);
      const duration = await this.getVideoDuration(outputPath);

      return {
        success: true,
        path: outputPath,
        duration,
        size: stats.size
      };
    } catch (error) {
      console.error('Error generating video:', error);
      throw new Error(`Failed to generate video: ${error.message}`);
    }
  }

  /**
   * Create thumbnail from video at specified timestamp
   * @param {string} videoPath - Path to video file
   * @param {number} timestamp - Timestamp in seconds
   * @param {string} outputPath - Path for thumbnail image
   * @returns {Promise<{success: boolean, path: string}>}
   */
  async createThumbnail(videoPath, timestamp, outputPath) {
    try {
      await fs.access(videoPath);

      // FFmpeg command to extract frame at timestamp
      const args = [
        '-ss', timestamp.toString(),
        '-i', videoPath,
        '-vframes', '1',
        '-vf', 'scale=640:360',
        '-q:v', '2',
        '-y',
        outputPath
      ];

      await this.runFFmpegCommand(args, 'create_thumbnail');

      return {
        success: true,
        path: outputPath,
        size: (await fs.stat(outputPath)).size
      };
    } catch (error) {
      console.error('Error creating thumbnail:', error);
      throw new Error(`Failed to create thumbnail: ${error.message}`);
    }
  }

  /**
   * Optimize video for web delivery in multiple formats
   * @param {string} inputPath - Path to input video
   * @param {string} outputPath - Base path for output files
   * @param {string} format - Output format (mp4, webm, mp3)
   * @returns {Promise<{success: boolean, path: string, size: number}>}
   */
  async optimizeForWeb(inputPath, outputPath, format = 'mp4') {
    try {
      await fs.access(inputPath);

      let args;
      const finalOutputPath = outputPath.replace(/\.[^.]+$/, `.${format}`);

      switch (format) {
        case 'mp4':
          // H.264 + AAC for maximum compatibility
          args = [
            '-i', inputPath,
            '-c:v', 'libx264',
            '-preset', 'slow',
            '-crf', '22',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-movflags', '+faststart',
            '-maxrate', '2M',
            '-bufsize', '4M',
            '-y',
            finalOutputPath
          ];
          break;

        case 'webm':
          // VP9 + Opus for modern browsers
          args = [
            '-i', inputPath,
            '-c:v', 'libvpx-vp9',
            '-crf', '30',
            '-b:v', '0',
            '-c:a', 'libopus',
            '-b:a', '128k',
            '-y',
            finalOutputPath
          ];
          break;

        case 'mp3':
          // Audio-only export
          args = [
            '-i', inputPath,
            '-vn',
            '-acodec', 'libmp3lame',
            '-b:a', '192k',
            '-ar', '44100',
            '-y',
            finalOutputPath
          ];
          break;

        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      await this.runFFmpegCommand(args, `optimize_${format}`);

      const stats = await fs.stat(finalOutputPath);

      return {
        success: true,
        path: finalOutputPath,
        format,
        size: stats.size
      };
    } catch (error) {
      console.error('Error optimizing for web:', error);
      throw new Error(`Failed to optimize video: ${error.message}`);
    }
  }

  /**
   * Detect highlights in conversation using sentiment analysis and engagement data
   * @param {string} conversationId - Conversation UUID
   * @param {number} sensitivity - Detection sensitivity (0.0-1.0, default 0.7)
   * @returns {Promise<array>} Array of highlight segments
   */
  async detectHighlights(conversationId, sensitivity = 0.7) {
    try {
      // Fetch conversation transcript with timestamps
      const { data: messages, error: messagesError } = await supabase
        .from('room_messages')
        .select('content, created_at, user_id')
        .eq('room_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      if (!messages || messages.length === 0) {
        return [];
      }

      // Fetch engagement data (reactions, laughter, etc.)
      const { data: engagement, error: engagementError } = await supabase
        .from('room_participants')
        .select('reactions, last_activity')
        .eq('room_id', conversationId);

      if (engagementError) throw engagementError;

      // Analyze sentiment and detect highlight moments
      const highlights = [];
      const windowSize = 30; // 30-second analysis window
      const overlapSize = 10; // 10-second overlap between windows

      for (let i = 0; i < messages.length; i++) {
        const windowMessages = messages.slice(i, i + 5); // Analyze 5 messages at a time
        
        if (windowMessages.length < 2) continue;

        const score = this.calculateHighlightScore(windowMessages, engagement, sensitivity);

        if (score >= sensitivity) {
          const startTime = new Date(windowMessages[0].created_at);
          const endTime = new Date(windowMessages[windowMessages.length - 1].created_at);
          const duration = (endTime - startTime) / 1000;

          // Ensure minimum duration and merge nearby highlights
          if (duration >= MIN_CLIP_DURATION) {
            const lastHighlight = highlights[highlights.length - 1];
            
            if (lastHighlight && (startTime - new Date(lastHighlight.end_time)) < 5000) {
              // Merge with previous highlight if within 5 seconds
              lastHighlight.end_time = windowMessages[windowMessages.length - 1].created_at;
              lastHighlight.score = Math.max(lastHighlight.score, score);
              lastHighlight.reason += `, ${this.getHighlightReason(score)}`;
            } else {
              highlights.push({
                start_time: windowMessages[0].created_at,
                end_time: windowMessages[windowMessages.length - 1].created_at,
                duration,
                score,
                type: this.getHighlightType(windowMessages),
                reason: this.getHighlightReason(score),
                content_preview: windowMessages.map(m => m.content).join(' ').substring(0, 150)
              });
            }
          }
        }
      }

      // Sort by score (best highlights first) and limit to top 10
      highlights.sort((a, b) => b.score - a.score);
      return highlights.slice(0, 10);

    } catch (error) {
      console.error('Error detecting highlights:', error);
      throw new Error(`Failed to detect highlights: ${error.message}`);
    }
  }

  /**
   * Calculate highlight score based on multiple factors
   * @private
   */
  calculateHighlightScore(messages, engagement, sensitivity) {
    let score = 0;

    // Sentiment analysis (keyword-based)
    const sentimentKeywords = {
      positive: ['love', 'amazing', 'great', 'awesome', 'perfect', 'wonderful', 'fantastic'],
      surprise: ['wow', 'omg', 'whoa', 'incredible', 'unbelievable', 'shocking'],
      humor: ['haha', 'lol', 'funny', 'hilarious', 'lmao', 'rofl', 'joke'],
      excitement: ['yes!', 'yeah!', 'woohoo', 'yay', 'excited', 'thrilled']
    };

    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      
      // Check for sentiment keywords
      Object.values(sentimentKeywords).forEach(keywords => {
        keywords.forEach(keyword => {
          if (content.includes(keyword)) {
            score += 0.15;
          }
        });
      });

      // Check for repeated punctuation (excitement indicators)
      if (content.match(/[!?]{2,}/)) {
        score += 0.1;
      }

      // Check for all caps (emphasis)
      if (content.match(/[A-Z]{5,}/)) {
        score += 0.08;
      }

      // Check for message length (longer messages often indicate depth)
      if (content.length > 100) {
        score += 0.05;
      }
    });

    // Engagement factor
    if (engagement && engagement.length > 0) {
      const avgEngagement = engagement.reduce((sum, e) => sum + (e.reactions || 0), 0) / engagement.length;
      score += avgEngagement * 0.1;
    }

    // Message frequency (rapid back-and-forth indicates engagement)
    if (messages.length >= 3) {
      const timeSpan = (new Date(messages[messages.length - 1].created_at) - new Date(messages[0].created_at)) / 1000;
      if (timeSpan < 30) { // Rapid conversation within 30 seconds
        score += 0.2;
      }
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Determine highlight type based on content
   * @private
   */
  getHighlightType(messages) {
    const content = messages.map(m => m.content.toLowerCase()).join(' ');
    
    if (content.match(/haha|lol|funny|hilarious/)) return 'humor';
    if (content.match(/wow|omg|amazing|incredible/)) return 'surprise';
    if (content.match(/love|beautiful|wonderful|perfect/)) return 'emotional';
    if (content.match(/yes!|yeah!|woohoo|victory/)) return 'celebration';
    
    return 'conversation';
  }

  /**
   * Get human-readable highlight reason
   * @private
   */
  getHighlightReason(score) {
    if (score >= 0.9) return 'Peak moment with high engagement';
    if (score >= 0.8) return 'Strong emotional reaction';
    if (score >= 0.7) return 'Engaging conversation';
    return 'Notable interaction';
  }

  /**
   * Run FFmpeg command with progress tracking
   * @private
   */
  runFFmpegCommand(args, processId) {
    return new Promise((resolve, reject) => {
      console.log(`[FFmpeg ${processId}] Starting:`, args.join(' '));

      const process = spawn(FFMPEG_PATH, args);
      this.activeProcesses.set(processId, process);

      let stderr = '';

      process.stderr.on('data', (data) => {
        stderr += data.toString();
        
        // Parse FFmpeg progress
        const timeMatch = data.toString().match(/time=(\d+):(\d+):(\d+\.\d+)/);
        if (timeMatch) {
          const hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const seconds = parseFloat(timeMatch[3]);
          const totalSeconds = hours * 3600 + minutes * 60 + seconds;
          console.log(`[FFmpeg ${processId}] Progress: ${totalSeconds.toFixed(1)}s`);
        }
      });

      process.on('close', (code) => {
        this.activeProcesses.delete(processId);

        if (code === 0) {
          console.log(`[FFmpeg ${processId}] ✓ Completed successfully`);
          resolve({ success: true });
        } else {
          console.error(`[FFmpeg ${processId}] ✗ Failed with code ${code}`);
          console.error('FFmpeg stderr:', stderr);
          reject(new Error(`FFmpeg process exited with code ${code}`));
        }
      });

      process.on('error', (error) => {
        this.activeProcesses.delete(processId);
        console.error(`[FFmpeg ${processId}] ✗ Error:`, error);
        reject(error);
      });
    });
  }

  /**
   * Get video duration using FFprobe
   * @private
   */
  async getVideoDuration(videoPath) {
    return new Promise((resolve, reject) => {
      const process = spawn('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        videoPath
      ]);

      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(parseFloat(output.trim()));
        } else {
          reject(new Error('Failed to get video duration'));
        }
      });
    });
  }

  /**
   * Create SRT subtitle file
   * @private
   */
  async createSubtitleFile(subtitles, outputPath) {
    let srtContent = '';
    
    subtitles.forEach((subtitle, index) => {
      const startTime = this.formatSRTTime(subtitle.start);
      const endTime = this.formatSRTTime(subtitle.end);
      
      srtContent += `${index + 1}\n`;
      srtContent += `${startTime} --> ${endTime}\n`;
      srtContent += `${subtitle.text}\n\n`;
    });

    await fs.writeFile(outputPath, srtContent, 'utf8');
  }

  /**
   * Format time for SRT subtitle format (HH:MM:SS,mmm)
   * @private
   */
  formatSRTTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }

  /**
   * Convert hex color to FFmpeg format
   * @private
   */
  colorToFFmpeg(hexColor) {
    const hex = hexColor.replace('#', '');
    return hex.toUpperCase();
  }

  /**
   * Cancel active FFmpeg process
   */
  cancelProcess(processId) {
    const process = this.activeProcesses.get(processId);
    if (process) {
      process.kill('SIGTERM');
      this.activeProcesses.delete(processId);
      console.log(`[FFmpeg ${processId}] Cancelled`);
      return true;
    }
    return false;
  }

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles(olderThanHours = 24) {
    try {
      const files = await fs.readdir(TEMP_DIR);
      const now = Date.now();
      const maxAge = olderThanHours * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(TEMP_DIR, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtimeMs > maxAge) {
          await fs.unlink(filePath);
          console.log(`Cleaned up temp file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }
}

// Export singleton instance
const clipGenerator = new ClipGenerator();

export default clipGenerator;
