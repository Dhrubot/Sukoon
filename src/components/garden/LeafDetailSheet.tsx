// src/components/garden/LeafDetailSheet.tsx
//
// Phase 3: A compact overlay that appears when a leaf is tapped.
// Shows prayer name, date, mood, and whether the reflection had text.
// Positioned near the leaf's screen location with a gentle fade-in.

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { LeafDetailData } from '../../types/tubaTree';
import { LEAF_DETAIL } from '../../constants/tubaTree';

interface LeafDetailSheetProps {
  detail: LeafDetailData | null;
  onDismiss: () => void;
}

const MOOD_LABELS: Record<number, string> = {
  1: 'Distracted',
  2: 'Rushed',
  3: 'Present',
  4: 'Focused',
  5: 'Deep khushoo',
};

const LeafDetailSheet: React.FC<LeafDetailSheetProps> = ({ detail, onDismiss }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    if (detail) {
      opacity.value = withTiming(1, { duration: LEAF_DETAIL.animDuration, easing: Easing.out(Easing.quad) });
      scale.value = withTiming(1, { duration: LEAF_DETAIL.animDuration, easing: Easing.out(Easing.back(1.5)) });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.9, { duration: 150 });
    }
  }, [detail]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!detail) return null;

  const prayerColor = (() => {
    const key = detail.prayer.toLowerCase() as keyof typeof theme.colors.prayer;
    return theme.colors.prayer?.[key] || theme.colors.primary.DEFAULT;
  })();

  // Format date nicely
  const dateLabel = (() => {
    try {
      const d = new Date(detail.date + 'T12:00:00');
      const today = new Date();
      const diffDays = Math.floor((today.getTime() - d.getTime()) / 86400000);
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return detail.date;
    }
  })();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onDismiss} />

      {/* Detail card */}
      <Animated.View style={[styles.card, animatedStyle]}>
        {/* Prayer color strip */}
        <View style={[styles.colorStrip, { backgroundColor: prayerColor }]} />

        <View style={styles.content}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={[styles.prayerDot, { backgroundColor: prayerColor }]} />
            <Text style={[styles.prayerName, { color: theme.colors.text.primary }]}>
              {detail.prayer}
            </Text>
            <Text style={[styles.dateLabel, { color: theme.colors.text.muted }]}>
              {dateLabel}
            </Text>
          </View>

          {/* Mood */}
          <View style={styles.moodRow}>
            <Text style={[styles.moodLabel, { color: theme.colors.text.secondary }]}>
              State: {MOOD_LABELS[detail.mood] || 'Prayer'}
            </Text>
          </View>

          {/* Note indicator */}
          <View style={styles.metaRow}>
            <View style={[styles.metaChip, { backgroundColor: theme.colors.card.hover }]}>
              <Text style={[styles.metaText, { color: theme.colors.text.muted }]}>
                Private reflection
              </Text>
            </View>
            {detail.hasText && (
              <View style={[styles.metaChip, { backgroundColor: theme.colors.card.hover }]}>
                <Text style={[styles.metaText, { color: theme.colors.text.muted }]}>
                  Written note
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Dismiss */}
        <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss} hitSlop={12}>
          <Text style={[styles.dismissText, { color: theme.colors.text.muted }]}>✕</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'transparent',
    },
    card: {
      position: 'absolute',
      bottom: 24,
      left: theme.spacing.xl,
      right: theme.spacing.xl,
      backgroundColor: theme.colors.card.background,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      flexDirection: 'row',
      overflow: 'hidden',
      // Shadow
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    colorStrip: {
      width: 4,
    },
    content: {
      flex: 1,
      padding: theme.spacing.md,
      gap: 8,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    prayerDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    prayerName: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodyMedium,
    },
    dateLabel: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      marginLeft: 'auto',
    },
    moodRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    moodLabel: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
    },
    metaRow: {
      flexDirection: 'row',
      gap: 6,
    },
    metaChip: {
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    metaText: {
      fontSize: 11,
      fontFamily: theme.typography.fontFamily.body,
    },
    dismissBtn: {
      padding: theme.spacing.md,
      justifyContent: 'flex-start',
    },
    dismissText: {
      fontSize: 16,
    },
  });

export default React.memo(LeafDetailSheet);
