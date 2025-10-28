/**
 * Avatar Engine
 * Main component that orchestrates the 3D Big Snuggles avatar system
 */

import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { TeddyBearModel } from './TeddyBearModel';
import { CameraSystem, SceneEnvironment } from './CameraSystem';
import { useFacialExpression } from './FacialExpressionSystem';
import { useGesture } from './GestureSystem';
import { useAvatarState, useBlinkAnimation, useIdleBob, VoiceData } from './useAvatarState';
import { performanceConfig, avatarConfig } from './avatar-config';

export interface AvatarEngineProps {
  voiceData?: VoiceData;
  personalityMode: string;
  sessionId: string;
  onExpressionChange?: (expression: string) => void;
  enableUserControls?: boolean;
  autoRotate?: boolean;
  className?: string;
}

export const AvatarEngine: React.FC<AvatarEngineProps> = ({
  voiceData,
  personalityMode,
  sessionId,
  onExpressionChange,
  enableUserControls = true,
  autoRotate = false,
  className = '',
}) => {
  const [mounted, setMounted] = useState(false);

  // Avatar state management
  const { state, updateFromVoice } = useAvatarState(personalityMode);

  // Facial expression system
  const { currentExpression } = useFacialExpression(
    state.currentExpression,
    state.transitionTime
  );

  // Gesture system
  const { leftArmRotation, rightArmRotation, bodyPosition, bodyRotation, isAnimating } =
    useGesture(state.currentGesture);

  // Idle animations
  const isBlinking = useBlinkAnimation(
    avatarConfig.blinkInterval,
    avatarConfig.blinkDuration
  );
  const bobOffset = useIdleBob(
    avatarConfig.idleBobSpeed,
    avatarConfig.idleBobAmount
  );

  // Update from voice data
  useEffect(() => {
    if (voiceData) {
      updateFromVoice(voiceData);
    }
  }, [voiceData, updateFromVoice]);

  // Notify parent of expression changes
  useEffect(() => {
    if (onExpressionChange) {
      onExpressionChange(state.currentExpression);
    }
  }, [state.currentExpression, onExpressionChange]);

  // Mount effect for performance
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`${className} flex items-center justify-center bg-slate-900`}>
        <div className="text-white">Loading 3D Avatar...</div>
      </div>
    );
  }

  return (
    <div className={`${className} relative`}>
      <Canvas
        shadows
        dpr={performanceConfig.pixelRatio}
        camera={{
          position: [0, 1.5, 4],
          fov: 50,
        }}
      >
        {/* Camera and Lighting */}
        <CameraSystem
          emotionIntensity={state.emotionIntensity}
          currentEmotion={state.currentExpression}
          autoRotate={autoRotate}
          enableControls={enableUserControls}
        />

        {/* Scene Environment */}
        <SceneEnvironment />

        {/* Teddy Bear Model */}
        <TeddyBearModel
          expression={currentExpression}
          isSpeaking={state.isSpeaking}
          audioLevel={state.audioLevel}
          colorTint={state.colorTint}
          bobOffset={bobOffset}
          isBlinking={isBlinking}
        />
      </Canvas>

      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs p-2 rounded space-y-1 pointer-events-none">
          <div>Expression: {state.currentExpression}</div>
          <div>Gesture: {state.currentGesture || 'none'}</div>
          <div>Speaking: {state.isSpeaking ? 'Yes' : 'No'}</div>
          <div>Audio Level: {(state.audioLevel * 100).toFixed(0)}%</div>
          <div>Emotion Intensity: {(state.emotionIntensity * 100).toFixed(0)}%</div>
          <div>Animating: {isAnimating ? 'Yes' : 'No'}</div>
        </div>
      )}

      {/* Performance Monitor (optional) */}
      {process.env.NODE_ENV === 'development' && (
        <PerformanceMonitor />
      )}
    </div>
  );
};

/**
 * Performance Monitor Component
 */
const PerformanceMonitor: React.FC = () => {
  const [fps, setFps] = useState(60);
  const [memoryUsage, setMemoryUsage] = useState(0);

  useEffect(() => {
    let lastTime = performance.now();
    let frameCount = 0;

    const measurePerformance = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime >= lastTime + 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = currentTime;

        // Memory usage (if available)
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          const usedMB = memory.usedJSHeapSize / 1048576;
          setMemoryUsage(usedMB);
        }
      }

      requestAnimationFrame(measurePerformance);
    };

    const rafId = requestAnimationFrame(measurePerformance);

    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs p-2 rounded space-y-1 pointer-events-none">
      <div className={fps < 30 ? 'text-red-400' : fps < 50 ? 'text-yellow-400' : 'text-green-400'}>
        FPS: {fps}
      </div>
      {memoryUsage > 0 && (
        <div>Memory: {memoryUsage.toFixed(1)} MB</div>
      )}
    </div>
  );
};

export default AvatarEngine;
