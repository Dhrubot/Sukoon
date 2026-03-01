// src/components/garden/TreeSky.tsx
//
// ╔══════════════════════════════════════════════════════════════════╗
// ║  TREE SKY — v4                                                 ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║                                                                ║
// ║  MOON: Unicode ☽ crescent matching hero StarField.             ║
// ║                                                                ║
// ║  RAMADAN GLOW: Multi-layer radial glow instead of flat circle. ║
// ║  Three concentric layers with gaussian-like opacity falloff:   ║
// ║    Inner:  r=14, opacity=0.30 (bright core)                    ║
// ║    Middle: r=26, opacity=0.15 (warm spread)                    ║
// ║    Outer:  r=40, opacity=0.06 (soft edge)                      ║
// ║  This creates a natural light-diffusion effect like actual     ║
// ║  moonlight glow through atmosphere.                            ║
// ║                                                                ║
// ╚══════════════════════════════════════════════════════════════════╝

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { AppTheme } from '../../theme';
import {
  STARS,
  RAMADAN_STARS,
  STAR_TWINKLE,
  MOON_FLOAT,
  MOON,
  TREE_VIEWBOX,
} from '../../constants/tubaTree';

interface TreeSkyProps {
  theme: AppTheme;
  isRamadan?: boolean;
  moonHaloColor?: string;
}

// ─── Animated Star ─────────────────────────────────────────────────

interface AnimatedStarProps {
  x: number;
  y: number;
  size: number;
  delay: number;
  color: string;
  boosted?: boolean;
}

const AnimatedStar: React.FC<AnimatedStarProps> = React.memo(
  ({ x, y, size, delay, color, boosted }) => {
    const opacity = useSharedValue(STAR_TWINKLE.minOpacity as number);
    const scale = useSharedValue(STAR_TWINKLE.minScale as number);

    useEffect(() => {
      const halfDuration = STAR_TWINKLE.duration / 2;
      const easing = Easing.inOut(Easing.sin);
      const maxOp = boosted
        ? Math.min(STAR_TWINKLE.maxOpacity + 0.15, 1)
        : STAR_TWINKLE.maxOpacity;
      const maxSc = boosted
        ? STAR_TWINKLE.maxScale * 1.2
        : STAR_TWINKLE.maxScale;

      opacity.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(maxOp, { duration: halfDuration, easing }),
            withTiming(STAR_TWINKLE.minOpacity, { duration: halfDuration, easing }),
          ),
          -1,
          false,
        ),
      );

      scale.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(maxSc, { duration: halfDuration, easing }),
            withTiming(STAR_TWINKLE.minScale, { duration: halfDuration, easing }),
          ),
          -1,
          false,
        ),
      );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    }));

    return (
      <Animated.View
        style={[
          styles.star,
          {
            left: `${(x / TREE_VIEWBOX.width) * 100}%`,
            top: `${(y / TREE_VIEWBOX.height) * 100}%`,
            width: size,
            height: size,
            backgroundColor: color,
          },
          animatedStyle,
        ]}
      />
    );
  },
);

// ─── Ramadan Moon Glow ─────────────────────────────────────────────
// Multi-layer radial glow that simulates light diffusion.
// Three concentric circles with decreasing opacity create a natural
// "bloom" effect, like moonlight through thin clouds.

const GLOW_LAYERS = [
  { radius: 40, opacity: 0.06 },  // outer — barely there, atmospheric
  { radius: 26, opacity: 0.15 },  // middle — warm spread
  { radius: 14, opacity: 0.30 },  // inner — bright core around crescent
] as const;

interface MoonGlowProps {
  color: string;
}

const MoonGlow: React.FC<MoonGlowProps> = React.memo(({ color }) => (
  <View style={styles.glowContainer}>
    {GLOW_LAYERS.map((layer, i) => (
      <View
        key={`glow-${i}`}
        style={[
          styles.glowLayer,
          {
            width: layer.radius * 2,
            height: layer.radius * 2,
            borderRadius: layer.radius,
            backgroundColor: color,
            opacity: layer.opacity,
          },
        ]}
      />
    ))}
  </View>
));

// ─── Animated Crescent Moon ────────────────────────────────────────

interface AnimatedMoonProps {
  color: string;
  haloColor?: string;
  showHalo?: boolean;
}

const AnimatedMoon: React.FC<AnimatedMoonProps> = React.memo(
  ({ color, haloColor, showHalo }) => {
    const translateY = useSharedValue(0);
    const rotation = useSharedValue(0);

    useEffect(() => {
      const halfDuration = MOON_FLOAT.duration / 2;
      const easing = Easing.inOut(Easing.sin);

      translateY.value = withRepeat(
        withSequence(
          withTiming(-MOON_FLOAT.amplitude, { duration: halfDuration, easing }),
          withTiming(MOON_FLOAT.amplitude, { duration: halfDuration, easing }),
        ),
        -1,
        false,
      );

      rotation.value = withRepeat(
        withSequence(
          withTiming(-MOON_FLOAT.rotationAmplitude, { duration: halfDuration, easing }),
          withTiming(MOON_FLOAT.rotationAmplitude, { duration: halfDuration, easing }),
        ),
        -1,
        false,
      );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateY: translateY.value },
        { rotate: `${rotation.value}deg` },
      ],
    }));

    return (
      <Animated.View style={[styles.moonContainer, animatedStyle]}>
        {/* Ramadan glow — multi-layer radial bloom */}
        {showHalo && haloColor && (
          <MoonGlow color={haloColor} />
        )}

        {/* Unicode crescent — matches hero StarField */}
        <Text style={[styles.crescentText, { color }]}>☽</Text>
      </Animated.View>
    );
  },
);

// ─── Main Component ────────────────────────────────────────────────

const TreeSky: React.FC<TreeSkyProps> = ({
  theme,
  isRamadan = false,
  moonHaloColor,
}) => {
  const starColor = theme.colors.garden.skyStars;
  const moonColor = theme.colors.garden.moonColor;

  if (theme.mode === 'light') return null;

  const allStars = isRamadan ? [...STARS, ...RAMADAN_STARS] : STARS;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {allStars.map((star, i) => (
        <AnimatedStar
          key={`star-${i}`}
          x={star.x}
          y={star.y}
          size={star.size}
          delay={star.animDelay * 1000}
          color={starColor}
          boosted={isRamadan}
        />
      ))}

      <AnimatedMoon
        color={moonColor}
        haloColor={moonHaloColor}
        showHalo={isRamadan}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  star: {
    position: 'absolute',
    borderRadius: 10,
  },
  moonContainer: {
    position: 'absolute',
    top: `${MOON.topPercent}%`,
    right: `${MOON.rightPercent}%`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Glow container — centers all layers behind the crescent
  glowContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Each glow layer is absolutely positioned and centered
  glowLayer: {
    position: 'absolute',
  },
  // Unicode crescent
  crescentText: {
    fontSize: MOON.size,
    lineHeight: MOON.size + 4,
    opacity: 0.15,
  },
});

export default React.memo(TreeSky);