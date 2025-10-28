import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Loader2, Play, Download, Share2, Trash2, Clock, Film } from 'lucide-react';
import { ClipTimeline } from '../components/ClipTimeline';
import { ClipCard } from '../components/ClipCard';
import { ShareModal } from '../components/ShareModal';
import { HighlightResults } from '../components/HighlightResults';

interface Clip {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  duration: number;
  highlight_type: string;
  highlight_reason: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_progress: number;
  clip_urls: Record<string, string>;
  thumbnail_url: string;
  view_count: number;
  share_count: number;
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

export default function ClipsPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [clips, setClips] = useState<Clip[]>([]);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [detectingHighlights, setDetectingHighlights] = useState(false);
  const [creatingClip, setCreatingClip] = useState(false);
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sensitivity, setSensitivity] = useState(0.7);
  const [showTimeline, setShowTimeline] = useState(false);
  const [timelineRange, setTimelineRange] = useState({ start: 0, end: 60 });

  useEffect(() => {
    if (user && conversationId) {
      loadClips();
    }
  }, [user, conversationId]);

  const loadClips = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/clips/users/${user.id}/clips?conversationId=${conversationId}`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load clips');
      }

      const data = await response.json();
      setClips(data.clips || []);
    } catch (error) {
      console.error('Error loading clips:', error);
    } finally {
      setLoading(false);
    }
  };

  const detectHighlights = async () => {
    if (!user || !conversationId) return;

    setDetectingHighlights(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/clips/auto-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId,
          userId: user.id,
          sensitivity
        })
      });

      if (!response.ok) {
        throw new Error('Failed to detect highlights');
      }

      const data = await response.json();
      setHighlights(data.highlights || []);
      
      // Reload clips to show newly queued items
      await loadClips();
    } catch (error) {
      console.error('Error detecting highlights:', error);
      alert('Failed to detect highlights. Please try again.');
    } finally {
      setDetectingHighlights(false);
    }
  };

  const createManualClip = async () => {
    if (!user || !conversationId) return;

    setCreatingClip(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/clips/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId,
          userId: user.id,
          title: 'Custom Clip',
          description: 'User-created highlight',
          startTime: timelineRange.start,
          endTime: timelineRange.end
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create clip');
      }

      const data = await response.json();
      setClips([data.clip, ...clips]);
      setShowTimeline(false);
    } catch (error) {
      console.error('Error creating clip:', error);
      alert('Failed to create clip. Please try again.');
    } finally {
      setCreatingClip(false);
    }
  };

  const deleteClip = async (clipId: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to delete this clip?')) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/clips/${clipId}?userId=${user.id}`,
        {
          method: 'DELETE'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete clip');
      }

      setClips(clips.filter(c => c.id !== clipId));
    } catch (error) {
      console.error('Error deleting clip:', error);
      alert('Failed to delete clip. Please try again.');
    }
  };

  const downloadClip = async (clipId: string, format: string = 'mp4') => {
    if (!user) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/clips/${clipId}/download?userId=${user.id}&format=${format}`
      );

      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }

      const data = await response.json();
      window.open(data.download_url, '_blank');
    } catch (error) {
      console.error('Error downloading clip:', error);
      alert('Failed to download clip. Please try again.');
    }
  };

  const shareClip = (clip: Clip) => {
    setSelectedClip(clip);
    setShareModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'success' | 'destructive'> = {
      pending: 'secondary',
      processing: 'default',
      completed: 'success',
      failed: 'destructive'
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          ← Back
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Clip Generator
            </h1>
            <p className="text-gray-600">
              Create and share highlight clips from your conversation
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={() => setShowTimeline(!showTimeline)}
              variant="outline"
              disabled={showTimeline}
            >
              <Film className="w-4 h-4 mr-2" />
              Create Manual Clip
            </Button>
            
            <Button
              onClick={detectHighlights}
              disabled={detectingHighlights}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {detectingHighlights ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Detecting...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Auto-Detect Highlights
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Sensitivity Slider */}
      {!showTimeline && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Detection Sensitivity</CardTitle>
            <CardDescription>
              Adjust how selective the highlight detection should be
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 w-24">Less Selective</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={sensitivity}
                onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm text-gray-600 w-24 text-right">More Selective</span>
              <Badge variant="outline" className="ml-2">{sensitivity.toFixed(1)}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline for manual clip creation */}
      {showTimeline && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Clip Range</CardTitle>
            <CardDescription>
              Choose the start and end time for your custom clip
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClipTimeline
              duration={300}
              range={timelineRange}
              onChange={setTimelineRange}
            />
            
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600">
                <Clock className="w-4 h-4 inline mr-1" />
                Duration: {(timelineRange.end - timelineRange.start).toFixed(1)}s
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowTimeline(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={createManualClip}
                  disabled={creatingClip || (timelineRange.end - timelineRange.start) < 5}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {creatingClip ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Clip'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Highlight Detection Results */}
      {highlights.length > 0 && (
        <HighlightResults
          highlights={highlights}
          onClose={() => setHighlights([])}
        />
      )}

      {/* Clips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clips.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Film className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No clips yet
            </h3>
            <p className="text-gray-600 mb-4">
              Create your first clip by detecting highlights or selecting a custom range
            </p>
          </div>
        ) : (
          clips.map((clip) => (
            <ClipCard
              key={clip.id}
              clip={clip}
              onDownload={(format) => downloadClip(clip.id, format)}
              onShare={() => shareClip(clip)}
              onDelete={() => deleteClip(clip.id)}
            />
          ))
        )}
      </div>

      {/* Share Modal */}
      {selectedClip && (
        <ShareModal
          open={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setSelectedClip(null);
          }}
          clip={selectedClip}
          userId={user?.id || ''}
        />
      )}
    </div>
  );
}
