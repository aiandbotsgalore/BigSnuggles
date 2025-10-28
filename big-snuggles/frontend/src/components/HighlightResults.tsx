import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { X, Clock, Zap } from 'lucide-react';

interface Highlight {
  start_time: string;
  end_time: string;
  duration: number;
  score: number;
  type: string;
  reason: string;
  content_preview: string;
}

interface HighlightResultsProps {
  highlights: Highlight[];
  onClose: () => void;
}

export function HighlightResults({ highlights, onClose }: HighlightResultsProps) {
  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      humor: 'bg-yellow-100 text-yellow-800',
      surprise: 'bg-purple-100 text-purple-800',
      emotional: 'bg-pink-100 text-pink-800',
      celebration: 'bg-green-100 text-green-800',
      conversation: 'bg-blue-100 text-blue-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      humor: '😄',
      surprise: '😲',
      emotional: '💖',
      celebration: '🎉',
      conversation: '💬'
    };
    return icons[type] || '💬';
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="mb-6 border-indigo-200 bg-indigo-50">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-indigo-600" />
          <CardTitle className="text-lg">
            Auto-Detected Highlights
          </CardTitle>
          <Badge variant="secondary" className="ml-2">
            {highlights.length} found
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>

      <CardContent>
        <div className="mb-4 p-3 bg-white rounded-lg border border-indigo-200">
          <p className="text-sm text-gray-700">
            <strong className="text-indigo-700">✓ Processing Started</strong>
            <br />
            {highlights.length} highlight{highlights.length !== 1 ? 's' : ''} have been queued for processing. 
            Clips will be ready shortly and will appear in the list below.
          </p>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {highlights.map((highlight, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getTypeIcon(highlight.type)}</span>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      Highlight {index + 1}
                    </h4>
                    <p className="text-sm text-gray-600">{highlight.reason}</p>
                  </div>
                </div>
                
                <Badge className={getTypeColor(highlight.type)}>
                  {highlight.type}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(highlight.duration)}</span>
                </div>
                <div>
                  Score: {(highlight.score * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-gray-500">
                  {formatTime(highlight.start_time)} - {formatTime(highlight.end_time)}
                </div>
              </div>

              <div className="bg-gray-50 rounded p-2 text-sm text-gray-700 line-clamp-2">
                "{highlight.content_preview}"
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Queued for processing</span>
                  <span>Pending</span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full animate-pulse w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>💡 Tip:</strong> Clips are being generated in the background. 
            You can continue browsing, and they'll appear in your clips list when ready. 
            Processing typically takes 1-2 minutes per clip.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
