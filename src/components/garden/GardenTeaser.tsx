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

  // Simple progress: cap at 7 reflections per week
  const progressPercent = Math.min(summary.total / 7, 1);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.topRow}>
        <Text style={styles.emoji}>{summary.topEmoji}</Text>
        <View style={styles.textCol}>
          <Text style={styles.title}>Reflection Garden</Text>
          <Text style={styles.message}>{message}</Text>
        </View>
        <Text style={[styles.chevron, { color: theme.colors.text.muted }]}>›</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPercent * 100}%`, backgroundColor: theme.colors.interactive.active }]} />
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    marginTop: theme.spacing.md,
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xs,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.card.background,
    borderWidth: 1,
    borderColor: theme.colors.border.secondary,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: theme.typography.fontSize.xl,
    marginRight: theme.spacing.md - 2,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xxs,
  },
  message: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.muted,
  },
  chevron: {
    fontSize: theme.typography.fontSize['3xl'],
    fontFamily: theme.typography.fontFamily.body,
    marginLeft: theme.spacing.sm,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border.secondary,
    marginTop: theme.spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});

export default React.memo(GardenTeaser);
