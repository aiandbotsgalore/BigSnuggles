/**
 * Gesture System
 * Manages body gestures and animations
 */

import { useEffect, useRef, useState } from 'react';
import { gestureLibrary } from './avatar-config';
import * as THREE from 'three';

export interface GestureAnimation {
  name: string;
  duration: number;
  keyframes: Array<{
    time: number;
    rotation?: THREE.Euler;
    position?: THREE.Vector3;
    scale?: THREE.Vector3;
  }>;
}

// Define gesture animations
const gestureAnimations: Record<string, GestureAnimation> = {
  // Gangster gestures
  point_finger: {
    name: 'point_finger',
    duration: 2000,
    keyframes: [
      { time: 0, rotation: new THREE.Euler(0, 0, -0.2) },
      { time: 0.5, rotation: new THREE.Euler(-0.5, 0, -1.0) },
      { time: 1.0, rotation: new THREE.Euler(0, 0, -0.2) },
    ],
  },
  cross_arms: {
    name: 'cross_arms',
    duration: 1500,
    keyframes: [
      { time: 0, rotation: new THREE.Euler(0, 0, 0.2) },
      { time: 1.0, rotation: new THREE.Euler(0.3, 0, 0.8) },
    ],
  },
  tough_stance: {
    name: 'tough_stance',
    duration: 2000,
    keyframes: [
      { time: 0, position: new THREE.Vector3(0, 0, 0) },
      { time: 0.5, position: new THREE.Vector3(0, -0.1, 0) },
      { time: 1.0, position: new THREE.Vector3(0, 0, 0) },
    ],
  },
  
  // Friendly gestures
  wave: {
    name: 'wave',
    duration: 2000,
    keyframes: [
      { time: 0, rotation: new THREE.Euler(0, 0, -0.2) },
      { time: 0.3, rotation: new THREE.Euler(-1.0, 0, -0.5) },
      { time: 0.6, rotation: new THREE.Euler(-1.2, 0, -0.3) },
      { time: 0.9, rotation: new THREE.Euler(-1.0, 0, -0.5) },
      { time: 1.0, rotation: new THREE.Euler(0, 0, -0.2) },
    ],
  },
  thumbs_up: {
    name: 'thumbs_up',
    duration: 1500,
    keyframes: [
      { time: 0, rotation: new THREE.Euler(0, 0, -0.2) },
      { time: 0.5, rotation: new THREE.Euler(-1.5, 0, 0) },
      { time: 1.0, rotation: new THREE.Euler(0, 0, -0.2) },
    ],
  },
  welcoming_arms: {
    name: 'welcoming_arms',
    duration: 2000,
    keyframes: [
      { time: 0, rotation: new THREE.Euler(0, 0, 0.2) },
      { time: 0.5, rotation: new THREE.Euler(0, 0, -1.5) },
      { time: 1.0, rotation: new THREE.Euler(0, 0, 0.2) },
    ],
  },
  
  // Playful gestures
  bounce: {
    name: 'bounce',
    duration: 1000,
    keyframes: [
      { time: 0, position: new THREE.Vector3(0, 0, 0) },
      { time: 0.3, position: new THREE.Vector3(0, 0.3, 0) },
      { time: 0.6, position: new THREE.Vector3(0, 0, 0) },
      { time: 0.8, position: new THREE.Vector3(0, 0.15, 0) },
      { time: 1.0, position: new THREE.Vector3(0, 0, 0) },
    ],
  },
  spin: {
    name: 'spin',
    duration: 1500,
    keyframes: [
      { time: 0, rotation: new THREE.Euler(0, 0, 0) },
      { time: 0.5, rotation: new THREE.Euler(0, Math.PI, 0) },
      { time: 1.0, rotation: new THREE.Euler(0, Math.PI * 2, 0) },
    ],
  },
  
  // Defensive gestures
  protective_stance: {
    name: 'protective_stance',
    duration: 1500,
    keyframes: [
      { time: 0, rotation: new THREE.Euler(0, 0, 0.2) },
      { time: 0.5, rotation: new THREE.Euler(0.3, 0, 0.5) },
      { time: 1.0, rotation: new THREE.Euler(0, 0, 0.2) },
    ],
  },
  
  // Default idle
  idle: {
    name: 'idle',
    duration: 3000,
    keyframes: [
      { time: 0, rotation: new THREE.Euler(0, 0, 0.2) },
      { time: 0.5, rotation: new THREE.Euler(0, 0.1, 0.2) },
      { time: 1.0, rotation: new THREE.Euler(0, 0, 0.2) },
    ],
  },
};

