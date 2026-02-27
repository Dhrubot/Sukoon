// src/components/prayer/StarField.tsx
// Animated stars + crescent moon overlay for all prayers.
// Hero is always dark, so stars work visually for every prayer.
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { PrayerName } from '../../types';

const { width: SW, height: SH } = Dimensions.get('window');

interface StarFieldProps {
  prayerName: PrayerName | string;
}

interface StarConfig {
  x: number;
  y: number;
  size: number;
  delay: number;
}

// Stars spread across top ~35% of hero (hero ≈ 72% of screen → y up to ~0.25 of SH)
// Positions match mockup: top:8%→35% of hero, scattered left-to-right
const STARS: StarConfig[] = [
  { x: SW * 0.10, y: SH * 0.06, size: 2, delay: 0 },
  { x: SW * 0.75, y: SH * 0.14, size: 3, delay: 700 },
  { x: SW * 0.50, y: SH * 0.05, size: 2, delay: 1200 },
  { x: SW * 0.25, y: SH * 0.21, size: 2, delay: 400 },
  { x: SW * 0.88, y: SH * 0.08, size: 2, delay: 2000 },
  { x: SW * 0.60, y: SH * 0.25, size: 1, delay: 1500 },
  { x: SW * 0.35, y: SH * 0.11, size: 2, delay: 800 },
  { x: SW * 0.15, y: SH * 0.17, size: 1, delay: 300 },
];

// Star with scale + opacity twinkle animation (matches mockup CSS)
const AnimatedStar: React.FC<{ config: StarConfig }> = ({ config }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(config.delay),
        Animated.timing(anim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.7],
  });
  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.4],
  });

  return (
    <Animated.View
      style={[
        styles.star,
        {
          left: config.x,
          top: config.y,
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
};

// Crescent moon — Unicode ☽ with float animation (matches mockup)
const CrescentMoon: React.FC = () => {
  const translateY = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -8,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(rotate, {
            toValue: 1,
            duration: 4000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 0,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(rotate, {
            toValue: 0,
            duration: 4000,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  const rotateInterp = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-5deg', '0deg'],
  });

  return (
    <Animated.View
      style={[
        styles.crescentContainer,
        {
          transform: [
            { translateY },
            { rotate: rotateInterp },
          ],
        },
      ]}
    >
      <Text style={styles.crescentText}>☽</Text>
    </Animated.View>
  );
};

const StarField: React.FC<StarFieldProps> = ({ prayerName }) => {
  return (
    <View style={styles.container} pointerEvents="none">
      <CrescentMoon />
      {STARS.map((star, i) => (
        <AnimatedStar key={i} config={star} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  star: {
    position: 'absolute',
    backgroundColor: '#fff',
  },
  crescentContainer: {
    position: 'absolute',
    top: 60,
    right: 32,
  },
  crescentText: {
    fontSize: 52,
    lineHeight: 56,
    color: '#c9a84c',
    opacity: 0.12,
  },
});

export default React.memo(StarField);
