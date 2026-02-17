// src/components/mindfulness/DhikrCounter.tsx
//
// Post-Fard dhikr counter — guides the user through authentic Sunnah adhkar
// after every obligatory prayer. Minimal, serene UI matching the praying step.

import React, { useState, useCallback, useMemo } from 'react';
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
}

const DhikrCounter: React.FC<DhikrCounterProps> = ({ onComplete, onSkip }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [dhikrIndex, setDhikrIndex] = useState(0);
  const [currentCount, setCurrentCount] = useState(0);

  const currentDhikr: DhikrItem = POST_FARD_DHIKR[dhikrIndex];
  const isLastDhikr = dhikrIndex === POST_FARD_DHIKR.length - 1;
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

    const nextCount = currentCount + 1;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (nextCount >= currentDhikr.count) {
      setCurrentCount(nextCount);
      // Brief pause before advancing so user sees the completed count
      setTimeout(advanceToNext, 300);
    } else {
      setCurrentCount(nextCount);
    }
  }, [currentCount, currentDhikr, advanceToNext]);

  // Overall progress across all dhikr items
  const totalItems = POST_FARD_DHIKR.length;
  const completedItems = dhikrIndex;

  return (
    <View style={styles.container}>
      {/* Overall progress dots */}
      <View style={styles.progressDots}>
        {POST_FARD_DHIKR.map((_, i) => (
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
      paddingHorizontal: 24,
      paddingTop: 40,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    progressDots: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 40,
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
      width: 20,
    },
    tapTarget: {
      alignItems: 'center',
      paddingVertical: 40,
      paddingHorizontal: 20,
      width: '100%',
    },
    arabicText: {
      fontSize: 32,
      color: theme.colors.mindfulness.textPrimary,
      textAlign: 'center',
      lineHeight: 52,
      marginBottom: 16,
      fontFamily: theme.typography.fontFamily.arabic,
    },
    arabicTextLong: {
      fontSize: 22,
      lineHeight: 38,
    },
    transliteration: {
      fontSize: 18,
      fontWeight: '500',
      color: theme.colors.mindfulness.textSecondary,
      textAlign: 'center',
      marginBottom: 8,
    },
    transliterationLong: {
      fontSize: 14,
      lineHeight: 20,
    },
    translation: {
      fontSize: 14,
      color: theme.colors.mindfulness.textMuted,
      textAlign: 'center',
      lineHeight: 20,
      fontStyle: 'italic',
      marginBottom: 32,
    },
    translationWrapper: {
      alignSelf: 'stretch',
    },
    expandHint: {
      fontSize: 13,
      color: theme.colors.mindfulness.accent,
      fontStyle: 'normal',
    },
    counterContainer: {
      alignItems: 'center',
      gap: 8,
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
      fontSize: 24,
      fontWeight: '300',
      color: theme.colors.mindfulness.textPrimary,
      marginTop: 4,
    },
    reciteConfirm: {
      backgroundColor: theme.colors.mindfulness.buttonBg,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderWidth: 1,
      borderColor: theme.colors.mindfulness.buttonBorder,
    },
    reciteConfirmText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.mindfulness.textPrimary,
    },
    reference: {
      fontSize: 12,
      color: theme.colors.mindfulness.textHint,
      textAlign: 'center',
      marginTop: 20,
    },
    skipButton: {
      marginTop: 24,
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    skipText: {
      fontSize: 14,
      color: theme.colors.mindfulness.textSubtle,
    },
  });

export default DhikrCounter;