interface UseGestureReturn {
  leftArmRotation: THREE.Euler;
  rightArmRotation: THREE.Euler;
  bodyPosition: THREE.Vector3;
  bodyRotation: THREE.Euler;
  isAnimating: boolean;
}

export function useGesture(gestureName: string | null): UseGestureReturn {
  const [leftArmRotation, setLeftArmRotation] = useState(new THREE.Euler(0, 0, 0.2));
  const [rightArmRotation, setRightArmRotation] = useState(new THREE.Euler(0, 0, -0.2));
  const [bodyPosition, setBodyPosition] = useState(new THREE.Vector3(0, 0, 0));
  const [bodyRotation, setBodyRotation] = useState(new THREE.Euler(0, 0, 0));
  const [isAnimating, setIsAnimating] = useState(false);
  
  const animationStartTime = useRef<number>(0);
  const currentGesture = useRef<GestureAnimation | null>(null);

  useEffect(() => {
    if (!gestureName) {
      // Return to idle
      currentGesture.current = gestureAnimations.idle;
      animationStartTime.current = Date.now();
      setIsAnimating(false);
      return;
    }

    const gesture = gestureAnimations[gestureName];
    if (!gesture) return;

    currentGesture.current = gesture;
    animationStartTime.current = Date.now();
    setIsAnimating(true);
  }, [gestureName]);

  useEffect(() => {
    if (!currentGesture.current) return;

    let animationFrame: number;

    const animate = () => {
      const elapsed = Date.now() - animationStartTime.current;
      const progress = Math.min(elapsed / currentGesture.current!.duration, 1.0);

      // Find the current and next keyframes
      const keyframes = currentGesture.current!.keyframes;
      let currentFrame = keyframes[0];
      let nextFrame = keyframes[keyframes.length - 1];

      for (let i = 0; i < keyframes.length - 1; i++) {
        if (progress >= keyframes[i].time && progress < keyframes[i + 1].time) {
          currentFrame = keyframes[i];
          nextFrame = keyframes[i + 1];
          break;
        }
      }

      // Interpolate between keyframes
      const frameProgress =
        (progress - currentFrame.time) / (nextFrame.time - currentFrame.time);
      const eased = easeInOutQuad(frameProgress);

      // Apply rotations
      if (currentFrame.rotation && nextFrame.rotation) {
        const interpolatedRotation = new THREE.Euler().set(
          THREE.MathUtils.lerp(currentFrame.rotation.x, nextFrame.rotation.x, eased),
          THREE.MathUtils.lerp(currentFrame.rotation.y, nextFrame.rotation.y, eased),
          THREE.MathUtils.lerp(currentFrame.rotation.z, nextFrame.rotation.z, eased)
        );

        // Apply to both arms (can be customized per gesture)
        setLeftArmRotation(interpolatedRotation);
        setRightArmRotation(
          new THREE.Euler(
            interpolatedRotation.x,
            interpolatedRotation.y,
            -interpolatedRotation.z
          )
        );
        setBodyRotation(
          new THREE.Euler(
            interpolatedRotation.x * 0.2,
            interpolatedRotation.y,
            0
          )
        );
      }

      // Apply positions
      if (currentFrame.position && nextFrame.position) {
        const interpolatedPosition = new THREE.Vector3().lerpVectors(
          currentFrame.position,
          nextFrame.position,
          eased
        );
        setBodyPosition(interpolatedPosition);
      }

      if (progress < 1.0) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    animate();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [currentGesture.current, animationStartTime.current]);

  return {
    leftArmRotation,
    rightArmRotation,
    bodyPosition,
    bodyRotation,
    isAnimating,
  };
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Get random gesture from a category
 */
export function getRandomGesture(category: keyof typeof gestureLibrary): string {
  const gestures = gestureLibrary[category];
  return gestures[Math.floor(Math.random() * gestures.length)];
}
