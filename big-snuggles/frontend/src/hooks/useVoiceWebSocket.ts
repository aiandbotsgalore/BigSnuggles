/**
 * Voice WebSocket Hook
 * Manages WebSocket connection for real-time voice streaming
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = API_URL.replace('http', 'ws');

export interface VoiceMessage {
  type: string;
  data?: string;
  text?: string;
  sessionId?: string;
  latency?: number;
  hasVoice?: boolean;
  message?: string;
  error?: string;
}

export interface UseVoiceWebSocketReturn {
  isConnected: boolean;
  isReady: boolean;
  sendAudioChunk: (audioData: ArrayBuffer) => void;
  sendTextMessage: (text: string) => void;
  initializeSession: (sessionId: string) => void;
  endSession: () => void;
  handleInterruption: () => void;
  lastMessage: VoiceMessage | null;
  connectionError: string | null;
}

export function useVoiceWebSocket(
  onAudioResponse?: (audioData: string) => void,
  onTextResponse?: (text: string) => void,
  onError?: (error: string) => void
): UseVoiceWebSocketReturn {
  const { session } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [lastMessage, setLastMessage] = useState<VoiceMessage | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Initialize WebSocket connection
  const connect = useCallback(() => {
    if (!session) {
      setConnectionError('Not authenticated');
      return;
    }

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;

        // Authenticate connection
        ws.send(
          JSON.stringify({
            type: 'auth',
            token: session.access_token,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const message: VoiceMessage = JSON.parse(event.data);
          setLastMessage(message);

          switch (message.type) {
            case 'auth_success':
              console.log('WebSocket authenticated');
              break;

            case 'auth_error':
              console.error('WebSocket auth error:', message.message);
              setConnectionError(message.message || 'Authentication failed');
              if (onError) {
                onError(message.message || 'Authentication failed');
              }
              break;

            case 'voice_session_ready':
              console.log('Voice session ready:', message.sessionId);
              setIsReady(true);
              break;

            case 'audio_response':
              if (message.data && onAudioResponse) {
                onAudioResponse(message.data);
              }
              break;

            case 'text_response':
              if (message.text && onTextResponse) {
                onTextResponse(message.text);
              }
              if (message.audioData && onAudioResponse) {
                onAudioResponse(message.audioData);
              }
              break;

            case 'voice_session_ended':
              console.log('Voice session ended');
              setIsReady(false);
              break;

            case 'interruption':
              console.log('Interruption detected');
              break;

            case 'error':
              console.error('WebSocket error message:', message.message);
              if (onError) {
                onError(message.message || 'Unknown error');
              }
              break;

            case 'pong':
              // Heartbeat response
              break;

            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('WebSocket connection error');
        if (onError) {
          onError('Connection error occurred');
        }
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setIsConnected(false);
        setIsReady(false);

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;

          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setConnectionError('Failed to reconnect after multiple attempts');
          if (onError) {
            onError('Connection lost. Please refresh the page.');
          }
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setConnectionError('Failed to create WebSocket connection');
    }
  }, [session, onAudioResponse, onTextResponse, onError]);

  // Initialize connection on mount
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Send audio chunk
  const sendAudioChunk = useCallback((audioData: ArrayBuffer) => {
    if (!wsRef.current || !isConnected || !isReady) {
      console.warn('Cannot send audio: WebSocket not ready');
      return;
    }

    try {
      // Convert ArrayBuffer to base64
      const bytes = new Uint8Array(audioData);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      wsRef.current.send(
        JSON.stringify({
          type: 'audio_chunk',
          data: base64,
        })
      );
    } catch (error) {
      console.error('Error sending audio chunk:', error);
      if (onError) {
        onError('Failed to send audio');
      }
    }
  }, [isConnected, isReady, onError]);

  // Send text message
  const sendTextMessage = useCallback((text: string) => {
    if (!wsRef.current || !isConnected || !isReady) {
      console.warn('Cannot send text: WebSocket not ready');
      return;
    }

    try {
      wsRef.current.send(
        JSON.stringify({
          type: 'text_message',
          text: text,
        })
      );
    } catch (error) {
      console.error('Error sending text message:', error);
      if (onError) {
        onError('Failed to send message');
      }
    }
  }, [isConnected, isReady, onError]);

  // Initialize voice session
  const initializeSession = useCallback((sessionId: string) => {
    if (!wsRef.current || !isConnected) {
      console.warn('Cannot initialize session: WebSocket not connected');
      return;
    }

    try {
      wsRef.current.send(
        JSON.stringify({
          type: 'voice_session_init',
          sessionId: sessionId,
        })
      );
    } catch (error) {
      console.error('Error initializing session:', error);
      if (onError) {
        onError('Failed to initialize session');
      }
    }
  }, [isConnected, onError]);

  // End voice session
  const endSession = useCallback(() => {
    if (!wsRef.current || !isConnected || !isReady) {
      return;
    }

    try {
      wsRef.current.send(
        JSON.stringify({
          type: 'voice_session_end',
        })
      );
      setIsReady(false);
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }, [isConnected, isReady]);

  // Handle user interruption
  const handleInterruption = useCallback(() => {
    if (!wsRef.current || !isConnected || !isReady) {
      return;
    }

    try {
      wsRef.current.send(
        JSON.stringify({
          type: 'interruption',
        })
      );
    } catch (error) {
      console.error('Error sending interruption:', error);
    }
  }, [isConnected, isReady]);

  return {
    isConnected,
    isReady,
    sendAudioChunk,
    sendTextMessage,
    initializeSession,
    endSession,
    handleInterruption,
    lastMessage,
    connectionError,
  };
}
