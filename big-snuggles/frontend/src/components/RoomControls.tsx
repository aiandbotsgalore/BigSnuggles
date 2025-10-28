/**
 * Room Controls Component
 * 
 * Controls for room actions:
 * - Copy room code
 * - Leave room
 * - Room settings (host only)
 */

import React, { useState } from 'react';
import { Copy, Check, LogOut, Settings, Share2 } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';

interface RoomControlsProps {
  roomCode: string;
  roomName: string | null;
  isHost: boolean;
  onLeave: () => void;
}

export default function RoomControls({
  roomCode,
  roomName,
  isHost,
  onLeave
}: RoomControlsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    toast.success('Room code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/spaces/${roomCode}`;
    navigator.clipboard.writeText(link);
    toast.success('Room link copied to clipboard');
  };

  return (
    <div className="bg-neutral-800/50 border border-purple-500/20 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">
            {roomName || 'Unnamed Room'}
          </h3>
          <div className="flex items-center mt-1">
            <span className="text-sm text-neutral-400 mr-2">Room Code:</span>
            <code className="text-2xl font-mono font-bold text-purple-400 tracking-widest">
              {roomCode}
            </code>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Copy Room Code */}
        <Button
          onClick={handleCopyCode}
          variant="outline"
          className="border-neutral-600 hover:bg-neutral-700"
          size="sm"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2 text-green-400" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              Copy Code
            </>
          )}
        </Button>

        {/* Share Link */}
        <Button
          onClick={handleCopyLink}
          variant="outline"
          className="border-neutral-600 hover:bg-neutral-700"
          size="sm"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share Link
        </Button>

        {/* Host Settings (if host) */}
        {isHost && (
          <Button
            variant="outline"
            className="border-neutral-600 hover:bg-neutral-700"
            size="sm"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        )}

        {/* Leave Room */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Leave
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-neutral-800 border-neutral-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">
                Leave Room?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-neutral-400">
                {isHost 
                  ? 'As the host, leaving will not close the room. Other participants can continue.'
                  : 'Are you sure you want to leave this room?'
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-neutral-700 text-white border-neutral-600">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onLeave}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Leave Room
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
