import express from 'express';
import { WebSocketServer } from 'ws';
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Import routes
import memoryRoutes from './routes/memory.js';
import memoryEnhancedRoutes from './routes/memoryEnhanced.js';
import sessionRoutes from './routes/session.js';
import personalityRoutes from './routes/personality.js';
import personalityEnhancedRoutes from './routes/personalityEnhanced.js';
import voiceRoutes from './routes/voice.js';
import transcriptRoutes from './routes/transcripts.js';
import roomRoutes from './routes/rooms.js';
import pollRoutes from './routes/polls.js';
import clipRoutes from './routes/clips.js';
import subscriptionRoutes from './routes/subscription.js';

// Import services
import { supabase } from './utils/supabase.js';
import { getVoiceSession, endVoiceSession } from './services/voiceService.js';
import { base64ToBuffer } from './utils/audioProcessing.js';
import { initializeRoomHandlers } from './services/roomSocketHandlers.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' }); // Separate path for voice WebSocket

// Initialize Socket.IO for rooms
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://swktrtulitdq.space.minimax.io'] 
      : ['http://localhost:3000', 'http://localhost:5173', 'https://swktrtulitdq.space.minimax.io'],
    credentials: true,
    methods: ['GET', 'POST']
  },
  path: '/socket.io' // Separate path for Socket.IO
});

const PORT = process.env.PORT || 8000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(cors({
  origin: NODE_ENV === 'production' 
    ? ['https://swktrtulitdq.space.minimax.io'] 
    : ['http://localhost:3000', 'http://localhost:5173', 'https://swktrtulitdq.space.minimax.io'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  });
});

// API Routes
app.use('/api/memory', memoryRoutes);
app.use('/api/memory/enhanced', memoryEnhancedRoutes); // Phase 6: Enhanced memory features
app.use('/api/session', sessionRoutes);
app.use('/api/personality', personalityRoutes);
app.use('/api/personality/enhanced', personalityEnhancedRoutes); // Phase 6: Enhanced personality features
app.use('/api/voice', voiceRoutes);
app.use('/api/transcripts', transcriptRoutes);
app.use('/api/rooms', roomRoutes); // Phase 8: Multi-user rooms
app.use('/api/rooms', pollRoutes); // Phase 8: Polls and voting
app.use('/api/clips', clipRoutes); // Phase 8: Clip generator
app.use('/api/subscription', subscriptionRoutes); // Phase 8: Premium tier system

// Initialize Socket.IO room handlers
initializeRoomHandlers(io);

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection established');

  // Store session info
  ws.sessionId = null;
  ws.userId = null;
  ws.isAlive = true;

  // Heartbeat mechanism
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'auth':
          // Authenticate WebSocket connection
          await handleAuth(ws, message);
          break;

        case 'audio_chunk':
          // Handle voice audio chunk
          await handleAudioChunk(ws, message);
          break;

        case 'text_message':
          // Handle text message (fallback mode)
          await handleTextMessage(ws, message);
          break;

        case 'voice_session_init':
          // Initialize voice session
          await handleVoiceSessionInit(ws, message);
          break;

        case 'voice_session_end':
          // End voice session
          await handleVoiceSessionEnd(ws, message);
          break;

        case 'interruption':
          // Handle user interruption
          await handleInterruption(ws, message);
          break;

        case 'ping':
          // Respond to ping
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;

        default:
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Unknown message type' 
          }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Failed to process message' 
      }));
    }
  });

  ws.on('close', async () => {
    console.log('WebSocket connection closed');
    
    // End any active voice session
    if (ws.voiceSessionId) {
      try {
        await endVoiceSession(ws.voiceSessionId);
        console.log(`Ended voice session ${ws.voiceSessionId} due to connection close`);
      } catch (error) {
        console.error('Error ending voice session on close:', error);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  // Send welcome message
  ws.send(JSON.stringify({ 
    type: 'connected', 
    message: 'Connected to Big Snuggles Voice AI Platform',
    timestamp: Date.now()
  }));
});

// WebSocket heartbeat interval
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000); // Every 30 seconds

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// WebSocket auth handler
async function handleAuth(ws, message) {
  try {
    const { token } = message;
    
    if (!token) {
      ws.send(JSON.stringify({ 
        type: 'auth_error', 
        message: 'Missing authentication token' 
      }));
      return;
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      ws.send(JSON.stringify({ 
        type: 'auth_error', 
        message: 'Invalid authentication token' 
      }));
      return;
    }

    ws.userId = user.id;
    ws.send(JSON.stringify({ 
      type: 'auth_success', 
      userId: user.id,
      message: 'Authentication successful' 
    }));
  } catch (error) {
    console.error('Auth error:', error);
    ws.send(JSON.stringify({ 
      type: 'auth_error', 
      message: 'Authentication failed' 
    }));
  }
}

// Handle audio chunk from client
async function handleAudioChunk(ws, message) {
  try {
    if (!ws.userId) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Not authenticated. Please authenticate first.' 
      }));
      return;
    }

    if (!ws.voiceSessionId) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'No active voice session. Please initialize a session first.' 
      }));
      return;
    }

    const { data: audioData } = message;
    
    if (!audioData) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Missing audio data' 
      }));
      return;
    }

    // Get voice session
    const session = getVoiceSession(ws.voiceSessionId);
    
    if (!session) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Voice session not found' 
      }));
      ws.voiceSessionId = null;
      return;
    }

    // Convert base64 to buffer
    const audioBuffer = base64ToBuffer(audioData);

    // Process audio through voice service
    await session.processAudioInput(audioBuffer);

    // Voice service sends response directly via websocket
  } catch (error) {
    console.error('Error handling audio chunk:', error);
    ws.send(JSON.stringify({ 
      type: 'error', 
      message: 'Failed to process audio chunk' 
    }));
  }
}

