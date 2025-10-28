/**
 * Facial Expression System
 * Manages smooth transitions between facial expressions
 */

import { useEffect, useState, useRef } from 'react';
import { facialExpressions, FacialExpression } from './avatar-config';
import * as THREE from 'three';

interface UseFacialExpressionReturn {
  currentExpression: FacialExpression;
  transitionProgress: number;
}

export function useFacialExpression(
  targetExpressionName: string,
  transitionTime: number = 0.5
): UseFacialExpressionReturn {
  const [currentExpression, setCurrentExpression] = useState<FacialExpression>(
    facialExpressions.neutral
  );
  const [transitionProgress, setTransitionProgress] = useState(1);
  
  const previousExpression = useRef<FacialExpression>(facialExpressions.neutral);
  const targetExpression = useRef<FacialExpression>(facialExpressions.neutral);
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    const newTarget = facialExpressions[targetExpressionName] || facialExpressions.neutral;
    
    // Don't restart transition if already at target
    if (JSON.stringify(newTarget) === JSON.stringify(targetExpression.current)) {
      return;
    }

    previousExpression.current = currentExpression;
    targetExpression.current = newTarget;
    startTime.current = Date.now();
    setTransitionProgress(0);
  }, [targetExpressionName]);

  useEffect(() => {
    if (transitionProgress >= 1) return;

    const animationFrame = requestAnimationFrame(() => {
      const elapsed = (Date.now() - startTime.current) / 1000;
      const progress = Math.min(elapsed / transitionTime, 1);
      
      setTransitionProgress(progress);

      // Smooth interpolation using easeInOutCubic
      const eased = easeInOutCubic(progress);

      // Interpolate between previous and target expressions
      const interpolated: FacialExpression = {
        jawOpen: THREE.MathUtils.lerp(
          previousExpression.current.jawOpen,
          targetExpression.current.jawOpen,
          eased
        ),
        lipSync: THREE.MathUtils.lerp(
          previousExpression.current.lipSync,
          targetExpression.current.lipSync,
          eased
        ),
        eyeBlink: THREE.MathUtils.lerp(
          previousExpression.current.eyeBlink,
          targetExpression.current.eyeBlink,
          eased
        ),
        eyebrowRaise: THREE.MathUtils.lerp(
          previousExpression.current.eyebrowRaise,
          targetExpression.current.eyebrowRaise,
          eased
        ),
        mouthSmile: THREE.MathUtils.lerp(
          previousExpression.current.mouthSmile,
          targetExpression.current.mouthSmile,
          eased
        ),
      };

      setCurrentExpression(interpolated);
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [transitionProgress, transitionTime]);

  return {
    currentExpression,
    transitionProgress,
  };
}

/**
 * Easing function for smooth transitions
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Blend multiple expressions with weights
 */
export function blendExpressions(
  expressions: Array<{ expression: FacialExpression; weight: number }>
): FacialExpression {
  const result: FacialExpression = {
    jawOpen: 0,
    lipSync: 0,
    eyeBlink: 0,
    eyebrowRaise: 0,
    mouthSmile: 0,
  };

  const totalWeight = expressions.reduce((sum, e) => sum + e.weight, 0);

  expressions.forEach(({ expression, weight }) => {
    const normalizedWeight = weight / totalWeight;
    result.jawOpen += expression.jawOpen * normalizedWeight;
    result.lipSync += expression.lipSync * normalizedWeight;
    result.eyeBlink += expression.eyeBlink * normalizedWeight;
    result.eyebrowRaise += expression.eyebrowRaise * normalizedWeight;
    result.mouthSmile += expression.mouthSmile * normalizedWeight;
  });

  return result;
}
