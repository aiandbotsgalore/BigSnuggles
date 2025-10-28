import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from './ui/dialog';
import { Button } from './ui/button';
import { Copy, Check, Twitter, Facebook, MessageCircle } from 'lucide-react';

interface Clip {
  id: string;
  title: string;
  duration: number;
  clip_urls?: Record<string, string>;
}

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  clip: Clip;
  userId: string;
}

export function ShareModal({ open, onClose, clip, userId }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const shareUrl = clip.clip_urls?.mp4 || '';
  const shareText = `Check out this ${Math.floor(clip.duration)}s clip: ${clip.title}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const trackShare = async (platform: string) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/clips/${clip.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          platform
        })
      });
    } catch (error) {
      console.error('Failed to track share:', error);
    }
  };

  const shareToTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
    trackShare('twitter');
  };

  const shareToFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(facebookUrl, '_blank', 'width=550,height=420');
    trackShare('facebook');
  };

  const shareToWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
    window.open(whatsappUrl, '_blank');
    trackShare('whatsapp');
  };

  const shareViaNative = async () => {
    if (navigator.share) {
      try {
        setSharing(true);
        await navigator.share({
          title: clip.title,
          text: shareText,
          url: shareUrl
        });
        trackShare('native');
      } catch (error) {
        console.error('Error sharing:', error);
      } finally {
        setSharing(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Clip</DialogTitle>
          <DialogDescription>
            Share this clip on social media or copy the link
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Video Preview */}
          {clip.clip_urls?.mp4 && (
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
              <video
                src={clip.clip_urls.mp4}
                controls
                className="w-full h-full"
                preload="metadata"
              />
            </div>
          )}

          {/* Share URL */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-50"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1 text-green-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>

          {/* Social Media Buttons */}
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              onClick={shareToTwitter}
              className="flex-col h-auto py-3"
            >
              <Twitter className="w-6 h-6 mb-1 text-blue-400" />
              <span className="text-xs">Twitter</span>
            </Button>

            <Button
              variant="outline"
              onClick={shareToFacebook}
              className="flex-col h-auto py-3"
            >
              <Facebook className="w-6 h-6 mb-1 text-blue-600" />
              <span className="text-xs">Facebook</span>
            </Button>

            <Button
              variant="outline"
              onClick={shareToWhatsApp}
              className="flex-col h-auto py-3"
            >
              <MessageCircle className="w-6 h-6 mb-1 text-green-600" />
              <span className="text-xs">WhatsApp</span>
            </Button>
          </div>

          {/* Native Share (if available) */}
          {navigator.share && (
            <Button
              variant="secondary"
              onClick={shareViaNative}
              disabled={sharing}
              className="w-full"
            >
              Share via...
            </Button>
          )}

          {/* Platform Optimization Notes */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800 font-medium mb-2">
              📱 Platform Recommendations:
            </p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Twitter: Max 2m 20s (140s)</li>
              <li>• Instagram: Max 60s</li>
              <li>• TikTok: Max 3m (180s)</li>
              <li>• Facebook: No strict limit</li>
            </ul>
            {clip.duration > 140 && (
              <p className="text-xs text-orange-700 mt-2">
                ⚠️ This clip may exceed Twitter's limit
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
