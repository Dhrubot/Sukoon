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
import { G, Ellipse, Circle, Path } from 'react-native-svg';
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
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function blendHex(baseColor: string, targetColor: string, ratio: number): string {
  const parse = (hex: string) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  });

  const clamp = Math.max(0, Math.min(1, ratio));
  const from = parse(baseColor);
  const to = parse(targetColor);
  const channel = (a: number, b: number) => Math.round(a + (b - a) * clamp);

  return `#${channel(from.r, to.r).toString(16).padStart(2, '0')}${channel(from.g, to.g).toString(16).padStart(2, '0')}${channel(from.b, to.b).toString(16).padStart(2, '0')}`;
}

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
  const renderKindScale = leaf.renderKind === 'cluster'
    ? 0.82
    : leaf.renderKind === 'bud'
      ? 0.72
      : leaf.renderKind === 'paired'
        ? 1.00
        : leaf.renderKind === 'cotyledon'
          ? 1.16
          : 1;
  const sizeScale = 0.98 + growthG * 0.12;
  const ageScale = ageSizeMultiplier(leaf.ageFraction);
  const size = {
    rx: baseSize.rx * sizeScale * ageScale * renderKindScale,
    ry: baseSize.ry * sizeScale * ageScale * renderKindScale,
  };
  const isCotyledon = leaf.renderKind === 'cotyledon';
  const isPaired = leaf.renderKind === 'paired';
  const isTipBud = (leaf.ageFraction <= 0.14 && leaf.growthStage !== 'bloom') || leaf.renderKind === 'bud';
  const isCluster = leaf.renderKind === 'cluster';
  const isSeedlike = (leaf.growthStage === 'seed' || isTipBud) && !isCotyledon && !isPaired;

  // Age-adjusted leaf color: youngest (tip) lighter, oldest (base) deeper
  const leafColor = useMemo(
    () => ageAdjustedColor(color, leaf.ageFraction),
    [color, leaf.ageFraction],
  );

  const renderedLeafColor = useMemo(() => {
    let resolved = leafColor;

    if (leaf.renderKind === 'cotyledon') {
      resolved = blendHex(resolved, '#a6bc92', 0.22);
    } else if (leaf.renderKind === 'paired') {
      resolved = blendHex(resolved, '#9eb88c', 0.12);
    } else if (leaf.renderKind === 'cluster') {
      resolved = blendHex(resolved, '#98b487', 0.12);
    } else if (leaf.renderKind === 'bud') {
      resolved = blendHex(resolved, '#93aa84', 0.16);
    }

    if (leaf.hueVariant === 'sage') {
      resolved = blendHex(resolved, '#a5c39a', 0.14);
    } else if (leaf.hueVariant === 'olive') {
      resolved = blendHex(resolved, '#8da45e', 0.16);
    } else if (leaf.hueVariant === 'amber') {
      resolved = blendHex(resolved, '#c1b866', 0.12);
    }

    if (leaf.tone === 'aged') {
      resolved = blendHex(resolved, '#4f5f34', 0.18);
    }

    if (leaf.renderKind === 'leaf' && leaf.ageFraction > 0.18) {
      const canopyBlend = Math.min(0.24, (leaf.ageFraction - 0.18) * 0.32);
      const blendTarget = leaf.prayer === 'Asr' || leaf.prayer === 'Dhuhr'
        ? '#a8b48f'
        : '#a1aec4';
      resolved = blendHex(resolved, blendTarget, canopyBlend);
    }

    return resolved;
  }, [leaf.hueVariant, leaf.tone, leafColor]);

  const veinColor = leaf.tone === 'aged'
    ? 'rgba(255,244,214,0.18)'
    : 'rgba(255,255,255,0.22)';

  const leafBodyPath = useMemo(() => {
    const rx = size.rx;
    const ry = size.ry;

    if (isCotyledon) {
      return [
        `M 0 ${(-ry * 0.82).toFixed(1)}`,
        `C ${(rx * 1.1).toFixed(1)} ${(-ry * 0.72).toFixed(1)} ${(rx * 1.1).toFixed(1)} ${(ry * 0.25).toFixed(1)} ${(rx * 0.2).toFixed(1)} ${(ry * 0.9).toFixed(1)}`,
        `C ${(-rx * 0.95).toFixed(1)} ${(ry * 0.52).toFixed(1)} ${(-rx * 1.02).toFixed(1)} ${(-ry * 0.15).toFixed(1)} 0 ${(-ry * 0.82).toFixed(1)}`,
        'Z',
      ].join(' ');
    }

    if (isSeedlike) {
      return [
        `M 0 ${(-ry * 0.95).toFixed(1)}`,
        `C ${(rx * 0.75).toFixed(1)} ${(-ry * 0.9).toFixed(1)} ${(rx * 0.95).toFixed(1)} ${(-ry * 0.1).toFixed(1)} ${(rx * 0.4).toFixed(1)} ${(ry * 0.65).toFixed(1)}`,
        `C ${(rx * 0.1).toFixed(1)} ${(ry * 0.92).toFixed(1)} ${(-rx * 0.1).toFixed(1)} ${(ry * 0.92).toFixed(1)} ${(-rx * 0.4).toFixed(1)} ${(ry * 0.65).toFixed(1)}`,
        `C ${(-rx * 0.95).toFixed(1)} ${(-ry * 0.1).toFixed(1)} ${(-rx * 0.75).toFixed(1)} ${(-ry * 0.9).toFixed(1)} 0 ${(-ry * 0.95).toFixed(1)}`,
        'Z',
      ].join(' ');
    }

    const shoulder = leaf.growthStage === 'bloom' ? 1.05 : 0.9;
    const waist = leaf.growthStage === 'bloom' ? 0.62 : 0.5;
    const tail = leaf.growthStage === 'bloom' ? 0.9 : 0.82;

    return [
      `M 0 ${(-ry * 1.15).toFixed(1)}`,
      `C ${(rx * shoulder).toFixed(1)} ${(-ry * 0.95).toFixed(1)} ${(rx * 1.08).toFixed(1)} ${(-ry * 0.08).toFixed(1)} ${(rx * waist).toFixed(1)} ${(ry * tail).toFixed(1)}`,
      `C ${(rx * 0.22).toFixed(1)} ${(ry * 1.02).toFixed(1)} ${(-rx * 0.22).toFixed(1)} ${(ry * 1.02).toFixed(1)} ${(-rx * waist).toFixed(1)} ${(ry * tail).toFixed(1)}`,
      `C ${(-rx * 1.08).toFixed(1)} ${(-ry * 0.08).toFixed(1)} ${(-rx * shoulder).toFixed(1)} ${(-ry * 0.95).toFixed(1)} 0 ${(-ry * 1.15).toFixed(1)}`,
      'Z',
    ].join(' ');
  }, [size.rx, size.ry, leaf.growthStage, isSeedlike, isCotyledon]);

  const veinPath = useMemo(() => {
    const veinTop = -size.ry * (isSeedlike ? 0.6 : 0.9);
    const veinBottom = size.ry * (isSeedlike ? 0.55 : 0.82);
    return `M 0 ${veinTop.toFixed(1)} Q ${(size.rx * 0.08).toFixed(1)} ${(size.ry * 0.05).toFixed(1)} 0 ${veinBottom.toFixed(1)}`;
  }, [size.rx, size.ry, isSeedlike]);

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

  const bloomAnimatedProps = useAnimatedProps(() => ({
    rx: size.rx * 1.24 * entryProgress.value,
    ry: size.ry * 1.18 * entryProgress.value,
    opacity: leaf.opacity * 0.12 * entryProgress.value,
  }));

  const detailAnimatedProps = useAnimatedProps(() => ({
    opacity: leaf.opacity * entryProgress.value,
  }));

  const budHighlightAnimatedProps = useAnimatedProps(() => ({
    r: size.rx * 0.26 * entryProgress.value,
    opacity: leaf.opacity * 0.24 * entryProgress.value,
  }));

  const rimHighlightAnimatedProps = useAnimatedProps(() => ({
    opacity: leaf.opacity * (leaf.ageFraction < 0.22 ? 0.22 : leaf.ageFraction < 0.48 ? 0.14 : 0.08) * entryProgress.value,
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
      {leaf.isBloom && leaf.renderKind === 'leaf' && (
        <AnimatedEllipse
          cx={0}
          cy={0}
          fill={bloomGlowColor}
          animatedProps={bloomAnimatedProps}
        />
      )}
      {/* Main leaf body */}
      {isCluster ? (
        <>
          <AnimatedEllipse
            cx={-size.rx * 0.56}
            cy={-size.ry * 0.18}
            rx={size.rx * 0.48}
            ry={size.ry * 0.6}
            fill={renderedLeafColor}
            animatedProps={detailAnimatedProps}
          />
          <AnimatedEllipse
            cx={size.rx * 0.46}
            cy={-size.ry * 0.02}
            rx={size.rx * 0.44}
            ry={size.ry * 0.56}
            fill={renderedLeafColor}
            animatedProps={detailAnimatedProps}
          />
          <AnimatedEllipse
            cx={0}
            cy={size.ry * 0.34}
            rx={size.rx * 0.38}
            ry={size.ry * 0.5}
            fill={renderedLeafColor}
            animatedProps={detailAnimatedProps}
          />
          <AnimatedPath
            d={`M 0 ${(-size.ry * 0.12).toFixed(1)} Q ${(size.rx * 0.05).toFixed(1)} ${(size.ry * 0.16).toFixed(1)} 0 ${(size.ry * 0.72).toFixed(1)}`}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth={Math.max(0.45, size.rx * 0.12)}
            strokeLinecap="round"
            fill="none"
            animatedProps={detailAnimatedProps}
          />
        </>
      ) : isPaired ? (
        <>
          <AnimatedEllipse
            cx={-size.rx * 0.52}
            cy={-size.ry * 0.18}
            rx={size.rx * 0.48}
            ry={size.ry * 0.72}
            rotation={-14}
            fill={renderedLeafColor}
            animatedProps={detailAnimatedProps}
          />
          <AnimatedEllipse
            cx={size.rx * 0.48}
            cy={size.ry * 0.02}
            rx={size.rx * 0.44}
            ry={size.ry * 0.68}
            rotation={16}
            fill={renderedLeafColor}
            animatedProps={detailAnimatedProps}
          />
          <AnimatedPath
            d={`M 0 ${(-size.ry * 0.04).toFixed(1)} Q ${(size.rx * 0.05).toFixed(1)} ${(size.ry * 0.18).toFixed(1)} 0 ${(size.ry * 0.86).toFixed(1)}`}
            stroke="rgba(255,255,255,0.16)"
            strokeWidth={Math.max(0.45, size.rx * 0.1)}
            strokeLinecap="round"
            fill="none"
            animatedProps={detailAnimatedProps}
          />
        </>
      ) : isSeedlike ? (
        <>
          <AnimatedPath
            d={leafBodyPath}
            fill={renderedLeafColor}
            animatedProps={detailAnimatedProps}
          />
          <AnimatedCircle
            cx={size.rx * 0.08}
            cy={-size.ry * 0.28}
            fill="#ffffff"
            animatedProps={budHighlightAnimatedProps}
          />
        </>
      ) : (
        <>
          <AnimatedPath
            d={leafBodyPath}
            fill={renderedLeafColor}
            animatedProps={detailAnimatedProps}
          />
          <AnimatedPath
            d={veinPath}
            stroke={veinColor}
            strokeWidth={Math.max(0.6, size.rx * 0.11)}
            strokeLinecap="round"
            fill="none"
            animatedProps={detailAnimatedProps}
          />
          <AnimatedEllipse
            cx={0}
            cy={size.ry * 0.04}
            fill={renderedLeafColor}
            animatedProps={leafAnimatedProps}
            opacity={0.14}
          />
          <AnimatedEllipse
            cx={-size.rx * 0.24}
            cy={-size.ry * 0.52}
            rx={size.rx * 0.24}
            ry={size.ry * 0.16}
            fill="#dfe8ff"
            animatedProps={rimHighlightAnimatedProps}
          />
        </>
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
