// src/components/garden/GardenPlantView.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';
import { GardenPlant } from '../../types/garden';
import StorageService from '../../services/StorageService';
import { isRamadan } from '../../utils/ramadan';

interface GardenPlantViewProps {
  plant: GardenPlant;
  delay?: number; // stagger animation delay in ms
}

const SCALE_MAP = { seed: 0.7, sprout: 0.85, bloom: 1.0 };

const GardenPlantView: React.FC<GardenPlantViewProps> = ({ plant, delay = 0 }) => {
  const { theme } = useTheme();
  const breathAnim = useRef(new Animated.Value(1)).current;
  const entryAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered fade-in entry
    const entryTimer = setTimeout(() => {
      Animated.timing(entryAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, delay);

    // Gentle breathing animation
    const breathTimer = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(breathAnim, {
            toValue: 1.03,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(breathAnim, {
            toValue: 0.97,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, delay + 600);

    return () => {
      clearTimeout(entryTimer);
      clearTimeout(breathTimer);
    };
  }, []);

  const handlePress = () => {
    const text = StorageService.getReflectionText(plant.date, plant.prayer);
    const moodLabels = ['', 'Distracted', 'Neutral', 'Focused', 'Peaceful', 'Connected'];
    const moodLabel = moodLabels[plant.mood] || '';

    Alert.alert(
      `${plant.emoji} ${plant.prayer} · ${plant.date}`,
      text
        ? `"${text}"\n\nMood: ${moodLabel}`
        : `Reflected with ${moodLabel.toLowerCase()} focus`,
    );
  };

  const baseScale = SCALE_MAP[plant.growthStage];

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: entryAnim,
            transform: [
              { scale: Animated.multiply(breathAnim, new Animated.Value(baseScale)) },
            ],
          },
        ]}
      >
        <Text style={[
          styles.emoji,
          isRamadan() && plant.growthStage === 'bloom' && {
            textShadowColor: theme.colors.garden.sparkle,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 8,
          },
        ]}>{plant.emoji}</Text>
        {plant.hasText && (
          <Text style={[styles.sparkle, { color: theme.colors.garden.sparkle }]}>✨</Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 28,
  },
  sparkle: {
    fontSize: 10,
    position: 'absolute',
    top: 2,
    right: 2,
  },
});

export default React.memo(GardenPlantView);
