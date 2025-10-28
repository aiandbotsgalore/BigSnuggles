/**
 * Room Socket Context
 * 
 * Manages Socket.IO connection for multi-user rooms
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface Participant {
  userId: string;
  displayName: string;
  socketId: string;
  joinedAt: string;
}

interface RoomState {
  currentMode: string;
  conversationActive: boolean;
  hostUserId: string;
}

interface Room {
  id: string;
  roomCode: string;
  name: string | null;
  currentMode: string;
  hostUserId: string;
}

interface Message {
  id: string;
  room_id: string;
  user_id: string | null;
  message_type: 'user_text' | 'user_voice' | 'ai_response' | 'system';
  content: string;
  metadata: any;
  created_at: string;
}

interface PollOption {
  id: string;
  text: string;
  votes?: number;
  percentage?: number;
}

interface Poll {
  id: string;
  roomId: string;
  createdBy: string;
  pollType: 'topic_voting' | 'personality_mode' | 'audience_question' | 'quick_reaction';
  question: string;
  options: PollOption[];
  status: 'active' | 'closed' | 'expired';
  expiresAt: string;
  createdAt: string;
  totalVotes?: number;
  winningOption?: string;
}

interface PollResults {
  pollId: string;
  options: PollOption[];
  totalVotes: number;
  winningOption: string | null;
}

interface RoomSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  currentRoom: Room | null;
  participants: Participant[];
  roomState: RoomState | null;
  messages: Message[];
  error: string | null;
  // Room methods
  joinRoom: (roomId: string, displayName: string) => Promise<void>;
  leaveRoom: () => void;
  sendMessage: (messageType: string, content: string, metadata?: any) => void;
  updateRoomState: (updates: Partial<RoomState>) => void;
  startVoice: () => void;
  stopVoice: () => void;
  // Voting state
  activePolls: Poll[];
  pollHistory: Poll[];
  myVotes: Map<string, string>; // pollId -> optionId
  // Voting methods
  createPoll: (pollType: string, question: string, options: string[], durationSeconds?: number) => void;
  castVote: (pollId: string, optionId: string) => void;
  closePoll: (pollId: string) => void;
}

const RoomSocketContext = createContext<RoomSocketContextType | null>(null);

export function RoomSocketProvider({ children }: { children: React.ReactNode }) {
  const { user, session } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Voting state
  const [activePolls, setActivePolls] = useState<Poll[]>([]);
  const [pollHistory, setPollHistory] = useState<Poll[]>([]);
  const [myVotes, setMyVotes] = useState<Map<string, string>>(new Map());

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!user || !session) return;

    const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
    
    const newSocket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: {
        token: session.access_token
      }
    });

    newSocket.on('connect', () => {
      console.log('Socket.IO connected');
      setIsConnected(true);
      setError(null);

      // Authenticate
      newSocket.emit('room:authenticate', { token: session.access_token });
    });

    newSocket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
      setIsConnected(false);
    });

    newSocket.on('room:authenticated', (data) => {
      console.log('Socket.IO authenticated:', data);
    });

    newSocket.on('room:error', (data) => {
      console.error('Room error:', data.message);
      setError(data.message);
    });

    // Room events
    newSocket.on('room:joined', (data) => {
      console.log('Joined room:', data);
      setCurrentRoom(data.room);
      setParticipants(data.participants);
      setRoomState(data.state);
      setError(null);
    });

    newSocket.on('room:left', (data) => {
      console.log('Left room:', data);
      setCurrentRoom(null);
      setParticipants([]);
      setRoomState(null);
      setMessages([]);
    });

    newSocket.on('room:participant-joined', (data) => {
      console.log('Participant joined:', data);
      setParticipants(prev => [...prev, data.participant]);
    });

    newSocket.on('room:participant-left', (data) => {
      console.log('Participant left:', data);
      setParticipants(prev => 
        prev.filter(p => p.socketId !== data.participant.socketId)
      );
    });

    newSocket.on('room:state-updated', (data) => {
      console.log('Room state updated:', data);
      setRoomState(data.state);
    });

    newSocket.on('room:message-received', (data) => {
      console.log('Message received:', data);
      setMessages(prev => [...prev, data.message]);
    });

    newSocket.on('room:messages-history', (data) => {
      console.log('Messages history received:', data);
      setMessages(data.messages);
    });

    newSocket.on('room:voice-started', (data) => {
      console.log('Voice started:', data);
      if (roomState) {
        setRoomState({ ...roomState, conversationActive: true });
      }
    });

    newSocket.on('room:voice-stopped', (data) => {
      console.log('Voice stopped:', data);
      if (roomState) {
        setRoomState({ ...roomState, conversationActive: false });
      }
    });

    // Poll events
    newSocket.on('poll:created', (data) => {
      console.log('Poll created:', data);
      setActivePolls(prev => [...prev, data.poll]);
    });

    newSocket.on('poll:vote-received', (data) => {
      console.log('Vote received:', data);
      // Update my votes
      if (data.vote) {
        setMyVotes(prev => new Map(prev).set(data.vote.pollId, data.vote.optionId));
      }
      // Update poll results
      if (data.results && data.results.pollId) {
        setActivePolls(prev => prev.map(poll => 
          poll.id === data.results.pollId 
            ? { ...poll, options: data.results.options, totalVotes: data.results.totalVotes }
            : poll
        ));
      }
    });

    newSocket.on('poll:results-update', (data) => {
      console.log('Poll results updated:', data);
      setActivePolls(prev => prev.map(poll => 
        poll.id === data.pollId 
          ? { ...poll, options: data.results.options, totalVotes: data.results.totalVotes }
          : poll
      ));
    });

    newSocket.on('poll:closed', (data) => {
      console.log('Poll closed:', data);
      const closedPoll = { ...data.poll, options: data.results.options, totalVotes: data.results.totalVotes, winningOption: data.results.winningOption };
      setActivePolls(prev => prev.filter(p => p.id !== data.poll.id));
      setPollHistory(prev => [closedPoll, ...prev]);
    });

    newSocket.on('poll:expired', (data) => {
      console.log('Poll expired:', data);
      const expiredPoll = { ...data.poll, options: data.results.options, totalVotes: data.results.totalVotes, winningOption: data.results.winningOption };
      setActivePolls(prev => prev.filter(p => p.id !== data.poll.id));
      setPollHistory(prev => [expiredPoll, ...prev]);
    });

    newSocket.on('poll:error', (data) => {
      console.error('Poll error:', data.message);
      setError(data.message);
    });

    // Personality mode change notification
    newSocket.on('room:personality-changed', (data) => {
      console.log('Personality mode changed:', data);
      if (roomState) {
        setRoomState({ ...roomState, currentMode: data.newMode });
      }
      
      // Show notification
      const modeLabels: { [key: string]: string } = {
        'gangster': 'Gangster',
        'wise_mentor': 'Wise Mentor',
        'comedy_roaster': 'Comedy Roaster',
        'conspiracy_theorist': 'Conspiracy Theorist',
        'motivational_speaker': 'Motivational Speaker'
      };
      
      toast.success(`🎭 Big Snuggles is now in ${modeLabels[data.newMode] || data.newMode} mode!`, {
        description: data.reason === 'poll_result' ? 'Based on poll results' : undefined
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user, session]);

  // Join room
  const joinRoom = useCallback(async (roomId: string, displayName: string) => {
    if (!socket || !isConnected) {
      throw new Error('Socket not connected');
    }

    socket.emit('room:join', { roomId, displayName });
  }, [socket, isConnected]);

  // Leave room
  const leaveRoom = useCallback(() => {
    if (!socket) return;

    socket.emit('room:leave');
    setCurrentRoom(null);
    setParticipants([]);
    setRoomState(null);
    setMessages([]);
    setActivePolls([]);
    setPollHistory([]);
    setMyVotes(new Map());
  }, [socket]);

  // Send message
  const sendMessage = useCallback((messageType: string, content: string, metadata: any = {}) => {
    if (!socket || !currentRoom) return;

    socket.emit('room:message', {
      messageType,
      content,
      metadata
    });
  }, [socket, currentRoom]);

  // Update room state (host only)
  const updateRoomState = useCallback((updates: Partial<RoomState>) => {
    if (!socket || !currentRoom) return;

    socket.emit('room:state-update', { updates });
  }, [socket, currentRoom]);

  // Start voice conversation
  const startVoice = useCallback(() => {
    if (!socket || !currentRoom) return;

    socket.emit('room:voice-start', {});
  }, [socket, currentRoom]);

  // Stop voice conversation
  const stopVoice = useCallback(() => {
    if (!socket || !currentRoom) return;

    socket.emit('room:voice-stop', {});
  }, [socket, currentRoom]);

  // Create poll
  const createPoll = useCallback((pollType: string, question: string, options: string[], durationSeconds: number = 60) => {
    if (!socket || !currentRoom) return;

    socket.emit('poll:create', {
      pollType,
      question,
      options,
      durationSeconds
    });
  }, [socket, currentRoom]);

  // Cast vote
  const castVote = useCallback((pollId: string, optionId: string) => {
    if (!socket || !currentRoom) return;

    socket.emit('poll:vote', {
      pollId,
      optionId
    });
  }, [socket, currentRoom]);

  // Close poll (host only)
  const closePoll = useCallback((pollId: string) => {
    if (!socket || !currentRoom) return;

    socket.emit('poll:close', {
      pollId
    });
  }, [socket, currentRoom]);

  // Presence heartbeat
  useEffect(() => {
    if (!socket || !currentRoom) return;

    const interval = setInterval(() => {
      socket.emit('room:presence-update');
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [socket, currentRoom]);

  const value: RoomSocketContextType = {
    socket,
    isConnected,
    currentRoom,
    participants,
    roomState,
    messages,
    error,
    joinRoom,
    leaveRoom,
    sendMessage,
    updateRoomState,
    startVoice,
    stopVoice,
    activePolls,
    pollHistory,
    myVotes,
    createPoll,
    castVote,
    closePoll
  };

  return (
    <RoomSocketContext.Provider value={value}>
      {children}
    </RoomSocketContext.Provider>
  );
}

export function useRoomSocket() {
  const context = useContext(RoomSocketContext);
  if (!context) {
    throw new Error('useRoomSocket must be used within RoomSocketProvider');
  }
  return context;
}
