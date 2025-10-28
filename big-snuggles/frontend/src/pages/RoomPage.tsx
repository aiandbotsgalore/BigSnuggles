/**
 * Room Page
 * 
 * Active room view with conversation and participants
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRoomSocket } from '../contexts/RoomSocketContext';
import ParticipantsList from '../components/ParticipantsList';
import RoomControls from '../components/RoomControls';
import { PollCreationModal } from '../components/PollCreationModal';
import { ActivePollCard } from '../components/ActivePollCard';
import { PollHistory } from '../components/PollHistory';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { Loader2, Mic, MicOff, Send, AlertCircle, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

export default function RoomPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const {
    isConnected,
    currentRoom,
    participants,
    roomState,
    messages,
    error,
    joinRoom,
    leaveRoom,
    sendMessage,
    startVoice,
    stopVoice,
    activePolls,
    pollHistory,
    myVotes,
    createPoll,
    castVote,
    closePoll
  } = useRoomSocket();

  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [roomData, setRoomData] = useState<any>(null);
  const [textMessage, setTextMessage] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showPolls, setShowPolls] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Fetch room details
  useEffect(() => {
    if (!roomCode || !session) return;

    const fetchRoom = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}/api/rooms/code/${roomCode}`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Room not found');
        }

        setRoomData(data.room);
      } catch (error: any) {
        console.error('Error fetching room:', error);
        toast.error(error.message || 'Failed to load room');
        navigate('/spaces');
      }
    };

    fetchRoom();
  }, [roomCode, session, navigate]);

  // Handle joining room
  const handleJoinRoom = async () => {
    if (!displayName.trim()) {
      toast.error('Please enter a display name');
      return;
    }

    if (!roomData) {
      toast.error('Room not loaded');
      return;
    }

    setIsJoining(true);
    try {
      await joinRoom(roomData.id, displayName.trim());
      setHasJoined(true);
      toast.success('Joined room successfully');
    } catch (error: any) {
      console.error('Error joining room:', error);
      toast.error(error.message || 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  // Handle leaving room
  const handleLeaveRoom = () => {
    leaveRoom();
    setHasJoined(false);
    navigate('/spaces');
  };

  // Handle sending text message
  const handleSendMessage = () => {
    if (!textMessage.trim()) return;

    sendMessage('user_text', textMessage.trim());
    setTextMessage('');
  };

  // Handle voice toggle
  const handleToggleVoice = () => {
    if (isVoiceActive) {
      stopVoice();
      setIsVoiceActive(false);
      toast.info('Voice conversation stopped');
    } else {
      startVoice();
      setIsVoiceActive(true);
      toast.success('Voice conversation started');
    }
  };

  // Handle creating poll
  const handleCreatePoll = (pollType: string, question: string, options: string[], durationSeconds: number) => {
    createPoll(pollType, question, options, durationSeconds);
    toast.success('Poll created!');
  };

  // Handle voting
  const handleVote = (pollId: string, optionId: string) => {
    castVote(pollId, optionId);
  };

  // Handle closing poll
  const handleClosePoll = (pollId: string) => {
    closePoll(pollId);
    toast.info('Poll closed');
  };

  // Show error banner
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-black text-white flex items-center justify-center">
        <Card className="bg-neutral-800 border-red-500/30 max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-red-400">
              <AlertCircle className="w-6 h-6 mr-2" />
              Connection Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-neutral-300 mb-4">{error}</p>
            <Button onClick={() => navigate('/spaces')} className="w-full">
              Back to Lobby
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Join screen
  if (!hasJoined || !currentRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-black text-white flex items-center justify-center">
        <Card className="bg-neutral-800 border-purple-500/20 max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              Join Room {roomCode}
            </CardTitle>
            {roomData && (
              <p className="text-neutral-400 text-center">
                {roomData.name || 'Unnamed Room'}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-neutral-300">
                Display Name
              </label>
              <Input
                type="text"
                placeholder="Enter your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                className="bg-neutral-700 border-neutral-600 text-white"
                maxLength={30}
                disabled={!isConnected || isJoining}
              />
            </div>

            <Button
              onClick={handleJoinRoom}
              disabled={!isConnected || isJoining || !displayName.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              size="lg"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : !isConnected ? (
                'Connecting...'
              ) : (
                'Join Room'
              )}
            </Button>

            <Button
              onClick={() => navigate('/spaces')}
              variant="outline"
              className="w-full border-neutral-600"
            >
              Back to Lobby
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main room interface
  const isHost = currentRoom.hostUserId === user?.id;

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Room Controls */}
        <div className="mb-6">
          <RoomControls
            roomCode={currentRoom.roomCode}
            roomName={currentRoom.name}
            isHost={isHost}
            onLeave={handleLeaveRoom}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Conversation Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Messages */}
            <Card className="bg-neutral-800/50 border-purple-500/20">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Conversation</span>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowPolls(!showPolls)}
                      size="sm"
                      variant="outline"
                      className={showPolls ? 'bg-purple-600 hover:bg-purple-700' : ''}
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Polls {activePolls.length > 0 && `(${activePolls.length})`}
                    </Button>
                    <Button
                      onClick={handleToggleVoice}
                      size="sm"
                      className={
                        isVoiceActive
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-purple-600 hover:bg-purple-700'
                      }
                    >
                      {isVoiceActive ? (
                        <>
                          <MicOff className="w-4 h-4 mr-2" />
                          Stop Voice
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4 mr-2" />
                          Start Voice
                        </>
                      )}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-400px)] pr-4">
                  <div className="space-y-3">
                    {messages.length === 0 ? (
                      <p className="text-neutral-400 text-center py-8">
                        No messages yet. Start a conversation!
                      </p>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`p-3 rounded-lg ${
                            message.message_type === 'system'
                              ? 'bg-neutral-700/30 text-neutral-400 text-sm text-center'
                              : message.message_type === 'ai_response'
                              ? 'bg-purple-600/20 border border-purple-500/30'
                              : 'bg-neutral-700/50'
                          }`}
                        >
                          <div className="text-xs text-neutral-500 mb-1">
                            {new Date(message.created_at).toLocaleTimeString()}
                          </div>
                          <p className="text-white">{message.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>

                {/* Text Input */}
                <div className="mt-4 flex gap-2">
                  <Input
                    type="text"
                    placeholder="Type a message..."
                    value={textMessage}
                    onChange={(e) => setTextMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="bg-neutral-700 border-neutral-600 text-white"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!textMessage.trim()}
                    size="icon"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Polls Section */}
            {showPolls && (
              <Card className="bg-neutral-800/50 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Polls & Voting</span>
                    {isHost && (
                      <Button
                        onClick={() => setShowPollModal(true)}
                        size="sm"
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Create Poll
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Active Polls */}
                    {activePolls.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white">Active Polls</h3>
                        {activePolls.map(poll => (
                          <ActivePollCard
                            key={poll.id}
                            poll={poll}
                            onVote={handleVote}
                            hasVoted={myVotes.has(poll.id)}
                            myVote={myVotes.get(poll.id)}
                            isHost={isHost}
                            onClose={isHost ? handleClosePoll : undefined}
                          />
                        ))}
                      </div>
                    )}

                    {/* Poll History */}
                    {pollHistory.length > 0 && (
                      <div className="pt-6 border-t border-gray-700">
                        <PollHistory polls={pollHistory} />
                      </div>
                    )}

                    {/* Empty State */}
                    {activePolls.length === 0 && pollHistory.length === 0 && (
                      <div className="text-center py-12">
                        <BarChart3 className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                        <p className="text-gray-500 mb-4">No polls yet</p>
                        {isHost && (
                          <Button
                            onClick={() => setShowPollModal(true)}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                          >
                            Create Your First Poll
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Participants Sidebar */}
          <div>
            <ParticipantsList
              participants={participants}
              hostUserId={currentRoom.hostUserId}
              currentUserId={user?.id || ''}
              maxParticipants={roomData?.maxParticipants || 10}
            />
          </div>
        </div>
      </div>

      {/* Poll Creation Modal */}
      <PollCreationModal
        isOpen={showPollModal}
        onClose={() => setShowPollModal(false)}
        onCreatePoll={handleCreatePoll}
      />
    </div>
  );
}
