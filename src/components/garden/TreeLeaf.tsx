// src/components/garden/TreeLeaf.tsx
//
// Phase 3: Adds onPress callback for leaf detail interaction.
// An invisible, larger Circle serves as the touch hit target.
// Entry animation + bloom pulse unchanged from Phase 2.

import React, { useEffect, useMemo } from 'react';
import { G, Ellipse, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withDelay,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { TreeLeafData } from '../../types/tubaTree';
import {
  LEAF_SIZES,
  BLOOM_SPARKLE,
  LEAF_ENTRY,
  BLOOM_PULSE,
  LEAF_DETAIL,
} from '../../constants/tubaTree';

// Create animated SVG components once at module level
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface TreeLeafProps {
  leaf: TreeLeafData;
  /** Prayer color from theme.colors.prayer */
  color: string;
  /** Bloom glow color from theme.colors.garden.bloomGlow */
  bloomGlowColor: string;
  /** Branch index (0–4) for stagger calculation */
  branchIndex: number;
  /** Leaf index within its branch for stagger calculation */
  leafIndex: number;
  /** Called when user taps this leaf */
  onPress?: (leaf: TreeLeafData) => void;
}

const TreeLeaf: React.FC<TreeLeafProps> = ({
  leaf,
  color,
  bloomGlowColor,
  branchIndex,
  leafIndex,
  onPress,
}) => {
  const size = LEAF_SIZES[leaf.growthStage];

  // ── Entry animation shared values ──────────────────────────────
  const entryProgress = useSharedValue(0);

  const entryDelay = useMemo(
    () =>
      LEAF_ENTRY.baseDelay +
      branchIndex * LEAF_ENTRY.staggerPerBranch +
      leafIndex * LEAF_ENTRY.staggerPerLeaf,
    [branchIndex, leafIndex],
  );

  useEffect(() => {
    entryProgress.value = withDelay(
      entryDelay,
      withTiming(1, {
        duration: LEAF_ENTRY.duration,
        easing: Easing.out(Easing.bezierFn(0.34, 1.56, 0.64, 1)),
      }),
    );
  }, []);

  const leafAnimatedProps = useAnimatedProps(() => ({
    rx: size.rx * entryProgress.value,
    ry: size.ry * entryProgress.value,
    opacity: leaf.opacity * entryProgress.value,
  }));

  // ── Bloom pulse animation ──────────────────────────────────────
  const bloomOpacity = useSharedValue(BLOOM_PULSE.maxOpacity | BLOOM_PULSE.minOpacity);

  useEffect(() => {
    if (!leaf.isBloom) return;

    const pulseDelay = entryDelay + LEAF_ENTRY.duration;
    const halfDuration = BLOOM_PULSE.duration / 2;
    const easing = Easing.inOut(Easing.sin);

    bloomOpacity.value = withDelay(
      pulseDelay,
      withRepeat(
        withSequence(
          withTiming(BLOOM_PULSE.minOpacity, { duration: halfDuration, easing }),
          withTiming(BLOOM_PULSE.maxOpacity, { duration: halfDuration, easing }),
        ),
        -1,
        false,
      ),
    );
  }, [leaf.isBloom]);

  const bloomAnimatedProps = useAnimatedProps(() => ({
    opacity: bloomOpacity.value,
  }));

  const sparkleOffsetX = -size.rx * BLOOM_SPARKLE.offsetRatio;
  const sparkleOffsetY = -size.ry * BLOOM_SPARKLE.offsetRatio;

  const handlePress = () => {
    onPress?.(leaf);
  };

  return (
    <G
      x={leaf.x}
      y={leaf.y}
      rotation={leaf.rotation}
      originX={leaf.x}
      originY={leaf.y}
    >
      {/* Main leaf body — animated entry */}
      <AnimatedEllipse
        cx={0}
        cy={0}
        fill={color}
        animatedProps={leafAnimatedProps}
      />

      {/* Gold bloom sparkle — pulsing */}
      {leaf.isBloom && (
        <AnimatedCircle
          cx={sparkleOffsetX}
          cy={sparkleOffsetY}
          r={BLOOM_SPARKLE.radius * 1.2}
          fill={bloomGlowColor}
          animatedProps={bloomAnimatedProps}
        />
      )}

      {/* Reflection text indicator */}
      {leaf.hasText && (
        <Circle
          cx={0}
          cy={0}
          r={1.2}
          fill="#ffffff"
          opacity={0.6}
        />
      )}

      {/* Invisible touch hit target — larger than the visual leaf */}
      {onPress && (
        <Circle
          cx={0}
          cy={0}
          r={LEAF_DETAIL.hitRadius}
          fill="transparent"
          onPress={handlePress}
        />
      )}
    </G>
  );
};

export default React.memo(TreeLeaf);