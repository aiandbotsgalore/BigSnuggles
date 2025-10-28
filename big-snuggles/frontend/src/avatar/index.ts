/**
 * Avatar Module Index
 * Exports all avatar-related components and utilities
 */

export { AvatarEngine } from './AvatarEngine';
export { TeddyBearModel } from './TeddyBearModel';
export { CameraSystem, SceneEnvironment, useCameraPreset } from './CameraSystem';
export { useFacialExpression, blendExpressions } from './FacialExpressionSystem';
export { useGesture, getRandomGesture } from './GestureSystem';
export { useAvatarState, useBlinkAnimation, useIdleBob } from './useAvatarState';
export type { VoiceData, AnimationState, AvatarState } from './useAvatarState';
export type { AvatarEngineProps } from './AvatarEngine';
export type { FacialExpression, EmotionAnimation, EasterEggTrigger } from './avatar-config';
export {
  facialExpressions,
  emotionAnimations,
  gestureLibrary,
  easterEggTriggers,
  avatarConfig,
  cameraPresets,
  lightingPresets,
  performanceConfig,
} from './avatar-config';
