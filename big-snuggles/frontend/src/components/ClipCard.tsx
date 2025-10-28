import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Download, Share2, Trash2, Clock, Eye, Heart, Loader2 } from 'lucide-react';

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
  clip_urls?: Record<string, string>;
  thumbnail_url?: string;
  view_count: number;
  share_count: number;
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

interface ClipCardProps {
  clip: Clip;
  onDownload: (format: string) => void;
  onShare: () => void;
  onDelete: () => void;
}

export function ClipCard({ clip, onDownload, onShare, onDelete }: ClipCardProps) {
  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getHighlightTypeIcon = (type: string) => {
    switch (type) {
      case 'humor':
        return '😄';
      case 'surprise':
        return '😲';
      case 'emotional':
        return '💖';
      case 'celebration':
        return '🎉';
      case 'manual':
        return '✂️';
      default:
        return '💬';
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gradient-to-br from-indigo-100 to-purple-100">
        {clip.thumbnail_url && clip.status === 'completed' ? (
          <img
            src={clip.thumbnail_url}
            alt={clip.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            {clip.status === 'processing' ? (
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-2" />
                <div className="text-sm font-medium text-gray-700">
                  Processing... {clip.processing_progress}%
                </div>
                <div className="w-32 h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${clip.processing_progress}%` }}
                  />
                </div>
              </div>
            ) : clip.status === 'failed' ? (
              <div className="text-center px-4">
                <div className="text-red-600 text-4xl mb-2">⚠️</div>
                <div className="text-sm text-red-600 font-medium">Processing Failed</div>
                {clip.error_message && (
                  <div className="text-xs text-gray-600 mt-1">{clip.error_message}</div>
                )}
              </div>
            ) : (
              <div className="text-center">
                <div className="text-gray-400 text-4xl mb-2">
                  {getHighlightTypeIcon(clip.highlight_type)}
                </div>
                <div className="text-sm text-gray-600">Queued for processing</div>
              </div>
            )}
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-2 right-2">
          <Badge className={getStatusColor(clip.status)}>
            {clip.status}
          </Badge>
        </div>

        {/* Highlight Type Badge */}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="bg-white/90 backdrop-blur">
            {getHighlightTypeIcon(clip.highlight_type)} {clip.highlight_type}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <CardHeader className="pb-3">
        <CardTitle className="text-lg line-clamp-1">{clip.title}</CardTitle>
        <CardDescription className="line-clamp-2">{clip.highlight_reason}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Metadata */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{formatDuration(clip.duration)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{clip.view_count}</span>
          </div>
          <div className="flex items-center gap-1">
            <Share2 className="w-4 h-4" />
            <span>{clip.share_count}</span>
          </div>
        </div>

        {/* Created Date */}
        <div className="text-xs text-gray-500">
          Created {formatDate(clip.created_at)}
        </div>

        {/* Actions */}
        {clip.status === 'completed' && (
          <div className="flex gap-2">
            <div className="flex-1">
              <select
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onChange={(e) => {
                  if (e.target.value) {
                    onDownload(e.target.value);
                    e.target.value = '';
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>Download...</option>
                <option value="mp4">MP4 (Video)</option>
                <option value="webm">WebM (Video)</option>
                <option value="mp3">MP3 (Audio)</option>
              </select>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={onShare}
              className="px-3"
            >
              <Share2 className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={onDelete}
              className="px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}

        {(clip.status === 'pending' || clip.status === 'processing') && (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={onDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}

        {clip.status === 'failed' && (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={onDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
