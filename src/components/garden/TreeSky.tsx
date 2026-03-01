// src/components/garden/TreeSky.tsx
//
// Phase 3: Adds Ramadan mode — extra stars, brighter twinkle, gold moon halo.
// When `isRamadan` is true, additional RAMADAN_STARS are rendered and
// the crescent moon gets a soft gold glow behind it.

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';
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
  /** Ramadan moon halo color from ramadanTokens */
  moonHaloColor?: string;
}

// ─── Animated Star ─────────────────────────────────────────────────

interface AnimatedStarProps {
  x: number;
  y: number;
  size: number;
  delay: number;
  color: string;
  /** Ramadan mode boosts brightness */
  boosted?: boolean;
}

const AnimatedStar: React.FC<AnimatedStarProps> = React.memo(
  ({ x, y, size, delay, color, boosted }) => {
    const opacity = useSharedValue(STAR_TWINKLE.minOpacity | STAR_TWINKLE.maxOpacity);
    const scale = useSharedValue(STAR_TWINKLE.minScale | STAR_TWINKLE.maxScale);

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

// ─── Animated Crescent Moon ────────────────────────────────────────

interface AnimatedMoonProps {
  color: string;
  haloColor?: string;
  showHalo?: boolean;
}

const AnimatedMoon: React.FC<AnimatedMoonProps> = React.memo(({ color, haloColor, showHalo }) => {
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

  const svgSize = showHalo ? MOON.size + RAMADAN_MOON_HALO.radius : MOON.size;

  return (
    <Animated.View style={[styles.moonContainer, animatedStyle]}>
      <Svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        fill="none"
      >
        {/* Ramadan gold halo behind the moon */}
        {showHalo && haloColor && (
          <Circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={RAMADAN_MOON_HALO.radius}
            fill={haloColor}
            opacity={RAMADAN_MOON_HALO.opacity}
          />
        )}

        {/* Crescent moon */}
        <Path
          d={showHalo
            ? `M ${svgSize / 2 + 9} ${svgSize / 2 + 0.79} A 9 9 0 1 1 ${svgSize / 2 - 0.79} ${svgSize / 2 - 9} A 7 7 0 0 0 ${svgSize / 2 + 9} ${svgSize / 2 + 0.79} Z`
            : 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z'
          }
          fill={color}
          opacity={0.65}
        />
      </Svg>
    </Animated.View>
  );
});

// ─── Main TreeSky Component ────────────────────────────────────────

const TreeSky: React.FC<TreeSkyProps> = ({ theme, isRamadan = false, moonHaloColor }) => {
  const starColor = theme.colors.garden.skyStars;
  const moonColor = theme.colors.garden.moonColor;

  // Skip rendering entirely in light theme
  if (theme.mode === 'light') return null;

  // Combine base + Ramadan stars
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

      {/* Floating crescent moon (with optional Ramadan halo) */}
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
  },
});

export default React.memo(TreeSky);