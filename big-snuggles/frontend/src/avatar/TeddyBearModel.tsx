/**
 * Teddy Bear 3D Model Component
 * Procedural teddy bear created from Three.js primitives
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { avatarConfig, FacialExpression } from './avatar-config';

interface TeddyBearModelProps {
  expression: FacialExpression;
  isSpeaking: boolean;
  audioLevel: number;
  colorTint: string;
  bobOffset: number;
  isBlinking: boolean;
}

export const TeddyBearModel: React.FC<TeddyBearModelProps> = ({
  expression,
  isSpeaking,
  audioLevel,
  colorTint,
  bobOffset,
  isBlinking,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const jawRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);

  // Create materials with color tint
  const furMaterial = useMemo(() => {
    const baseColor = new THREE.Color(colorTint);
    return new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: avatarConfig.furRoughness,
      metalness: avatarConfig.furMetalness,
    });
  }, [colorTint]);

  const eyeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: avatarConfig.eyeColor,
        roughness: 0.2,
        metalness: 0.8,
        emissive: new THREE.Color(0x111111),
      }),
    []
  );

  const noseMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: avatarConfig.noseColor,
        roughness: 0.3,
        metalness: 0.5,
      }),
    []
  );

  // Animate based on facial expression and voice
  useFrame((state) => {
    if (!groupRef.current) return;

    // Apply bobbing offset
    groupRef.current.position.y = avatarConfig.position[1] + bobOffset;

    // Head rotation for speaking
    if (headRef.current && isSpeaking) {
      const time = state.clock.getElapsedTime();
      headRef.current.rotation.z = Math.sin(time * 8) * 0.05 * audioLevel;
    }

    // Jaw movement for lip-sync
    if (jawRef.current) {
      const targetJawOpen = isSpeaking ? expression.jawOpen * audioLevel : 0;
      jawRef.current.scale.y = THREE.MathUtils.lerp(
        jawRef.current.scale.y,
        1 + targetJawOpen * 0.3,
        0.2
      );
    }

    // Eye blinking
    if (leftEyeRef.current && rightEyeRef.current) {
      const blinkScale = isBlinking ? 0.1 : 1.0;
      leftEyeRef.current.scale.y = THREE.MathUtils.lerp(
        leftEyeRef.current.scale.y,
        blinkScale,
        0.3
      );
      rightEyeRef.current.scale.y = THREE.MathUtils.lerp(
        rightEyeRef.current.scale.y,
        blinkScale,
        0.3
      );
    }

    // Arm gestures when speaking
    if (leftArmRef.current && rightArmRef.current && isSpeaking) {
      const time = state.clock.getElapsedTime();
      leftArmRef.current.rotation.z = Math.sin(time * 3) * 0.3 + 0.3;
      rightArmRef.current.rotation.z = Math.cos(time * 3) * 0.3 - 0.3;
    } else if (leftArmRef.current && rightArmRef.current) {
      // Return to neutral
      leftArmRef.current.rotation.z = THREE.MathUtils.lerp(
        leftArmRef.current.rotation.z,
        0.2,
        0.05
      );
      rightArmRef.current.rotation.z = THREE.MathUtils.lerp(
        rightArmRef.current.rotation.z,
        -0.2,
        0.05
      );
    }
  });

  return (
    <group
      ref={groupRef}
      position={avatarConfig.position}
      scale={avatarConfig.scale}
      rotation={avatarConfig.rotation}
    >
      {/* Body */}
      <mesh position={avatarConfig.body.position} castShadow receiveShadow>
        <cylinderGeometry
          args={[
            avatarConfig.body.radiusTop,
            avatarConfig.body.radiusBottom,
            avatarConfig.body.height,
            32,
          ]}
        />
        <primitive object={furMaterial} attach="material" />
      </mesh>

      {/* Head */}
      <group ref={headRef} position={avatarConfig.head.position}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[avatarConfig.head.radius, 32, 32]} />
          <primitive object={furMaterial} attach="material" />
        </mesh>

        {/* Ears */}
        <mesh position={avatarConfig.ears.leftPosition} castShadow>
          <sphereGeometry args={[avatarConfig.ears.radius, 16, 16]} />
          <primitive object={furMaterial} attach="material" />
        </mesh>
        <mesh position={avatarConfig.ears.rightPosition} castShadow>
          <sphereGeometry args={[avatarConfig.ears.radius, 16, 16]} />
          <primitive object={furMaterial} attach="material" />
        </mesh>

        {/* Eyes */}
        <mesh ref={leftEyeRef} position={avatarConfig.eyes.leftPosition} castShadow>
          <sphereGeometry args={[avatarConfig.eyes.radius, 16, 16]} />
          <primitive object={eyeMaterial} attach="material" />
        </mesh>
        <mesh ref={rightEyeRef} position={avatarConfig.eyes.rightPosition} castShadow>
          <sphereGeometry args={[avatarConfig.eyes.radius, 16, 16]} />
          <primitive object={eyeMaterial} attach="material" />
        </mesh>

        {/* Nose */}
        <mesh position={avatarConfig.nose.position} castShadow>
          <sphereGeometry args={[avatarConfig.nose.radius, 16, 16]} />
          <primitive object={noseMaterial} attach="material" />
        </mesh>

        {/* Snout/Jaw (for mouth movement) */}
        <mesh ref={jawRef} position={[0, -0.1, 0.3]} castShadow>
          <sphereGeometry args={[0.2, 16, 16]} />
          <primitive object={furMaterial} attach="material" />
        </mesh>
      </group>

      {/* Left Arm */}
      <mesh
        ref={leftArmRef}
        position={avatarConfig.arms.leftPosition}
        rotation={[0, 0, 0.2]}
        castShadow
      >
        <cylinderGeometry args={[avatarConfig.arms.radius, avatarConfig.arms.radius, avatarConfig.arms.length, 16]} />
        <primitive object={furMaterial} attach="material" />
      </mesh>

      {/* Right Arm */}
      <mesh
        ref={rightArmRef}
        position={avatarConfig.arms.rightPosition}
        rotation={[0, 0, -0.2]}
        castShadow
      >
        <cylinderGeometry args={[avatarConfig.arms.radius, avatarConfig.arms.radius, avatarConfig.arms.length, 16]} />
        <primitive object={furMaterial} attach="material" />
      </mesh>

      {/* Left Leg */}
      <mesh position={avatarConfig.legs.leftPosition} castShadow receiveShadow>
        <cylinderGeometry args={[avatarConfig.legs.radius, avatarConfig.legs.radius, avatarConfig.legs.length, 16]} />
        <primitive object={furMaterial} attach="material" />
      </mesh>

      {/* Right Leg */}
      <mesh position={avatarConfig.legs.rightPosition} castShadow receiveShadow>
        <cylinderGeometry args={[avatarConfig.legs.radius, avatarConfig.legs.radius, avatarConfig.legs.length, 16]} />
        <primitive object={furMaterial} attach="material" />
      </mesh>
    </group>
  );
};
