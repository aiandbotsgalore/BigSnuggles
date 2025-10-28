import React, { useState, useEffect, useRef } from 'react';
import { useVoiceWebSocket } from '../hooks/useVoiceWebSocket';
import { AudioCapture, AudioPlayback } from '../utils/audioUtils';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface VoiceInterfaceProps {
  personalityMode?: string;
  onError?: (error: string) => void;
  onStatusChange?: (status: 'idle' | 'connecting' | 'ready' | 'speaking' | 'listening') => void;
  // Phase 5: Transcript tracking
  onSessionStart?: (sessionId: string) => void;
  onSessionEnd?: (sessionId: string, messages: Array<{role: string, content: string, timestamp: string}>) => void;
  onUserMessage?: (content: string) => void;
  onAiResponse?: (content: string) => void;
}

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({
  personalityMode = 'gangster_mode',
  onError,
  onStatusChange,
  // Phase 5: Transcript tracking
  onSessionStart,
  onSessionEnd,
  onUserMessage,
  onAiResponse,
}) => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'ready' | 'speaking' | 'listening'>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [metrics, setMetrics] = useState({ latency: 0, errors: 0 });
  
  // Phase 5: Message tracking for transcripts
  const [sessionMessages, setSessionMessages] = useState<Array<{role: string, content: string, timestamp: string}>>([]);

  const audioCaptureRef = useRef<AudioCapture | null>(null);
  const audioPlaybackRef = useRef<AudioPlayback | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Handle audio and text responses
  const handleAudioResponse = async (audioData: string) => {
    if (audioPlaybackRef.current && !isMuted) {
      try {
        await audioPlaybackRef.current.play(audioData);
        updateStatus('speaking');
      } catch (err) {
        console.error('Error playing audio:', err);
        handleError('Failed to play audio response');
      }
    }
  };

  const handleTextResponse = (text: string) => {
    console.log('Text response:', text);
    
    // Phase 5: Track AI response for transcript
    if (text.trim() && onAiResponse) {
      onAiResponse(text);
      
      const message = {
        role: 'assistant' as const,
        content: text,
        timestamp: new Date().toISOString()
      };
      setSessionMessages(prev => [...prev, message]);
    }
  };

  // Phase 5: Track user messages for transcript
  const trackUserMessage = (content: string) => {
    if (content.trim() && onUserMessage) {
      onUserMessage(content);
      
      const message = {
        role: 'user' as const,
        content: content,
        timestamp: new Date().toISOString()
      };
      setSessionMessages(prev => [...prev, message]);
    }
  };

  const handleError = (err: string) => {
    setError(err);
    if (onError) {
      onError(err);
    }
  };

  const {
    isConnected,
    isReady,
    sendAudioChunk,
    sendTextMessage,
    initializeSession,
    endSession,
    handleInterruption,
    lastMessage,
    connectionError,
  } = useVoiceWebSocket(handleAudioResponse, handleTextResponse, handleError);

  // Update status
  const updateStatus = (newStatus: typeof status) => {
    setStatus(newStatus);
    if (onStatusChange) {
      onStatusChange(newStatus);
    }
  };

  // Initialize audio systems
  useEffect(() => {
    const initAudio = async () => {
      try {
        // Initialize audio capture
        audioCaptureRef.current = new AudioCapture();
        await audioCaptureRef.current.initialize();

        // Initialize audio playback
        audioPlaybackRef.current = new AudioPlayback(24000);
        await audioPlaybackRef.current.initialize();

        console.log('Audio systems initialized');
      } catch (err) {
        console.error('Error initializing audio:', err);
        handleError('Failed to initialize audio. Please check microphone permissions.');
      }
    };

    initAudio();

    return () => {
      if (audioCaptureRef.current) {
        audioCaptureRef.current.cleanup();
      }
      if (audioPlaybackRef.current) {
        audioPlaybackRef.current.cleanup();
      }
    };
  }, []);

  // Update volume
  useEffect(() => {
    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.setVolume(volume);
    }
  }, [volume]);

  // Update metrics from last message
  useEffect(() => {
    if (lastMessage && lastMessage.latency) {
      setMetrics((prev) => ({
        ...prev,
        latency: lastMessage.latency || 0,
      }));
    }
  }, [lastMessage]);

  // Create voice session
  const createSession = async () => {
    try {
      updateStatus('connecting');
      setError(null);

      const token = localStorage.getItem('supabase.auth.token');
      const response = await fetch(`${API_URL}/api/voice/session/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ personalityMode }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create session');
      }

      setSessionId(data.data.sessionId);
      setSessionStartTime(new Date());
      initializeSession(data.data.sessionId);
      
      // Phase 5: Notify parent component about session start
      if (onSessionStart) {
        onSessionStart(data.data.sessionId);
      }
      
      updateStatus('ready');
    } catch (err: any) {
      console.error('Error creating session:', err);
      handleError(err.message || 'Failed to create voice session');
      updateStatus('idle');
    }
  };

  // Start voice streaming
  const startVoiceStreaming = () => {
    if (!audioCaptureRef.current || !isReady) {
      handleError('Voice session not ready');
      return;
    }

    try {
      audioCaptureRef.current.start((audioData) => {
        sendAudioChunk(audioData);
      }, 100); // 100ms chunks

      updateStatus('listening');
    } catch (err: any) {
      console.error('Error starting voice streaming:', err);
      handleError(err.message || 'Failed to start voice streaming');
    }
  };

  // Stop voice streaming
  const stopVoiceStreaming = () => {
    if (audioCaptureRef.current) {
      audioCaptureRef.current.stop();
      updateStatus('ready');
    }
  };

  // End session
  const handleEndSession = async () => {
    stopVoiceStreaming();
    endSession();

    if (sessionId) {
      try {
        const token = localStorage.getItem('supabase.auth.token');
        await fetch(`${API_URL}/api/voice/session/${sessionId}/end`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        // Phase 5: Notify parent component about session end with transcript data
        if (onSessionEnd) {
          onSessionEnd(sessionId, sessionMessages);
        }
      } catch (err) {
        console.error('Error ending session:', err);
      }
    }

    setSessionId(null);
    setSessionStartTime(null);
    setSessionMessages([]);
    updateStatus('idle');
  };

  // Send text message (fallback)
  const [textInput, setTextInput] = useState('');

  const handleSendText = () => {
    if (textInput.trim() && isReady) {
      sendTextMessage(textInput);
      setTextInput('');
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg shadow-xl">
      {/* Status Indicator */}
      <div className="flex items-center space-x-3">
        <div
          className={`w-4 h-4 rounded-full ${
            status === 'idle'
              ? 'bg-gray-500'
              : status === 'connecting'
              ? 'bg-yellow-500 animate-pulse'
              : status === 'ready'
              ? 'bg-green-500'
              : status === 'listening'
              ? 'bg-blue-500 animate-pulse'
              : 'bg-purple-500 animate-pulse'
          }`}
        />
        <span className="text-white font-medium capitalize">{status}</span>
      </div>

      {/* Error Display */}
      {(error || connectionError) && (
        <div className="w-full p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
          {error || connectionError}
        </div>
      )}

      {/* Audio Visualizer */}
      <canvas
        ref={canvasRef}
        width={400}
        height={100}
        className="rounded-lg border-2 border-slate-600"
      />

      {/* Controls */}
      <div className="flex flex-col items-center space-y-4 w-full max-w-md">
        {!sessionId ? (
          <button
            onClick={createSession}
            disabled={status === 'connecting'}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {status === 'connecting' ? 'Connecting...' : 'Start Voice Session'}
          </button>
        ) : (
          <>
            {status === 'listening' ? (
              <button
                onClick={stopVoiceStreaming}
                className="w-full px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all"
              >
                Stop Listening
              </button>
            ) : (
              <button
                onClick={startVoiceStreaming}
                disabled={!isReady}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Start Speaking
              </button>
            )}

            <button
              onClick={handleEndSession}
              className="w-full px-6 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-800 transition-all"
            >
              End Session
            </button>
          </>
        )}

        {/* Text Input (Fallback) */}
        {sessionId && isReady && (
          <div className="w-full flex space-x-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendText()}
              placeholder="Type a message (fallback)..."
              className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSendText}
              disabled={!textInput.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Send
            </button>
          </div>
        )}

        {/* Volume Control */}
        <div className="w-full flex items-center space-x-3">
          <span className="text-white text-sm">Volume:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="flex-1"
          />
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="px-3 py-1 bg-slate-700 text-white rounded hover:bg-slate-600 transition-all"
          >
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
        </div>

        {/* Metrics */}
        {sessionId && (
          <div className="w-full p-3 bg-slate-800 rounded-lg text-sm">
            <div className="flex justify-between text-slate-300">
              <span>Latency:</span>
              <span className={metrics.latency > 1000 ? 'text-red-400' : 'text-green-400'}>
                {metrics.latency}ms
              </span>
            </div>
            <div className="flex justify-between text-slate-300 mt-1">
              <span>Connection:</span>
              <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
