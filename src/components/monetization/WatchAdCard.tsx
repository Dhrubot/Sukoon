// src/components/monetization/WatchAdCard.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import AdService from '../../services/monetization/AdService';

interface WatchAdCardProps {
  onRewardEarned?: () => void;
}

export const WatchAdCard: React.FC<WatchAdCardProps> = ({ onRewardEarned }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [canWatch, setCanWatch] = useState(false);
  const [hoursLeft, setHoursLeft] = useState(0);
  const [isWatching, setIsWatching] = useState(false);
  const [hasActiveReward, setHasActiveReward] = useState(false);

  useEffect(() => {
    checkAdStatus();
    const interval = setInterval(checkAdStatus, 60_000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const checkAdStatus = async () => {
    const eligible = await AdService.canShowAd();
    setCanWatch(eligible);
    setHoursLeft(AdService.getHoursUntilNextAd());

    const status = await AdService.getAdFreeStatus();
    setHasActiveReward(status.reason === 'temporary');
  };

  const handleWatchAd = async () => {
    setIsWatching(true);
    try {
      const earned = await AdService.showRewardedAd();
      if (earned) {
        Alert.alert(
          'JazakAllah Khair!',
          'Thank you for supporting Sukoon! Your generosity keeps this app free for the Ummah.',
          [{ text: 'Alhamdulillah' }]
        );
        onRewardEarned?.();
        await checkAdStatus();
      } else {
        Alert.alert(
          'Ad Not Available',
          'The ad could not be shown right now. Please try again later.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsWatching(false);
    }
  };

  const statusText = hasActiveReward
    ? `You've already supported today — JazakAllah Khair!`
    : canWatch
      ? 'Watch a short halal ad to help keep Sukoon free'
      : hoursLeft > 0
        ? `Next ad available in ${hoursLeft}h`
        : 'Loading ad...';

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card.background }]}>
      <View style={styles.iconRow}>
        <Text style={styles.icon}>{hasActiveReward ? '✅' : '🎬'}</Text>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.colors.text.primary }]}>
            Support Sukoon
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
            {statusText}
          </Text>
        </View>
      </View>

      <Text style={[styles.description, { color: theme.colors.text.secondary }]}>
        Can't donate? No problem! All ads are halal-filtered.
      </Text>

      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: canWatch
              ? theme.colors.primary.DEFAULT
              : theme.colors.border.primary,
          },
        ]}
        onPress={handleWatchAd}
        disabled={!canWatch || isWatching}
        activeOpacity={0.7}
      >
        {isWatching ? (
          <ActivityIndicator color={theme.colors.primary.contrast} size="small" />
        ) : (
          <Text
            style={[
              styles.buttonText,
              {
                color: canWatch
                  ? theme.colors.primary.contrast
                  : theme.colors.text.muted,
              },
            ]}
          >
            {hasActiveReward
              ? 'Already Active'
              : canWatch
                ? 'Watch Ad'
                : hoursLeft > 0
                  ? `Available in ${hoursLeft}h`
                  : 'Ad Loading...'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  card: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  icon: {
    fontSize: theme.typography.fontSize['5xl'],
    marginRight: theme.spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: theme.typography.fontSize.xl - 1,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.xxs,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    lineHeight: 18,
  },
  description: {
    fontSize: theme.typography.fontSize.sm,
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
  },
  button: {
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});
