import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PrayerTime } from '../../types';
import PrayerTimeService from '../../services/PrayerTimeService';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';

interface NextPrayerCardProps {
  prayer: PrayerTime;
  onPrepare: () => void;
}

const { width } = Dimensions.get('window');

const NextPrayerCard: React.FC<NextPrayerCardProps> = ({ prayer, onPrepare }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const diff = prayer.time.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining('Now');
        setProgress(1);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes} minutes`);
      }

      // Calculate progress (assuming 5 hours between prayers on average)
      const totalTime = 5 * 60 * 60 * 1000; // 5 hours in ms
      const elapsed = totalTime - diff;
      setProgress(Math.min(Math.max(elapsed / totalTime, 0), 1));
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [prayer]);

  const getPrayerGradient = (): [string, string] => {
    return [theme.colors.card.background, theme.colors.card.hover];
  };

  return (
    <LinearGradient
      colors={getPrayerGradient()}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.header}>
        <Text style={styles.nextLabel}>NEXT PRAYER</Text>
        <Text style={styles.timeRemaining}>{timeRemaining}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.prayerName}>
          {PrayerTimeService.getPrayerDisplayName(prayer.name)}
        </Text>
        <Text style={styles.prayerTime}>
          {PrayerTimeService.formatPrayerTime(prayer.time)}
        </Text>
      </View>

      {/* Progress dots */}
      <View style={styles.progressContainer}>
        {[0, 1, 2, 3, 4].map((index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index < Math.floor(progress * 5) && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.prepareButton} onPress={onPrepare}>
        <Text style={styles.prepareButtonText}>Prepare for Prayer</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.xl,
    marginVertical: theme.spacing.lg,
    borderRadius: 20,
    padding: theme.spacing.xl,
    borderWidth: 2,
    borderColor: theme.colors.primary.DEFAULT,
    shadowColor: theme.colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  nextLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    letterSpacing: 1,
    color: theme.colors.text.secondary,
  },
  timeRemaining: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
  },
  content: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  prayerName: {
    fontSize: theme.typography.fontSize['5xl'],
    fontFamily: theme.typography.fontFamily.heading,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  prayerTime: {
    fontSize: theme.typography.fontSize['2xl'],
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border.primary,
  },
  progressDotActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  prepareButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: theme.colors.primary.DEFAULT,
    borderColor: theme.colors.primary.light,
  },
  prepareButtonText: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.primary.contrast,
  },
});

export default NextPrayerCard;