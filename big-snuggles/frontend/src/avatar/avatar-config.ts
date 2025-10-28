/**
 * Avatar Configuration
 * Constants and mappings for the Big Snuggles 3D avatar system
 */

import * as THREE from 'three';

// Facial expression configurations
export interface FacialExpression {
  jawOpen: number;
  lipSync: number;
  eyeBlink: number;
  eyebrowRaise: number;
  mouthSmile: number;
}

export const facialExpressions: Record<string, FacialExpression> = {
  neutral: { jawOpen: 0, lipSync: 0, eyeBlink: 0.5, eyebrowRaise: 0, mouthSmile: 0 },
  happy: { jawOpen: 0.3, lipSync: 0.8, eyeBlink: 0.7, eyebrowRaise: 0.8, mouthSmile: 0.9 },
  angry: { jawOpen: 0.6, lipSync: 0.2, eyeBlink: 0.2, eyebrowRaise: 1.0, mouthSmile: -0.5 },
  surprised: { jawOpen: 1.0, lipSync: 0.5, eyeBlink: 0.9, eyebrowRaise: 1.0, mouthSmile: 0.5 },
  protective: { jawOpen: 0.4, lipSync: 0.3, eyeBlink: 0.3, eyebrowRaise: 0.6, mouthSmile: 0.2 },
  playful: { jawOpen: 0.5, lipSync: 0.9, eyeBlink: 0.8, eyebrowRaise: 0.4, mouthSmile: 0.8 },
  gangster: { jawOpen: 0.7, lipSync: 0.1, eyeBlink: 0.1, eyebrowRaise: 0.9, mouthSmile: -0.2 },
  suspicious: { jawOpen: 0.2, lipSync: 0, eyeBlink: 0.3, eyebrowRaise: 0.7, mouthSmile: -0.3 },
};

// Emotion-driven animation mapping
export interface EmotionAnimation {
  facialExpression: string;
  bodyAnimation: string;
  colorTint: string;
  animationSpeed: number;
  intensity: number;
}

export const emotionAnimations: Record<string, EmotionAnimation> = {
  joy: {
    facialExpression: 'happy',
    bodyAnimation: 'bouncing',
    colorTint: '#FFD700',
    animationSpeed: 1.2,
    intensity: 0.8,
  },
  anger: {
    facialExpression: 'angry',
    bodyAnimation: 'tense',
    colorTint: '#FF4444',
    animationSpeed: 0.8,
    intensity: 0.9,
  },
  protection: {
    facialExpression: 'protective',
    bodyAnimation: 'defensive_stance',
    colorTint: '#AA0000',
    animationSpeed: 0.9,
    intensity: 0.7,
  },
  playfulness: {
    facialExpression: 'playful',
    bodyAnimation: 'bouncy',
    colorTint: '#FF69B4',
    animationSpeed: 1.5,
    intensity: 0.9,
  },
  suspicion: {
    facialExpression: 'suspicious',
    bodyAnimation: 'cautious',
    colorTint: '#8B4513',
    animationSpeed: 0.7,
    intensity: 0.6,
  },
  neutral: {
    facialExpression: 'neutral',
    bodyAnimation: 'idle',
    colorTint: '#D2691E',
    animationSpeed: 1.0,
    intensity: 0.5,
  },
};

// Gesture library
export const gestureLibrary = {
  gangster_gestures: [
    'point_finger',
    'cross_arms',
    'chin_stroke',
    'pocket_check',
    'cool_lean',
    'tough_stance',
  ],
  friendly_gestures: [
    'wave',
    'thumbs_up',
    'bear_hug',
    'gentle_pat',
    'cuddle_pose',
    'welcoming_arms',
  ],
  defensive_gestures: [
    'arms_crossed',
    'step_back',
    'warning_pose',
    'protective_stance',
    'shield_pose',
  ],
  playful_gestures: [
    'dance',
    'spin',
    'jump',
    'silly_dance',
    'tickle_gesture',
    'bounce',
  ],
};

// Easter egg triggers
export interface EasterEggTrigger {
  keywords: string[];
  animation: string;
  personality: string[];
  duration: number;
}

export const easterEggTriggers: Record<string, EasterEggTrigger> = {
  money: {
    keywords: ['money', 'cash', 'dollars', 'benjamins', 'dough'],
    animation: 'pocket_check',
    personality: ['gangster_mode'],
    duration: 2000,
  },
  love: {
    keywords: ['love', 'heart', 'affection', 'care'],
    animation: 'cuddle_pose',
    personality: ['playful_snuggles'],
    duration: 3000,
  },
  danger: {
    keywords: ['danger', 'threat', 'watch out', 'careful'],
    animation: 'protective_stance',
    personality: ['all'],
    duration: 2500,
  },
  respect: {
    keywords: ['respect', 'honor', 'loyalty'],
    animation: 'tough_stance',
    personality: ['gangster_mode'],
    duration: 2000,
  },
  conspiracy: {
    keywords: ['conspiracy', 'secret', 'truth', 'they'],
    animation: 'cautious',
    personality: ['conspiracy_hour'],
    duration: 3000,
  },
  family: {
    keywords: ['family', 'crew', 'squad', 'team'],
    animation: 'welcoming_arms',
    personality: ['gangster_mode', 'playful_snuggles'],
    duration: 2500,
  },
};

