// src/components/garden/GardenTeaser.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import ReflectionGardenService from '../../services/ReflectionGardenService';

const GardenTeaser: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
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
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Text style={styles.emoji}>{summary.topEmoji}</Text>
      <Text style={styles.message}>
        {message}
      </Text>
      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    marginTop: theme.spacing.md,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: theme.colors.border.primary,
  },
  emoji: {
    fontSize: theme.typography.fontSize.xl,
    marginRight: theme.spacing.md - 2,
  },
  message: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    fontStyle: 'italic',
    flex: 1,
    color: theme.colors.text.muted,
  },
  arrow: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.muted,
  },
});

export default React.memo(GardenTeaser);
