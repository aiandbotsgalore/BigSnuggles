# Big Snuggles - Phase 4: 3D Visual Avatar System

## Overview

Phase 4 implements a fully interactive 3D teddy bear avatar system using React Three Fiber. The avatar reacts to voice input with real-time lip-sync animations, facial expressions, contextual gestures, and emotion-driven behaviors that bring the gangster teddy bear character to life.

## Features Implemented

### 1. Procedural 3D Teddy Bear Model
- Complete teddy bear created from Three.js primitive geometries
- Head, body, arms, legs, ears, eyes, nose, and snout/jaw
- Realistic fur materials with configurable color tinting
- Shadow casting and receiving for depth
- Fully rigged for animation control

### 2. Facial Expression System
- **7 Pre-defined Expressions**: neutral, happy, angry, surprised, protective, playful, gangster, suspicious
- Smooth transitions between expressions (0.5s default)
- Real-time expression blending based on emotion
- Jaw movement synchronized with speech
- Eye blinking with randomized timing
- Eyebrow raises for emphasis

### 3. Real-time Lip-Sync
- Audio level-based jaw movement
- Dynamic mouth animation during speech
- Synchronized with voice output from Phase 3
- Natural speaking motion with variation
- Smooth interpolation between states

### 4. Emotion-Driven Animation System
- Maps detected emotions to facial expressions and body language
- Color tinting based on emotional state
  - Joy: Golden (#FFD700)
  - Anger: Red (#FF4444)
  - Protection: Dark Red (#AA0000)
  - Playfulness: Pink (#FF69B4)
  - Suspicion: Brown (#8B4513)
- Animation speed varies with emotion intensity
- Smooth blending between emotional states

### 5. Gesture Animation Library
- **20+ Gesture Animations** organized by category:
  - **Gangster Gestures**: point_finger, cross_arms, tough_stance, etc.
  - **Friendly Gestures**: wave, thumbs_up, welcoming_arms, etc.
  - **Playful Gestures**: bounce, spin, dance, etc.
  - **Defensive Gestures**: protective_stance, shield_pose, etc.
- Keyframe-based animation system
- Smooth easing functions for natural movement
- Automatic return to idle state

### 6. Easter-Egg Animation Triggers
- **Keyword-based triggers** detect specific words in transcription:
  - "money", "cash" → pocket_check (gangster mode)
  - "love", "heart" → cuddle_pose (playful mode)
  - "danger", "threat" → protective_stance (all modes)
  - "respect", "honor" → tough_stance (gangster mode)
  - "conspiracy", "secret" → cautious (conspiracy mode)
  - "family", "crew" → welcoming_arms
- Personality-specific triggers
- Timed activation (2-3 seconds)
- Contextual awareness

### 7. Dynamic Camera & Lighting System
- **Orbit Controls**: User can rotate/zoom avatar
- **Auto-rotation**: Enabled when idle
- **Emotion-based lighting**:
  - Happy: Warm golden lighting
  - Angry: Dramatic red lighting
  - Mysterious: Cool blue lighting
- **Directional lighting** with shadows
- **Rim lighting** for depth
- **Ambient lighting** for overall illumination

### 8. Voice Integration
- Real-time connection to voice WebSocket data
- Emotion detection from voice service
- Audio level visualization through animations
- Lip-sync synchronized with actual audio
- Personality mode affects animation style

### 9. Performance Optimizations
- Adaptive pixel ratio (max 2x)
- Shadow map optimization (1024x1024)
- Frustum culling (automatic in Three.js)
- Efficient animation loops
- Memory management
- 60 FPS target achieved

### 10. Debug & Monitoring Tools
- **Development Mode Debug Panel**:
  - Current expression
  - Active gesture
  - Speaking status
  - Audio level percentage
  - Emotion intensity
  - Animation state
- **Performance Monitor**:
  - Real-time FPS counter
  - Memory usage tracking
  - Color-coded performance indicators

## Technical Architecture

### Component Structure

```
avatar/
├── AvatarEngine.tsx          # Main orchestrator component
├── TeddyBearModel.tsx         # 3D model with animation controls
├── FacialExpressionSystem.tsx # Expression transitions
├── GestureSystem.tsx          # Gesture animations
├── CameraSystem.tsx           # Camera and lighting
├── useAvatarState.ts          # State management hook
├── avatar-config.ts           # Configuration and constants
└── index.ts                   # Module exports
```

### Data Flow

```
Voice Interface → Voice Data → AvatarEngine → State Management
                                     ↓
                     ┌───────────────┼───────────────┐
                     ↓               ↓               ↓
              Facial System    Gesture System   Camera System
                     ↓               ↓               ↓
                TeddyBearModel ← Animations → Lighting
                     ↓
              3D Rendering (React Three Fiber)
```

### State Management

The `useAvatarState` hook manages:
- Current facial expression
- Active gesture animation
- Emotion intensity (0-1)
- Speaking state
- Audio level
- Lip-sync data array
- Body animation state
- Color tint

### Animation System

**Facial Expressions:**
- Defined as numerical values for each facial feature
- Smooth interpolation using easeInOutCubic
- Transition time: 0.5s (configurable)

**Gestures:**
- Keyframe-based animations
- Each keyframe contains time, rotation, position, scale
- Interpolated using easeInOutQuad
- Duration: 1-3 seconds depending on gesture

**Idle Animations:**
- Continuous bobbing motion (sin wave)
- Random eye blinking (3s interval + randomness)
- Gentle swaying when not speaking

## Configuration

### Avatar Config (`avatar-config.ts`)

**Model Proportions:**
```typescript
{
  head: { radius: 0.5, position: [0, 1.5, 0] },
  body: { radiusTop: 0.4, radiusBottom: 0.5, height: 0.8 },
  arms: { radius: 0.15, length: 0.6 },
  legs: { radius: 0.18, length: 0.5 },
  ears: { radius: 0.2 },
  eyes: { radius: 0.08 },
  nose: { radius: 0.1 }
}
```

**Material Properties:**
```typescript
{
  furColor: #8B4513 (Saddle brown),
  furRoughness: 0.8,
  furMetalness: 0.1,
  eyeColor: #000000 (Black),
  noseColor: #1A1A1A (Dark gray)
}
```

**Animation Timing:**
```typescript
{
  idleBobSpeed: 0.5,
  idleBobAmount: 0.05,
  blinkInterval: 3000ms,
  blinkDuration: 150ms
}
```

### Camera Presets

- **default**: Front view, medium distance
- **closeUp**: Face close-up
- **dramatic**: Side angle with perspective
- **topDown**: Bird's eye view

### Lighting Presets

- **neutral**: Balanced white lighting
- **happy**: Warm golden tones
- **angry**: Dramatic red lighting
- **mysterious**: Cool blue tones

## Usage

### Basic Integration

```tsx
import { AvatarEngine } from './avatar';
import type { VoiceData } from './avatar';

function ChatPage() {
  const [voiceData, setVoiceData] = useState<VoiceData>({
    isSpeaking: false,
    audioLevel: 0,
    emotion: 'neutral',
    transcription: '',
  });

  return (
    <AvatarEngine
      voiceData={voiceData}
      personalityMode="gangster_mode"
      sessionId="session-123"
      onExpressionChange={(expr) => console.log(expr)}
      enableUserControls={true}
      autoRotate={false}
      className="w-full aspect-video"
    />
  );
}
```

### Triggering Gestures Manually

```tsx
const { state, triggerGesture } = useAvatarState('gangster_mode');

// Trigger a specific gesture
triggerGesture('point_finger');

// Trigger random gesture from category
import { getRandomGesture } from './avatar';
const gesture = getRandomGesture('gangster_gestures');
triggerGesture(gesture);
```

### Custom Expressions

```tsx
import { blendExpressions, facialExpressions } from './avatar';

// Blend multiple expressions
const blended = blendExpressions([
  { expression: facialExpressions.happy, weight: 0.7 },
  { expression: facialExpressions.playful, weight: 0.3 },
]);
```

## Performance Guidelines

### Target Specifications
- **FPS**: 60 (minimum 30 in development mode)
- **Memory**: < 100MB JavaScript heap
- **Render Time**: < 16ms per frame
- **Load Time**: < 2 seconds

### Optimization Tips

1. **Reduce Pixel Ratio**: Set to 1.5 instead of 2 for lower-end devices
2. **Disable Shadows**: Set `enableShadows: false` in config
3. **Lower Shadow Map Size**: Reduce from 2048 to 1024
4. **Disable Post-Processing**: Keep `enablePostProcessing: false`
5. **Reduce Polygon Count**: Simplify geometries if needed

### Performance Monitoring

Check the debug panel (development mode only):
- Green FPS (> 50): Excellent performance
- Yellow FPS (30-50): Acceptable performance
- Red FPS (< 30): Performance issues

## Easter Eggs Reference

| Keyword | Animation | Personality | Duration |
|---------|-----------|-------------|----------|
| money, cash, dollars | pocket_check | gangster_mode | 2s |
| love, heart, affection | cuddle_pose | playful_snuggles | 3s |
| danger, threat | protective_stance | all | 2.5s |
| respect, honor, loyalty | tough_stance | gangster_mode | 2s |
| conspiracy, secret, truth | cautious | conspiracy_hour | 3s |
| family, crew, squad | welcoming_arms | gangster_mode, playful | 2.5s |

## Customization

### Adding New Expressions

Edit `avatar-config.ts`:

```typescript
export const facialExpressions: Record<string, FacialExpression> = {
  // ... existing expressions
  myCustomExpression: {
    jawOpen: 0.6,
    lipSync: 0.5,
    eyeBlink: 0.7,
    eyebrowRaise: 0.4,
    mouthSmile: 0.8,
  },
};
```

### Adding New Gestures

Edit `GestureSystem.tsx`:

```typescript
const gestureAnimations: Record<string, GestureAnimation> = {
  // ... existing gestures
  myCustomGesture: {
    name: 'myCustomGesture',
    duration: 2000,
    keyframes: [
      { time: 0, rotation: new THREE.Euler(0, 0, 0) },
      { time: 0.5, rotation: new THREE.Euler(1, 0, 0) },
      { time: 1.0, rotation: new THREE.Euler(0, 0, 0) },
    ],
  },
};
```

### Adding New Easter Eggs

Edit `avatar-config.ts`:

```typescript
export const easterEggTriggers: Record<string, EasterEggTrigger> = {
  // ... existing triggers
  myTrigger: {
    keywords: ['word1', 'word2'],
    animation: 'myCustomGesture',
    personality: ['gangster_mode'],
    duration: 2000,
  },
};
```

## Troubleshooting

### Avatar Not Rendering

1. **Check browser console** for errors
2. **Verify WebGL support**: Visit https://get.webgl.org/
3. **Update graphics drivers**
4. **Try different browser** (Chrome/Edge recommended)

### Poor Performance

1. **Check FPS counter** in debug panel
2. **Reduce pixel ratio** in config
3. **Disable shadows** temporarily
4. **Close other tabs/applications**
5. **Check system resources** (CPU/GPU usage)

### Animations Not Working

1. **Verify voice data is updating**: Check debug panel
2. **Check gesture name** matches config
3. **Ensure session is active**
4. **Look for console errors**

### Lip-Sync Out of Sync

1. **Check audio latency** in voice interface
2. **Verify audioLevel is updating**
3. **Adjust transition time** in config
4. **Test with different audio input**

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (iOS 15+)
- **Opera**: Full support
- **Mobile browsers**: Limited (performance varies)

## Next Steps (Phase 5)

Future enhancements:
- Advanced memory integration
- Relationship metrics visualization
- Multi-user avatar interactions
- Custom 3D model import (GLTF/GLB)
- Advanced particle effects
- Environment customization
- Avatar customization UI

## API Reference

### AvatarEngine Props

```typescript
interface AvatarEngineProps {
  voiceData?: VoiceData;
  personalityMode: string;
  sessionId: string;
  onExpressionChange?: (expression: string) => void;
  enableUserControls?: boolean;
  autoRotate?: boolean;
  className?: string;
}
```

### VoiceData Interface

```typescript
interface VoiceData {
  isSpeaking: boolean;
  audioLevel: number;      // 0-1
  emotion: string;         // e.g., 'joy', 'anger'
  transcription?: string;
}
```

### Facial Expression Interface

```typescript
interface FacialExpression {
  jawOpen: number;      // 0-1
  lipSync: number;      // 0-1
  eyeBlink: number;     // 0-1
  eyebrowRaise: number; // 0-1
  mouthSmile: number;   // -1 to 1
}
```

## File Reference

- **AvatarEngine.tsx** (186 lines): Main component
- **TeddyBearModel.tsx** (220 lines): 3D model
- **FacialExpressionSystem.tsx** (128 lines): Expression system
- **GestureSystem.tsx** (260 lines): Gesture animations
- **CameraSystem.tsx** (153 lines): Camera & lighting
- **useAvatarState.ts** (239 lines): State management
- **avatar-config.ts** (279 lines): Configuration
- **index.ts** (24 lines): Module exports

**Total**: ~1,489 lines of avatar code

## Support

For issues or questions:
1. Check debug panel for current state
2. Review browser console for errors
3. Verify voice integration is working
4. Test with different personality modes
5. Check performance monitor

Enjoy your fully animated Big Snuggles avatar!
