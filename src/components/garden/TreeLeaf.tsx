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
  Easing,
} from 'react-native-reanimated';
import { TreeLeafData } from '../../types/tubaTree';
import {
  LEAF_SIZES,
  LEAF_ENTRY,
  LEAF_DETAIL,
  ageSizeMultiplier,
  ageAdjustedColor,
} from '../../constants/tubaTree';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

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
  branchIndex,
  leafIndex,
  growthG,
  onPress,
}) => {
  const baseSize = LEAF_SIZES.sprout;
  const sizeScale = 0.92 + growthG * 0.08;
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
