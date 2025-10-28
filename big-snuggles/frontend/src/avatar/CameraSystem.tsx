/**
 * Camera and Lighting System
 * Dynamic camera controls and emotion-based lighting
 */

import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { cameraPresets, lightingPresets } from './avatar-config';

interface CameraSystemProps {
  emotionIntensity: number;
  currentEmotion: string;
  autoRotate?: boolean;
  enableControls?: boolean;
}

export const CameraSystem: React.FC<CameraSystemProps> = ({
  emotionIntensity,
  currentEmotion,
  autoRotate = false,
  enableControls = true,
}) => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const controlsRef = useRef<any>(null);

  // Get lighting preset based on emotion
  const getLightingForEmotion = (emotion: string) => {
    if (lightingPresets[emotion as keyof typeof lightingPresets]) {
      return lightingPresets[emotion as keyof typeof lightingPresets];
    }
    return lightingPresets.neutral;
  };

  const lighting = getLightingForEmotion(currentEmotion);

  // Animate camera based on emotion intensity
  useFrame((state) => {
    if (cameraRef.current && emotionIntensity > 0.7) {
      const time = state.clock.getElapsedTime();
      const shake = emotionIntensity * 0.02;
      cameraRef.current.position.x += Math.sin(time * 10) * shake;
      cameraRef.current.position.y += Math.cos(time * 10) * shake;
    }
  });

  return (
    <>
      {/* Main Camera */}
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        position={cameraPresets.default.position}
        fov={cameraPresets.default.fov}
      />

      {/* Orbit Controls for user interaction */}
      {enableControls && (
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          minDistance={2}
          maxDistance={8}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2}
          autoRotate={autoRotate}
          autoRotateSpeed={0.5}
          target={cameraPresets.default.lookAt}
        />
      )}

      {/* Ambient Light */}
      <ambientLight
        color={lighting.ambient.color}
        intensity={lighting.ambient.intensity}
      />

      {/* Main Directional Light */}
      <directionalLight
        position={lighting.directional.position}
        intensity={lighting.directional.intensity}
        color={lighting.directional.color}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {/* Rim Light for depth */}
      <pointLight
        position={lighting.rim.position}
        intensity={lighting.rim.intensity}
        color={lighting.rim.color}
        distance={10}
      />

      {/* Fill Light */}
      <pointLight
        position={[-3, 2, 3]}
        intensity={0.3}
        color={0xffffff}
      />
    </>
  );
};

/**
 * Environment Setup
 */
export const SceneEnvironment: React.FC = () => {
  return (
    <>
      {/* Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <shadowMaterial opacity={0.3} />
      </mesh>

      {/* Background */}
      <mesh position={[0, 0, -5]}>
        <planeGeometry args={[30, 30]} />
        <meshBasicMaterial color="#1a1a2e" />
      </mesh>

      {/* Fog for depth */}
      <fog attach="fog" args={['#1a1a2e', 5, 15]} />
    </>
  );
};

/**
 * Hook to manage camera presets
 */
export function useCameraPreset(presetName: keyof typeof cameraPresets) {
  const { camera } = useThree();

  React.useEffect(() => {
    const preset = cameraPresets[presetName];
    if (preset && camera) {
      camera.position.set(...preset.position);
      camera.lookAt(...preset.lookAt);
      if ('fov' in camera) {
        (camera as THREE.PerspectiveCamera).fov = preset.fov;
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
      }
    }
  }, [presetName, camera]);
}