// Handle text message (fallback mode)
async function handleTextMessage(ws, message) {
  try {
    if (!ws.userId) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Not authenticated. Please authenticate first.' 
      }));
      return;
    }

    if (!ws.voiceSessionId) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'No active voice session. Please initialize a session first.' 
      }));
      return;
    }

    const { text } = message;
    
    if (!text) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Missing text message' 
      }));
      return;
    }

    // Get voice session
    const session = getVoiceSession(ws.voiceSessionId);
    
    if (!session) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Voice session not found' 
      }));
      ws.voiceSessionId = null;
      return;
    }

    // Process text input
    await session.processTextInput(text);

    // Voice service sends response directly via websocket
  } catch (error) {
    console.error('Error handling text message:', error);
    ws.send(JSON.stringify({ 
      type: 'error', 
      message: 'Failed to process text message' 
    }));
  }
}

// Voice session initialization handler
async function handleVoiceSessionInit(ws, message) {
  try {
    if (!ws.userId) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Not authenticated. Please authenticate first.' 
      }));
      return;
    }

    const { sessionId } = message;
    
    if (!sessionId) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Missing session ID' 
      }));
      return;
    }

    // Get voice session
    const session = getVoiceSession(sessionId);
    
    if (!session) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Voice session not found. Please create a session via API first.' 
      }));
      return;
    }

    // Verify user owns this session
    if (session.userId !== ws.userId) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Unauthorized access to voice session' 
      }));
      return;
    }

    // Attach websocket to session
    session.websocket = ws;
    ws.voiceSessionId = sessionId;
    
    ws.send(JSON.stringify({ 
      type: 'voice_session_ready',
      sessionId: sessionId,
      personalityMode: session.personalityMode,
      config: {
        sampleRate: 16000,
        outputSampleRate: 24000,
        chunkSizeMs: 100
      },
      message: 'Voice session ready for streaming',
      timestamp: Date.now()
    }));

    console.log(`Voice session ${sessionId} initialized for WebSocket connection`);
  } catch (error) {
    console.error('Error initializing voice session:', error);
    ws.send(JSON.stringify({ 
      type: 'error', 
      message: 'Failed to initialize voice session' 
    }));
  }
}

// Voice session end handler
async function handleVoiceSessionEnd(ws, message) {
  try {
    if (!ws.voiceSessionId) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'No active voice session' 
      }));
      return;
    }

    const result = await endVoiceSession(ws.voiceSessionId);
    
    ws.send(JSON.stringify({ 
      type: 'voice_session_ended',
      result: result,
      message: 'Voice session ended successfully',
      timestamp: Date.now()
    }));

    ws.voiceSessionId = null;
    console.log(`Voice session ended via WebSocket request`);
  } catch (error) {
    console.error('Error ending voice session:', error);
    ws.send(JSON.stringify({ 
      type: 'error', 
      message: 'Failed to end voice session' 
    }));
  }
}

// Handle user interruption
async function handleInterruption(ws, message) {
  try {
    if (!ws.voiceSessionId) {
      return;
    }

    const session = getVoiceSession(ws.voiceSessionId);
    
    if (session) {
      await session.handleInterruption();
    }
  } catch (error) {
    console.error('Error handling interruption:', error);
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║  Big Snuggles Voice AI Platform - Backend Server         ║
╠═══════════════════════════════════════════════════════════╣
║  Environment: ${NODE_ENV.padEnd(43)} ║
║  Port: ${PORT.toString().padEnd(50)} ║
║  WebSocket (Voice): /ws                                   ║
║  Socket.IO (Rooms): /socket.io                            ║
║  Supabase: Connected                                      ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
