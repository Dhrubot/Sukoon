// src/components/garden/TreeLeaf.tsx
//
// ╔══════════════════════════════════════════════════════════════════╗
// ║  TREE LEAF — v4                                                ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║                                                                ║
// ║  CRITICAL FIX: originX / originY changed from leaf.x/leaf.y   ║
// ║  to 0/0. The old values caused a DOUBLE TRANSLATION:          ║
// ║                                                                ║
// ║    transform = translate(x, y)                                 ║
// ║               × translate(originX, originY)                    ║
// ║               × rotate(angle)                                  ║
// ║               × translate(-originX, -originY)                  ║
// ║                                                                ║
// ║  With originX=139 originY=170 and rotation=25°, a child at    ║
// ║  (0,0) was rendered at (224, 127) instead of (139, 170).      ║
// ║  With rotation near 0° the error was negligible, explaining   ║
// ║  why exactly 2 leaves (those with near-zero rotation) were    ║
// ║  visible while the other 7 were thrown offscreen.             ║
// ║                                                                ║
// ║  FIX 2: bloomOpacity init was bitwise OR (|) not numeric.     ║
// ║  0.95 | 0.45 = 0 in JavaScript.                               ║
// ║                                                                ║
// ╚══════════════════════════════════════════════════════════════════╝

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
  leafSizeMultiplier,
  ageSizeMultiplier,
  ageAdjustedColor,
} from '../../constants/tubaTree';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface TreeLeafProps {
  leaf: TreeLeafData;
  color: string;
  bloomGlowColor: string;
  branchIndex: number;
  leafIndex: number;
  growthG: number;
  onPress?: (leaf: TreeLeafData) => void;
}

const TreeLeaf: React.FC<TreeLeafProps> = ({
  leaf,
  color,
  bloomGlowColor,
  branchIndex,
  leafIndex,
  growthG,
  onPress,
}) => {
  const baseSize = LEAF_SIZES[leaf.growthStage];
  const sizeScale = leafSizeMultiplier(growthG);
  const ageScale = ageSizeMultiplier(leaf.ageFraction);
  const size = { rx: baseSize.rx * sizeScale * ageScale, ry: baseSize.ry * sizeScale * ageScale };

  // Age-adjusted leaf color: youngest (tip) lighter, oldest (base) deeper
  const leafColor = useMemo(
    () => ageAdjustedColor(color, leaf.ageFraction),
    [color, leaf.ageFraction],
  );

  // ── Entry animation ────────────────────────────────────────────
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

  // ── Bloom pulse ────────────────────────────────────────────────
  // FIX: Was `useSharedValue(BLOOM_PULSE.maxOpacity | BLOOM_PULSE.minOpacity)`
  //      Bitwise OR on floats: 0.95 | 0.45 = 0. Must be plain number.
  const bloomOpacity = useSharedValue(BLOOM_PULSE.maxOpacity as number);

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
      // ═══════════════════════════════════════════════════════════
      // CRITICAL FIX (v4):
      // originX/originY MUST be 0 — rotation around local center.
      //
      // G's x/y already positions the group at (leaf.x, leaf.y).
      // Setting originX/Y to leaf.x/leaf.y caused the rotation
      // pivot to be (leaf.x, leaf.y) in PARENT space, which when
      // combined with the translation created:
      //   translate(139,170) × rotate_around(139,170) → double offset
      //
      // With origin at (0,0), rotation pivots at the leaf center:
      //   translate(139,170) × rotate_around(0,0) → correct position
      // ═══════════════════════════════════════════════════════════
      originX={0}
      originY={0}
    >
      {/* Main leaf body */}
      <AnimatedEllipse
        cx={0}
        cy={0}
        fill={leafColor}
        animatedProps={leafAnimatedProps}
      />

      {/* Gold bloom sparkle */}
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

      {/* Touch target */}
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