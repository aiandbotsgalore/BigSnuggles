import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Header } from '../components/layout/Header';
import { VoiceInterface } from '../components/VoiceInterface';
import { AvatarEngine } from '../avatar/AvatarEngine';
import type { VoiceData } from '../avatar/useAvatarState';
import { getApiClient } from '../utils/apiClient';

export default function ChatPage() {
  const { user, session } = useAuth();
  const [messages, setMessages] = useState<Array<{id: string, type: string, content: string, timestamp: Date}>>([]);
  const [voiceStatus, setVoiceStatus] = useState<string>('idle');
  const [error, setError] = useState<string | null>(null);
  const [selectedPersonality, setSelectedPersonality] = useState('gangster_mode');
  const [sessionId, setSessionId] = useState<string>('');
  const [voiceData, setVoiceData] = useState<VoiceData>({
    isSpeaking: false,
    audioLevel: 0,
    emotion: 'neutral',
    transcription: '',
  });

  // Phase 5: Transcript tracking
  const [currentMessages, setCurrentMessages] = useState<Array<{role: string, content: string, timestamp: string}>>([]);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [apiClient] = useState(() => getApiClient());

  // Track messages for transcript storage
  const trackMessage = (role: 'user' | 'assistant', content: string) => {
    const message = {
      role,
      content,
      timestamp: new Date().toISOString()
    };
    setCurrentMessages(prev => [...prev, message]);
  };

  // Store transcript when session ends
  const storeTranscript = async (sessionId: string, endTime: Date) => {
    if (currentMessages.length === 0 || !sessionStartTime) return;

    try {
      const duration = Math.floor((endTime.getTime() - sessionStartTime.getTime()) / (1000 * 60));
      
      await apiClient.storeTranscript(sessionId, currentMessages, {
        duration: duration,
        startTime: sessionStartTime.toISOString(),
        personalityMode: selectedPersonality,
        emotionalTone: 'neutral',
        topics: [],
        sentimentScore: 0,
        highlightMoments: []
      });

      // Clear message tracking for next session
      setCurrentMessages([]);
      setSessionStartTime(null);
      
      console.log('Transcript stored successfully');
    } catch (error) {
      console.error('Error storing transcript:', error);
    }
  };

  const personalities = [
    { id: 'gangster_mode', name: 'Gangster Mode', description: 'Street-smart and protective' },
    { id: 'late_night', name: 'Late Night', description: 'Contemplative and deep' },
    { id: 'conspiracy_hour', name: 'Conspiracy Hour', description: 'Suspicious and questioning' },
    { id: 'playful_snuggles', name: 'Playful Snuggles', description: 'Fun and lighthearted' },
    { id: 'wild_card', name: 'Wild Card', description: 'Unpredictable and surprising' },
  ];

  const handleVoiceError = (err: string) => {
    setError(err);
    setTimeout(() => setError(null), 5000);
  };

  const handleStatusChange = (status: string) => {
    setVoiceStatus(status);
    
    // Update voice data for avatar
    setVoiceData(prev => ({
      ...prev,
      isSpeaking: status === 'speaking' || status === 'listening',
    }));
  };

  const handleAudioLevel = (level: number) => {
    setVoiceData(prev => ({
      ...prev,
      audioLevel: level,
    }));
  };

  const handleTranscription = (text: string) => {
    setVoiceData(prev => ({
      ...prev,
      transcription: text,
    }));
  };

  const handleExpressionChange = (expression: string) => {
    console.log('Avatar expression changed to:', expression);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      
      <main className="flex-1 container py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          {/* Main Chat Area */}
          <div className="flex flex-col gap-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
              <h1 className="text-3xl font-bold text-white mb-2">Voice Chat with Big Snuggles</h1>
              <p className="text-slate-300">
                Your personal gangster teddy bear AI companion with real-time voice streaming
              </p>
            </div>

            {/* 3D Avatar */}
            <div className="rounded-lg overflow-hidden border-2 border-purple-500/30 backdrop-blur-sm bg-gradient-to-br from-slate-900 to-purple-900/30">
              <AvatarEngine
                voiceData={voiceData}
                personalityMode={selectedPersonality}
                sessionId={sessionId || 'default'}
                onExpressionChange={handleExpressionChange}
                enableUserControls={true}
                autoRotate={voiceStatus === 'idle'}
                className="w-full aspect-video"
              />
              
              {/* Status Overlay */}
              <div className="absolute bottom-4 left-4 bg-black/70 text-white text-sm px-4 py-2 rounded-lg">
                <p className="font-bold">Big Snuggles</p>
                <p className="text-xs text-slate-300 mt-1">
                  {voiceStatus === 'listening' && 'Listening...'}
                  {voiceStatus === 'speaking' && 'Speaking...'}
                  {voiceStatus === 'ready' && 'Ready'}
                  {voiceStatus === 'connecting' && 'Connecting...'}
                  {voiceStatus === 'idle' && 'Idle - Click to interact'}
                </p>
              </div>
            </div>

            {/* Voice Interface */}
            <VoiceInterface
              personalityMode={selectedPersonality}
              onError={handleVoiceError}
              onStatusChange={handleStatusChange}
              onSessionStart={(id) => {
                setSessionId(id);
                setSessionStartTime(new Date());
                setCurrentMessages([]);
              }}
              onSessionEnd={(id, messages) => {
                // Store transcript
                const endTime = new Date();
                if (currentMessages.length > 0) {
                  storeTranscript(id, endTime);
                }
              }}
              onUserMessage={(content) => {
                trackMessage('user', content);
              }}
              onAiResponse={(content) => {
                trackMessage('assistant', content);
              }}
            />

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
                <p className="font-semibold">Error:</p>
                <p className="text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6">
            {/* Personality Selector */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">Personality Mode</h2>
              <div className="space-y-2">
                {personalities.map((personality) => (
                  <button
                    key={personality.id}
                    onClick={() => setSelectedPersonality(personality.id)}
                    disabled={voiceStatus !== 'idle'}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      selectedPersonality === personality.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    } ${voiceStatus !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="font-semibold">{personality.name}</div>
                    <div className="text-xs mt-1 opacity-80">{personality.description}</div>
                  </button>
                ))}
              </div>
              {voiceStatus !== 'idle' && (
                <p className="text-xs text-slate-400 mt-3">
                  End current session to change personality
                </p>
              )}
            </div>

            {/* Conversation History */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700 flex-1">
              <h2 className="text-xl font-bold text-white mb-4">Conversation</h2>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-center text-slate-400">
                    <p>Start a conversation by clicking "Start Voice Session"</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-lg p-3 ${
                        message.type === 'user'
                          ? 'bg-blue-600 text-white ml-auto max-w-[80%]'
                          : 'bg-slate-700 text-slate-200 max-w-[80%]'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="mt-1 text-xs opacity-70">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Info Panel */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-3">How It Works</h3>
              <ul className="text-sm text-slate-300 space-y-2">
                <li className="flex items-start">
                  <span className="mr-2">1.</span>
                  <span>Select your preferred personality mode</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">2.</span>
                  <span>Click "Start Voice Session" to begin</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">3.</span>
                  <span>Click "Start Speaking" and talk naturally</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">4.</span>
                  <span>Big Snuggles will respond with voice</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">5.</span>
                  <span>Use text fallback if voice fails</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
