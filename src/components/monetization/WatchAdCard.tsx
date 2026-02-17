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
import AdService from '../../services/monetization/AdService';

interface WatchAdCardProps {
  onRewardEarned?: () => void;
}

export const WatchAdCard: React.FC<WatchAdCardProps> = ({ onRewardEarned }) => {
  const { theme } = useTheme();
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
          'You\'ve earned 24 hours of premium features. Thank you for supporting Sukoon!',
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
    ? `Premium active! ${hoursLeft}h remaining`
    : canWatch
      ? 'Watch a short halal ad to unlock 24h of premium features'
      : hoursLeft > 0
        ? `Next ad available in ${hoursLeft}h`
        : 'Loading ad...';

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card.background }]}>
      <View style={styles.iconRow}>
        <Text style={styles.icon}>{hasActiveReward ? '✅' : '🎬'}</Text>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.colors.text.primary }]}>
            Support by Watching
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

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 32,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
