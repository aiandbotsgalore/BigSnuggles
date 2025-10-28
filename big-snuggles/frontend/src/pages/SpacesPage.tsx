/**
 * Spaces Page
 * 
 * Main lobby for multi-user rooms:
 * - Create new room
 * - Join room by code
 * - Browse active rooms
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Users, Plus, Hash, LogIn, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Room {
  id: string;
  roomCode: string;
  name: string | null;
  maxParticipants: number;
  hostUserId: string;
  currentMode: string;
  participantCount: number;
  joinLink: string;
}

export default function SpacesPage() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Create a new room
  const handleCreateRoom = async () => {
    if (!session) return;

    setIsCreating(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}/api/rooms/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          name: roomName || null,
          maxParticipants
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create room');
      }

      toast.success(`Room created: ${data.room.roomCode}`);
      
      // Navigate to the room
      navigate(`/spaces/${data.room.roomCode}`);
    } catch (error: any) {
      console.error('Error creating room:', error);
      toast.error(error.message || 'Failed to create room');
    } finally {
      setIsCreating(false);
    }
  };

  // Join a room by code
  const handleJoinRoom = async () => {
    if (!roomCode || roomCode.length !== 6) {
      toast.error('Please enter a valid 6-character room code');
      return;
    }

    setIsJoining(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}/api/rooms/code/${roomCode.toUpperCase()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Room not found');
      }

      // Navigate to the room
      navigate(`/spaces/${roomCode.toUpperCase()}`);
    } catch (error: any) {
      console.error('Error joining room:', error);
      toast.error(error.message || 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  // Copy room code to clipboard
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Room code copied to clipboard');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Users className="w-12 h-12 text-purple-400 mr-3" />
            <h1 className="text-5xl font-bold">
              Space Rooms
            </h1>
          </div>
          <p className="text-xl text-neutral-400">
            Join shared rooms to listen and participate in AI conversations together
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Create Room Card */}
          <Card className="bg-neutral-800/50 border-purple-500/20">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <Plus className="w-6 h-6 mr-2 text-purple-400" />
                Create New Room
              </CardTitle>
              <CardDescription className="text-neutral-400">
                Host a new space for others to join
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-neutral-300">
                  Room Name (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="My Awesome Room"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="bg-neutral-700 border-neutral-600 text-white"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-neutral-300">
                  Max Participants
                </label>
                <Input
                  type="number"
                  min={2}
                  max={50}
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 10)}
                  className="bg-neutral-700 border-neutral-600 text-white"
                />
              </div>

              <Button
                onClick={handleCreateRoom}
                disabled={isCreating}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                size="lg"
              >
                {isCreating ? 'Creating...' : 'Create Room'}
              </Button>
            </CardContent>
          </Card>

          {/* Join Room Card */}
          <Card className="bg-neutral-800/50 border-purple-500/20">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <LogIn className="w-6 h-6 mr-2 text-purple-400" />
                Join Existing Room
              </CardTitle>
              <CardDescription className="text-neutral-400">
                Enter a 6-character room code to join
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-neutral-300">
                  <Hash className="w-4 h-4 inline mr-1" />
                  Room Code
                </label>
                <Input
                  type="text"
                  placeholder="ABC123"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="bg-neutral-700 border-neutral-600 text-white text-2xl tracking-widest text-center font-mono"
                  maxLength={6}
                />
              </div>

              <Button
                onClick={handleJoinRoom}
                disabled={isJoining || roomCode.length !== 6}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                size="lg"
              >
                {isJoining ? 'Joining...' : 'Join Room'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <div className="bg-neutral-800/30 rounded-lg p-6 border border-neutral-700">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <Users className="w-6 h-6 mr-2 text-purple-400" />
            How Space Rooms Work
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-purple-400 font-bold text-lg mb-2">1. Create or Join</div>
              <p className="text-neutral-400 text-sm">
                Start a new room or join an existing one using a room code
              </p>
            </div>
            <div>
              <div className="text-purple-400 font-bold text-lg mb-2">2. Invite Others</div>
              <p className="text-neutral-400 text-sm">
                Share your room code with friends to listen together
              </p>
            </div>
            <div>
              <div className="text-purple-400 font-bold text-lg mb-2">3. Synchronized Experience</div>
              <p className="text-neutral-400 text-sm">
                All participants hear the same AI conversation in real-time
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
