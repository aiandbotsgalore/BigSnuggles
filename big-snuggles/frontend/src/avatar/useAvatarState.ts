/**
 * Avatar State Management Hook
 * Manages the animation state for the Big Snuggles avatar
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { facialExpressions, emotionAnimations, easterEggTriggers } from './avatar-config';

export interface VoiceData {
  isSpeaking: boolean;
  audioLevel: number;
  emotion: string;
  transcription?: string;
}

export interface AnimationState {
  currentExpression: string;
  currentGesture: string | null;
  emotionIntensity: number;
  isSpeaking: boolean;
  audioLevel: number;
  lipSyncData: number[];
  transitionTime: number;
  bodyAnimation: string;
  colorTint: string;
}

export interface AvatarState {
  state: AnimationState;
  updateFromVoice: (voiceData: VoiceData) => void;
  setExpression: (expression: string) => void;
  triggerGesture: (gesture: string) => void;
  resetToIdle: () => void;
}

const defaultState: AnimationState = {
  currentExpression: 'neutral',
  currentGesture: null,
  emotionIntensity: 0.5,
  isSpeaking: false,
  audioLevel: 0,
  lipSyncData: [],
  transitionTime: 0.5,
  bodyAnimation: 'idle',
  colorTint: '#D2691E',
};

export function useAvatarState(personalityMode: string = 'gangster_mode'): AvatarState {
  const [state, setState] = useState<AnimationState>(defaultState);
  const lastTranscription = useRef<string>('');
  const gestureTimeout = useRef<NodeJS.Timeout | null>(null);

  // Update state from voice data
  const updateFromVoice = useCallback((voiceData: VoiceData) => {
    setState(prev => {
      // Extract emotion and map to animation
      const emotion = voiceData.emotion || 'neutral';
      const emotionAnim = emotionAnimations[emotion] || emotionAnimations.neutral;

      // Generate lip-sync data from audio level
      const lipSyncData = generateLipSyncData(voiceData.audioLevel, voiceData.isSpeaking);

      // Check for easter egg triggers in transcription
      if (voiceData.transcription && voiceData.transcription !== lastTranscription.current) {
        lastTranscription.current = voiceData.transcription;
        const triggeredGesture = checkEasterEggs(voiceData.transcription, personalityMode);
        
        if (triggeredGesture) {
          triggerGestureInternal(triggeredGesture);
        }
      }

      return {
        ...prev,
        isSpeaking: voiceData.isSpeaking,
        audioLevel: voiceData.audioLevel,
        emotionIntensity: emotionAnim.intensity,
        currentExpression: emotionAnim.facialExpression,
        bodyAnimation: voiceData.isSpeaking ? 'talking' : emotionAnim.bodyAnimation,
        colorTint: emotionAnim.colorTint,
        lipSyncData,
      };
    });
  }, [personalityMode]);

  // Set facial expression
  const setExpression = useCallback((expression: string) => {
    setState(prev => ({
      ...prev,
      currentExpression: expression,
    }));
  }, []);

  // Trigger a gesture animation
  const triggerGesture = useCallback((gesture: string) => {
    triggerGestureInternal(gesture);
  }, []);

  // Internal function to trigger gesture with timeout
  const triggerGestureInternal = (gesture: string) => {
    // Clear previous gesture timeout
    if (gestureTimeout.current) {
      clearTimeout(gestureTimeout.current);
    }

    setState(prev => ({
      ...prev,
      currentGesture: gesture,
    }));

    // Reset gesture after 3 seconds
    gestureTimeout.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        currentGesture: null,
      }));
    }, 3000);
  };

  // Reset to idle state
  const resetToIdle = useCallback(() => {
    setState(defaultState);
    if (gestureTimeout.current) {
      clearTimeout(gestureTimeout.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gestureTimeout.current) {
        clearTimeout(gestureTimeout.current);
      }
    };
  }, []);

  return {
    state,
    updateFromVoice,
    setExpression,
    triggerGesture,
    resetToIdle,
  };
}

/**
 * Generate lip-sync data from audio level
 */
function generateLipSyncData(audioLevel: number, isSpeaking: boolean): number[] {
  if (!isSpeaking) {
    return [0, 0, 0, 0, 0];
  }

  // Generate simple lip-sync values (can be enhanced with FFT analysis)
  const baseValue = audioLevel * 0.5;
  const variation = Math.random() * 0.3;

  return [
    baseValue + variation,
    baseValue + variation * 0.8,
    baseValue + variation * 1.2,
    baseValue + variation * 0.6,
    baseValue + variation * 0.9,
  ];
}

/**
 * Check for easter egg triggers in transcription
 */
function checkEasterEggs(transcription: string, personalityMode: string): string | null {
  const lowerText = transcription.toLowerCase();

  for (const [, trigger] of Object.entries(easterEggTriggers)) {
    // Check if any keyword matches
    const hasKeyword = trigger.keywords.some(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );

    if (!hasKeyword) continue;

    // Check if personality matches
    const personalityMatches = 
      trigger.personality.includes('all') || 
      trigger.personality.includes(personalityMode);

    if (personalityMatches) {
      return trigger.animation;
    }
  }

  return null;
}

/**
 * Hook to manage blink animation
 */
export function useBlinkAnimation(interval: number = 3000, duration: number = 150) {
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    const blinkTimer = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), duration);
    }, interval + Math.random() * 1000); // Add randomness

    return () => clearInterval(blinkTimer);
  }, [interval, duration]);

  return isBlinking;
}

/**
 * Hook to manage idle bobbing animation
 */
export function useIdleBob(speed: number = 0.5, amount: number = 0.05) {
  const [bobOffset, setBobOffset] = useState(0);

  useEffect(() => {
    let animationFrame: number;
    let time = 0;

    const animate = () => {
      time += speed;
      const offset = Math.sin(time * 0.05) * amount;
      setBobOffset(offset);
      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [speed, amount]);

  return bobOffset;
}