// Avatar model configuration
export const avatarConfig = {
  scale: 1.5,
  position: [0, -1, 0] as [number, number, number],
  rotation: [0, 0, 0] as [number, number, number],
  
  // Teddy bear proportions
  head: {
    radius: 0.5,
    position: [0, 1.5, 0] as [number, number, number],
  },
  body: {
    radiusTop: 0.4,
    radiusBottom: 0.5,
    height: 0.8,
    position: [0, 0.8, 0] as [number, number, number],
  },
  arms: {
    radius: 0.15,
    length: 0.6,
    leftPosition: [-0.55, 0.9, 0] as [number, number, number],
    rightPosition: [0.55, 0.9, 0] as [number, number, number],
  },
  legs: {
    radius: 0.18,
    length: 0.5,
    leftPosition: [-0.2, 0.25, 0] as [number, number, number],
    rightPosition: [0.2, 0.25, 0] as [number, number, number],
  },
  ears: {
    radius: 0.2,
    leftPosition: [-0.35, 1.8, 0] as [number, number, number],
    rightPosition: [0.35, 1.8, 0] as [number, number, number],
  },
  eyes: {
    radius: 0.08,
    leftPosition: [-0.15, 1.6, 0.4] as [number, number, number],
    rightPosition: [0.15, 1.6, 0.4] as [number, number, number],
  },
  nose: {
    radius: 0.1,
    position: [0, 1.45, 0.45] as [number, number, number],
  },
  
  // Material properties
  furColor: new THREE.Color(0x8B4513), // Saddle brown
  furRoughness: 0.8,
  furMetalness: 0.1,
  
  eyeColor: new THREE.Color(0x000000), // Black
  noseColor: new THREE.Color(0x1A1A1A), // Dark gray
  
  // Animation properties
  idleBobSpeed: 0.5,
  idleBobAmount: 0.05,
  blinkInterval: 3000,
  blinkDuration: 150,
};

// Camera presets
export const cameraPresets = {
  default: {
    position: [0, 1.5, 4] as [number, number, number],
    lookAt: [0, 1, 0] as [number, number, number],
    fov: 50,
  },
  closeUp: {
    position: [0, 1.5, 2] as [number, number, number],
    lookAt: [0, 1.5, 0] as [number, number, number],
    fov: 45,
  },
  dramatic: {
    position: [-2, 2, 3] as [number, number, number],
    lookAt: [0, 1, 0] as [number, number, number],
    fov: 55,
  },
  topDown: {
    position: [0, 4, 2] as [number, number, number],
    lookAt: [0, 0, 0] as [number, number, number],
    fov: 60,
  },
};

// Lighting presets based on emotion
export const lightingPresets = {
  neutral: {
    ambient: { color: 0xffffff, intensity: 0.5 },
    directional: { color: 0xffffff, intensity: 0.8, position: [5, 5, 5] as [number, number, number] },
    rim: { color: 0xffffff, intensity: 0.3, position: [-5, 2, -5] as [number, number, number] },
  },
  happy: {
    ambient: { color: 0xffffe0, intensity: 0.6 },
    directional: { color: 0xffd700, intensity: 0.9, position: [5, 5, 5] as [number, number, number] },
    rim: { color: 0xffa500, intensity: 0.4, position: [-5, 2, -5] as [number, number, number] },
  },
  angry: {
    ambient: { color: 0xff6666, intensity: 0.4 },
    directional: { color: 0xff0000, intensity: 1.0, position: [5, 5, 5] as [number, number, number] },
    rim: { color: 0xaa0000, intensity: 0.5, position: [-5, 2, -5] as [number, number, number] },
  },
  mysterious: {
    ambient: { color: 0x6666ff, intensity: 0.3 },
    directional: { color: 0x8888ff, intensity: 0.6, position: [5, 5, 5] as [number, number, number] },
    rim: { color: 0x4444aa, intensity: 0.7, position: [-5, 2, -5] as [number, number, number] },
  },
};

// Performance settings
export const performanceConfig = {
  targetFPS: 60,
  shadowMapSize: 1024,
  antialias: true,
  pixelRatio: Math.min(window.devicePixelRatio, 2),
  enableShadows: true,
  enablePostProcessing: false, // Can be enabled for higher-end devices
};
