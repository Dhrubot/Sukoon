// src/components/garden/GardenTeaser.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../providers/ThemeProvider';
import ReflectionGardenService from '../../services/ReflectionGardenService';

const GardenTeaser: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [summary, setSummary] = useState({ total: 0, newBlooms: 0, topEmoji: '🌱' });

  useFocusEffect(
    useCallback(() => {
      try {
        const data = ReflectionGardenService.getGardenData(28);
        const topPlant = data.plants.find((p) => p.growthStage === 'bloom') || data.plants[0];
        setSummary({
          total: data.totalPlants,
          newBlooms: data.newBlooms,
          topEmoji: topPlant?.emoji || '🌱',
        });
      } catch {
        // Silently ignore
      }
    }, [])
  );

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    (navigation as any).navigate('Menu', { screen: 'ReflectionGarden' });
  };

  // Don't show teaser if no reflections at all
  if (summary.total === 0) return null;

  const message = summary.newBlooms > 0
    ? `${summary.newBlooms} new bloom${summary.newBlooms > 1 ? 's' : ''} this week`
    : 'Your garden is growing';

  return (
    <TouchableOpacity
      style={[styles.container, { borderColor: theme.colors.border.primary }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Text style={styles.emoji}>{summary.topEmoji}</Text>
      <Text style={[styles.message, { color: theme.colors.text.muted }]}>
        {message}
      </Text>
      <Text style={[styles.arrow, { color: theme.colors.text.muted }]}>→</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 18,
    marginRight: 10,
  },
  message: {
    fontSize: 14,
    fontStyle: 'italic',
    fontWeight: '300',
    flex: 1,
  },
  arrow: {
    fontSize: 16,
    fontWeight: '300',
  },
});

export default React.memo(GardenTeaser);
