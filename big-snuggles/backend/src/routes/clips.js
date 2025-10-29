import express from 'express';
import { createClient } from '@supabase/supabase-js';
import clipGenerator from '../services/clipGenerator.js';
import path from 'path';
import fs from 'fs/promises';
import { enforceQuota } from '../middleware/featureGates.js';

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Background job queue for async processing
const jobQueue = new Map();

/**
 * POST /api/clips/auto-generate
 * Automatically detect and generate highlight clips from a conversation
 * Enforces monthly clip quota based on subscription tier
 */
router.post('/auto-generate', enforceQuota('clips'), async (req, res) => {
  try {
    const { conversationId, sensitivity = 0.7, userId } = req.body;

    if (!conversationId || !userId) {
      return res.status(400).json({ error: 'conversationId and userId are required' });
    }

    // Validate sensitivity
    if (sensitivity < 0 || sensitivity > 1) {
      return res.status(400).json({ error: 'Sensitivity must be between 0 and 1' });
    }

    // Check if conversation exists and user has access
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, audio_file_url')
      .eq('id', conversationId)
      .single();

    if (roomError || !room) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Verify user is a participant
    const { data: participant, error: participantError } = await supabase
      .from('room_participants')
      .select('id')
      .eq('room_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (participantError || !participant) {
      return res.status(403).json({ error: 'User not authorized to access this conversation' });
    }

    // Detect highlights
    console.log(`Detecting highlights for conversation ${conversationId} with sensitivity ${sensitivity}`);
    const highlights = await clipGenerator.detectHighlights(conversationId, sensitivity);

    if (highlights.length === 0) {
      return res.json({
        message: 'No highlights detected',
        highlights: [],
        count: 0
      });
    }

    // Create clip records for each highlight
    const clipPromises = highlights.map(async (highlight, index) => {
      const { data: clip, error: clipError } = await supabase
        .from('clips')
        .insert({
          user_id: userId,
          conversation_id: conversationId,
          title: `Highlight ${index + 1}`,
          description: highlight.reason,
          start_time: highlight.start_time,
          end_time: highlight.end_time,
          duration: highlight.duration,
          highlight_type: highlight.type,
          highlight_reason: highlight.reason,
          status: 'pending',
          processing_progress: 0
        })
        .select()
        .single();

      if (clipError) {
        console.error('Error creating clip record:', clipError);
        return null;
      }

      // Queue background processing job
      queueClipProcessing(clip.id, room.audio_file_url, highlight);

      return clip;
    });

    const clips = (await Promise.all(clipPromises)).filter(c => c !== null);

    res.json({
      message: 'Highlights detected and queued for processing',
      highlights: clips,
      count: clips.length
    });

  } catch (error) {
    console.error('Error auto-generating clips:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/clips/create
 * Manually create a clip with specified time range
 * Enforces monthly clip quota based on subscription tier
 */
router.post('/create', enforceQuota('clips'), async (req, res) => {
  try {
    const {
      conversationId,
      userId,
      title,
      description,
      startTime,
      endTime
    } = req.body;

    // Validate required fields
    if (!conversationId || !userId || !startTime || !endTime) {
      return res.status(400).json({
        error: 'conversationId, userId, startTime, and endTime are required'
      });
    }

    // Validate time range
    const duration = endTime - startTime;
    if (duration < 5) {
      return res.status(400).json({ error: 'Clip duration must be at least 5 seconds' });
    }
    if (duration > 300) {
      return res.status(400).json({ error: 'Clip duration cannot exceed 5 minutes' });
    }

    // Check if conversation exists
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, audio_file_url')
      .eq('id', conversationId)
      .single();

    if (roomError || !room) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Verify user is a participant
    const { data: participant, error: participantError } = await supabase
      .from('room_participants')
      .select('id')
      .eq('room_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (participantError || !participant) {
      return res.status(403).json({ error: 'User not authorized to access this conversation' });
    }

    // Create clip record
    const { data: clip, error: clipError } = await supabase
      .from('clips')
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        title: title || 'Custom Clip',
        description: description || '',
        start_time: new Date(Date.now() + startTime * 1000).toISOString(),
        end_time: new Date(Date.now() + endTime * 1000).toISOString(),
        duration,
        highlight_type: 'manual',
        highlight_reason: 'User-created clip',
        status: 'pending',
        processing_progress: 0
      })
      .select()
      .single();

    if (clipError) {
      console.error('Error creating clip:', clipError);
      return res.status(500).json({ error: 'Failed to create clip' });
    }

    // Queue background processing
    queueClipProcessing(clip.id, room.audio_file_url, {
      start_time: clip.start_time,
      end_time: clip.end_time,
      duration: clip.duration
    });

    res.json({
      message: 'Clip creation queued',
      clip
    });

  } catch (error) {
    console.error('Error creating clip:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/clips/:clipId/status
 * Get processing status of a clip
 */
router.get('/:clipId/status', async (req, res) => {
  try {
    const { clipId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    // Fetch clip with ownership verification
    const { data: clip, error: clipError } = await supabase
      .from('clips')
      .select('*')
      .eq('id', clipId)
      .eq('user_id', userId)
      .single();

    if (clipError || !clip) {
      return res.status(404).json({ error: 'Clip not found' });
    }

    res.json({
      id: clip.id,
      status: clip.status,
      progress: clip.processing_progress,
      error: clip.error_message,
      completed_at: clip.completed_at,
      clip_urls: clip.clip_urls,
      thumbnail_url: clip.thumbnail_url
    });

  } catch (error) {
    console.error('Error fetching clip status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/clips/:clipId/download
 * Download clip file
 */
router.get('/:clipId/download', async (req, res) => {
  try {
    const { clipId } = req.params;
    const { userId, format = 'mp4' } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    // Validate format
    const allowedFormats = ['mp4', 'webm', 'mp3'];
    if (!allowedFormats.includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Allowed: mp4, webm, mp3' });
    }

    // Fetch clip
    const { data: clip, error: clipError } = await supabase
      .from('clips')
      .select('*')
      .eq('id', clipId)
      .eq('user_id', userId)
      .single();

    if (clipError || !clip) {
      return res.status(404).json({ error: 'Clip not found' });
    }

    if (clip.status !== 'completed') {
      return res.status(400).json({ error: 'Clip is not ready for download' });
    }

    // Get download URL from clip_urls
    const clipUrl = clip.clip_urls?.[format];
    if (!clipUrl) {
      return res.status(404).json({ error: `Format ${format} not available` });
    }

    // Increment view count
    await supabase
      .from('clips')
      .update({ view_count: clip.view_count + 1 })
      .eq('id', clipId);

    // Return download URL
    res.json({
      download_url: clipUrl,
      format,
      file_size: clip.file_size_bytes,
      duration: clip.duration
    });

  } catch (error) {
    console.error('Error downloading clip:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/clips/users/:userId/clips
 * Get all clips for a user
 */
router.get('/users/:userId/clips', async (req, res) => {
  try {
    const { userId } = req.params;
    const { conversationId, status, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('clips')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Optional filters
    if (conversationId) {
      query = query.eq('conversation_id', conversationId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: clips, error: clipsError, count } = await query;

    if (clipsError) {
      console.error('Error fetching clips:', clipsError);
      return res.status(500).json({ error: 'Failed to fetch clips' });
    }

    res.json({
      clips,
      count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Error fetching user clips:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/clips/:clipId
 * Delete a clip
 */
router.delete('/:clipId', async (req, res) => {
  try {
    const { clipId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    // Fetch clip to verify ownership and get file URLs
    const { data: clip, error: clipError } = await supabase
      .from('clips')
      .select('*')
      .eq('id', clipId)
      .eq('user_id', userId)
      .single();

    if (clipError || !clip) {
      return res.status(404).json({ error: 'Clip not found' });
    }

    // Delete files from storage
    if (clip.clip_urls) {
      const deletePromises = Object.values(clip.clip_urls).map(url => {
        const fileName = url.split('/').pop();
        return supabase.storage.from('clips').remove([fileName]);
      });

      await Promise.all(deletePromises);
    }

    // Delete thumbnail
    if (clip.thumbnail_url) {
      const thumbnailName = clip.thumbnail_url.split('/').pop();
      await supabase.storage.from('clips').remove([thumbnailName]);
    }

    // Delete database record
    const { error: deleteError } = await supabase
      .from('clips')
      .delete()
      .eq('id', clipId);

    if (deleteError) {
      console.error('Error deleting clip:', deleteError);
      return res.status(500).json({ error: 'Failed to delete clip' });
    }

    res.json({ message: 'Clip deleted successfully' });

  } catch (error) {
    console.error('Error deleting clip:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/clips/:clipId/share
 * Track clip sharing to social media
 */
router.post('/:clipId/share', async (req, res) => {
  try {
    const { clipId } = req.params;
    const { userId, platform } = req.body;

    if (!userId || !platform) {
      return res.status(400).json({ error: 'userId and platform are required' });
    }

    // Validate platform
    const allowedPlatforms = ['twitter', 'instagram', 'tiktok', 'facebook', 'other'];
    if (!allowedPlatforms.includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    // Verify clip ownership
    const { data: clip, error: clipError } = await supabase
      .from('clips')
      .select('id, share_count')
      .eq('id', clipId)
      .eq('user_id', userId)
      .single();

    if (clipError || !clip) {
      return res.status(404).json({ error: 'Clip not found' });
    }

    // Record share
    const { error: shareError } = await supabase
      .from('clip_shares')
      .insert({
        clip_id: clipId,
        platform,
        shared_at: new Date().toISOString()
      });

    if (shareError) {
      console.error('Error recording share:', shareError);
    }

    // Increment share count
    await supabase
      .from('clips')
      .update({ share_count: clip.share_count + 1 })
      .eq('id', clipId);

    res.json({ message: 'Share recorded successfully' });

  } catch (error) {
    console.error('Error recording share:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Background job processing function
 * Processes clip generation asynchronously
 */
async function queueClipProcessing(clipId, audioFileUrl, highlight) {
  const jobId = `clip_${clipId}`;
  
  if (jobQueue.has(jobId)) {
    console.log(`Job ${jobId} already queued`);
    return;
  }

  jobQueue.set(jobId, { status: 'queued', progress: 0 });

  // Process in background (don't await)
  processClip(clipId, audioFileUrl, highlight)
    .then(() => {
      jobQueue.delete(jobId);
      console.log(`✓ Job ${jobId} completed`);
    })
    .catch(error => {
      jobQueue.delete(jobId);
      console.error(`✗ Job ${jobId} failed:`, error);
    });
}

/**
 * Process clip generation
 */
async function processClip(clipId, audioFileUrl, highlight) {
  try {
    // Update status to processing
    await supabase
      .from('clips')
      .update({ status: 'processing', processing_progress: 10 })
      .eq('id', clipId);

    // Download audio file if needed (stub - implement based on storage strategy)
    const inputAudioPath = path.join(__dirname, '../../temp', `input_${clipId}.wav`);
    // TODO: Download audio from audioFileUrl to inputAudioPath

    // Extract audio segment
    await supabase.from('clips').update({ processing_progress: 30 }).eq('id', clipId);
    const audioSegmentPath = path.join(__dirname, '../../temp', `segment_${clipId}.aac`);
    
    const startSeconds = (new Date(highlight.end_time) - new Date(highlight.start_time)) / 1000;
    await clipGenerator.extractAudioSegment(
      inputAudioPath,
      0, // Assuming audio file is already the full conversation
      startSeconds,
      audioSegmentPath
    );

    // Generate video with waveform
    await supabase.from('clips').update({ processing_progress: 50 }).eq('id', clipId);
    const videoPath = path.join(__dirname, '../../temp', `video_${clipId}.mp4`);
    await clipGenerator.generateVideoWithSubtitles(
      audioSegmentPath,
      [], // TODO: Generate subtitles from transcript
      videoPath
    );

    // Create thumbnail
    await supabase.from('clips').update({ processing_progress: 70 }).eq('id', clipId);
    const thumbnailPath = path.join(__dirname, '../../temp', `thumb_${clipId}.jpg`);
    await clipGenerator.createThumbnail(videoPath, startSeconds / 2, thumbnailPath);

    // Optimize for multiple formats
    await supabase.from('clips').update({ processing_progress: 85 }).eq('id', clipId);
    const formats = ['mp4', 'webm', 'mp3'];
    const clipUrls = {};

    for (const format of formats) {
      const outputPath = path.join(__dirname, '../../temp', `clip_${clipId}.${format}`);
      const result = await clipGenerator.optimizeForWeb(videoPath, outputPath, format);
      
      // Upload to Supabase Storage
      const fileName = `${clipId}.${format}`;
      const fileData = await fs.readFile(result.path);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('clips')
        .upload(fileName, fileData, {
          contentType: format === 'mp3' ? 'audio/mpeg' : `video/${format}`,
          upsert: true
        });

      if (uploadError) {
        console.error(`Error uploading ${format}:`, uploadError);
      } else {
        const { data: urlData } = supabase.storage.from('clips').getPublicUrl(fileName);
        clipUrls[format] = urlData.publicUrl;
      }

      // Clean up temp file
      await fs.unlink(result.path).catch(() => {});
    }

    // Upload thumbnail
    const thumbnailData = await fs.readFile(thumbnailPath);
    const { data: thumbUpload } = await supabase.storage
      .from('clips')
      .upload(`${clipId}_thumb.jpg`, thumbnailData, {
        contentType: 'image/jpeg',
        upsert: true
      });

    const { data: thumbUrl } = supabase.storage.from('clips').getPublicUrl(`${clipId}_thumb.jpg`);

    // Update clip record with completed status
    const stats = await fs.stat(videoPath);
    await supabase
      .from('clips')
      .update({
        status: 'completed',
        processing_progress: 100,
        clip_urls: clipUrls,
        thumbnail_url: thumbUrl.publicUrl,
        file_size_bytes: stats.size,
        formats_available: formats,
        completed_at: new Date().toISOString()
      })
      .eq('id', clipId);

    // Clean up temp files
    await fs.unlink(inputAudioPath).catch(() => {});
    await fs.unlink(audioSegmentPath).catch(() => {});
    await fs.unlink(videoPath).catch(() => {});
    await fs.unlink(thumbnailPath).catch(() => {});

    console.log(`✓ Clip ${clipId} processed successfully`);

  } catch (error) {
    console.error(`Error processing clip ${clipId}:`, error);

    // Update clip with error status
    await supabase
      .from('clips')
      .update({
        status: 'failed',
        error_message: error.message
      })
      .eq('id', clipId);

    throw error;
  }
}

export default router;
