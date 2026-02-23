// src/components/mindfulness/DhikrCounter.tsx
//
// Post-Fard dhikr counter — guides the user through authentic Sunnah adhkar
// after every obligatory prayer. Minimal, serene UI matching the praying step.

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { POST_FARD_DHIKR, DhikrItem } from '../../constants/dhikrData';

interface DhikrCounterProps {
  onComplete: () => void;
  onSkip: () => void;
  items?: DhikrItem[];
}

const DhikrCounter: React.FC<DhikrCounterProps> = ({ onComplete, onSkip, items }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const dhikrItems = items ?? POST_FARD_DHIKR;

  const [dhikrIndex, setDhikrIndex] = useState(0);
  const [currentCount, setCurrentCount] = useState(0);
  const countRef = useRef(0);
  const advancingRef = useRef(false);

  const currentDhikr: DhikrItem = dhikrItems[dhikrIndex];
  const isLastDhikr = dhikrIndex === dhikrItems.length - 1;
  const progress = currentCount / currentDhikr.count;
  const isLongText = currentDhikr.arabic.length > 80;
  const [translationExpanded, setTranslationExpanded] = useState(false);

  const displayTranslation = useMemo(() => {
    const full = currentDhikr.translation;
    if (translationExpanded || full.length <= 80) return full;
    return full.slice(0, 77).trimEnd() + '…';
  }, [currentDhikr.translation, translationExpanded]);
  const isTranslationTruncated = currentDhikr.translation.length > 80;

  const advanceToNext = useCallback(() => {
    advancingRef.current = false;
    countRef.current = 0;
    if (isLastDhikr) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
    } else {
      setDhikrIndex((prev) => prev + 1);
      setCurrentCount(0);
      setTranslationExpanded(false);
    }
  }, [isLastDhikr, onComplete]);

  const handleTap = useCallback(() => {
    if (currentDhikr.type === 'recite') {
      // For recitation items, single tap confirms
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      advanceToNext();
      return;
    }

    // Guard: already advancing to next dhikr
    if (advancingRef.current) return;

    countRef.current += 1;
    const nextCount = countRef.current;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentCount(nextCount);

    if (nextCount >= currentDhikr.count) {
      advancingRef.current = true;
      // Brief pause before advancing so user sees the completed count
      setTimeout(advanceToNext, 300);
    }
  }, [currentDhikr, advanceToNext]);

  // Overall progress across all dhikr items
  const totalItems = dhikrItems.length;
  const completedItems = dhikrIndex;

  return (
    <View style={styles.container}>
      {/* Overall progress dots */}
      <View style={styles.progressDots}>
        {dhikrItems.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < completedItems && styles.dotCompleted,
              i === dhikrIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* Main dhikr content — tap target */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleTap}
          style={styles.tapTarget}
        >
          <Text style={[styles.arabicText, isLongText && styles.arabicTextLong]}>
            {currentDhikr.arabic}
          </Text>
          <Text style={[styles.transliteration, isLongText && styles.transliterationLong]}>
            {currentDhikr.transliteration}
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={(e) => {
              if (isTranslationTruncated) {
                e.stopPropagation();
                setTranslationExpanded((prev) => !prev);
              }
            }}
            disabled={!isTranslationTruncated}
            style={styles.translationWrapper}
          >
            <Text style={styles.translation}>
              {displayTranslation}
              {isTranslationTruncated && !translationExpanded && (
                <Text style={styles.expandHint}> Read more</Text>
              )}
            </Text>
          </TouchableOpacity>

          {/* Counter or confirm button */}
          {currentDhikr.type === 'tap' ? (
            <View style={styles.counterContainer}>
              {/* Arc progress */}
              <View style={styles.counterCircle}>
                <View
                  style={[
                    styles.counterProgress,
                    {
                      width: `${Math.min(progress * 100, 100)}%`,
                      backgroundColor: theme.colors.mindfulness.accent,
                    },
                  ]}
                />
              </View>
              <Text style={styles.counterText}>
                {currentCount} / {currentDhikr.count}
              </Text>
            </View>
          ) : (
            <View style={styles.reciteConfirm}>
              <Text style={styles.reciteConfirmText}>
                Tap when recited
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Reference */}
      <Text style={styles.reference}>{currentDhikr.reference}</Text>

      {/* Skip link */}
      <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
        <Text style={styles.skipText}>Skip Dhikr →</Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: theme.spacing['2xl'],
      paddingTop: theme.spacing['4xl'],
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    progressDots: {
      flexDirection: 'row',
      gap: theme.spacing.xs + 2,
      marginBottom: theme.spacing['4xl'],
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.mindfulness.dotInactive,
    },
    dotCompleted: {
      backgroundColor: theme.colors.mindfulness.accent,
    },
    dotActive: {
      backgroundColor: theme.colors.mindfulness.textPrimary,
      width: theme.spacing.xl,
    },
    tapTarget: {
      alignItems: 'center',
      paddingVertical: theme.spacing['4xl'],
      paddingHorizontal: theme.spacing.xl,
      width: '100%',
    },
    arabicText: {
      fontSize: theme.typography.fontSize['5xl'],
      color: theme.colors.mindfulness.textPrimary,
      textAlign: 'center',
      lineHeight: 52,
      marginBottom: theme.spacing.lg,
      fontFamily: theme.typography.fontFamily.arabic,
    },
    arabicTextLong: {
      fontSize: theme.typography.fontSize['3xl'] - 2,
      lineHeight: 38,
    },
    transliteration: {
      fontSize: theme.typography.fontSize.xl,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.mindfulness.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    transliterationLong: {
      fontSize: theme.typography.fontSize.md,
      lineHeight: 20,
    },
    translation: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.mindfulness.textMuted,
      textAlign: 'center',
      lineHeight: 20,
      fontStyle: 'italic',
      marginBottom: theme.spacing['3xl'],
    },
    translationWrapper: {
      alignSelf: 'stretch',
    },
    expandHint: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.mindfulness.accent,
      fontStyle: 'normal',
    },
    counterContainer: {
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    counterCircle: {
      width: 200,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.mindfulness.progressRingBg,
      overflow: 'hidden',
    },
    counterProgress: {
      height: '100%',
      borderRadius: 3,
    },
    counterText: {
      fontSize: theme.typography.fontSize['3xl'],
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.mindfulness.textPrimary,
      marginTop: theme.spacing.xs,
    },
    reciteConfirm: {
      backgroundColor: theme.colors.mindfulness.buttonBg,
      borderRadius: theme.borderRadius.lg,
      paddingVertical: theme.spacing.md + 2,
      paddingHorizontal: theme.spacing['3xl'],
      borderWidth: 1,
      borderColor: theme.colors.mindfulness.buttonBorder,
    },
    reciteConfirmText: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.mindfulness.textPrimary,
    },
    reference: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.mindfulness.textHint,
      textAlign: 'center',
      marginTop: theme.spacing.xl,
    },
    skipButton: {
      marginTop: theme.spacing['2xl'],
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
    },
    skipText: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.mindfulness.textSubtle,
    },
  });

export default DhikrCounter;
