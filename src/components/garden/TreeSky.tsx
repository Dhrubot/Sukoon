// src/components/garden/TreeSky.tsx
//
// ╔══════════════════════════════════════════════════════════════════╗
// ║  TREE SKY — v3                                                 ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  MOON: Now uses Unicode ☽ crescent (same as hero StarField)    ║
// ║  for visual consistency across the app. Previous SVG Path      ║
// ║  crescent was too small (20px) and looked different from hero.  ║
// ║                                                                ║
// ║  RAMADAN HALO: radius 28, opacity 0.35 (was 16 / 0.12).       ║
// ║  Now actually visible as a warm gold glow behind the moon.     ║
// ║                                                                ║
// ║  FLOAT ANIMATION: Larger amplitude (6px) and slower duration   ║
// ║  (8s) to match the hero's dreamy float feel.                   ║
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
  RAMADAN_MOON_HALO,
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
      const maxOp = boosted ? Math.min(STAR_TWINKLE.maxOpacity + 0.15, 1) : STAR_TWINKLE.maxOpacity;
      const maxSc = boosted ? STAR_TWINKLE.maxScale * 1.2 : STAR_TWINKLE.maxScale;

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

// ─── Animated Crescent Moon (Hero-style Unicode ☽) ─────────────────
//
// v3: Switched from SVG Path crescent to Unicode ☽ <Text> element.
// This matches the hero section's StarField.tsx CrescentMoon exactly:
//   - Gold-tinted ☽ character
//   - Float + gentle rotation animation
//   - Large enough to be a recognizable landmark in the sky
//
// For Ramadan: a soft gold glow View sits behind the crescent,
// significantly larger and more opaque than v1's SVG circle.

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
        {/* Ramadan gold halo — a glowing circle behind the crescent */}
        {showHalo && haloColor && (
          <View
            style={[
              styles.moonHalo,
              {
                width: RAMADAN_MOON_HALO.radius * 2,
                height: RAMADAN_MOON_HALO.radius * 2,
                borderRadius: RAMADAN_MOON_HALO.radius,
                backgroundColor: haloColor,
                opacity: RAMADAN_MOON_HALO.opacity,
              },
            ]}
          />
        )}

        {/* Unicode crescent — matches hero StarField */}
        <Text style={[styles.crescentText, { color }]}>☽</Text>
      </Animated.View>
    );
  },
);

// ─── Main TreeSky Component ────────────────────────────────────────

const TreeSky: React.FC<TreeSkyProps> = ({ theme, isRamadan = false, moonHaloColor }) => {
  const starColor = theme.colors.garden.skyStars;
  const moonColor = theme.colors.garden.moonColor;

  // Skip rendering entirely in light theme
  if (theme.mode === 'light') return null;

  const allStars = isRamadan ? [...STARS, ...RAMADAN_STARS] : STARS;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Twinkling stars */}
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

      {/* Floating crescent moon */}
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
  // Ramadan halo — absolutely centered behind the crescent
  moonHalo: {
    position: 'absolute',
  },
  // Unicode crescent matching hero StarField style
  crescentText: {
    fontSize: MOON.size,
    lineHeight: MOON.size + 4,
    opacity: 0.15,
  },
});

export default React.memo(TreeSky);