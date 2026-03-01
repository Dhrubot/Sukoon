// src/components/garden/DawamBadge.tsx

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';

interface DawamBadgeProps {
  days: number;
}

/**
 * Compact pill showing "N days of dawam" (دوام = constancy/continuity).
 *
 * Islamic context: The Prophet ﷺ said "The most beloved deeds to Allah
 * are the most consistent, even if small" (Bukhari & Muslim).
 * Dawam captures this quality — showing up persistently —
 * without the gamification anxiety of "streak" language.
 */
const DawamBadge: React.FC<DawamBadgeProps> = ({ days }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  // Gentle pulse on the indicator dot
  const dotScale = useSharedValue(1);

  useEffect(() => {
    if (days <= 0) return;

    dotScale.value = withRepeat(
      withSequence(
        withTiming(1.6, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [days]);

  const dotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
  }));

  if (days <= 0) return null;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: theme.colors.garden.dawamDot },
          dotAnimatedStyle,
        ]}
      />
      <Text style={[styles.label, { color: theme.colors.garden.dawamPillText }]}>
        {days} {days === 1 ? 'day' : 'days'} of dawam
      </Text>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: 20,
      paddingVertical: 4,
      paddingHorizontal: 10,
      backgroundColor: theme.colors.garden.dawamPillBg,
      borderWidth: 1,
      borderColor: theme.colors.garden.dawamPillBorder,
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },
    label: {
      fontSize: 10,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      letterSpacing: 0.3,
    },
  });

export default React.memo(DawamBadge);