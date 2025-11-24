import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { format, isPast, isFuture } from 'date-fns';
import { PrayerTime, PrayerRecord } from '../../types';
import PrayerTimeService from '../../services/PrayerTimeService';
import { useTheme } from '../../providers/ThemeProvider';

interface PrayerCardProps {
  prayer: PrayerTime;
  record?: PrayerRecord;
  onComplete: () => void;
  currentTime: Date;
  nextPrayer?: PrayerTime | null; // Used to determine grace period
}

const { width } = Dimensions.get('window');

const PrayerCard: React.FC<PrayerCardProps> = ({
  prayer,
  record,
  onComplete,
  currentTime,
  nextPrayer,
}) => {
  const { theme } = useTheme();
  const getPrayerIcon = (name: string): string => {
    const icons: Record<string, string> = {
      fajr: '🌅',
      dhuhr: '☀️',
      asr: '🌤',
      maghrib: '🌇',
      isha: '🌙',
    };
    return icons[name] || '🕌';
  };

  const getStatusColor = (): string => {
    if (record?.status === 'prayed') return theme.colors.status.success;
    if (record?.status === 'missed' && isPast(prayer.time)) return theme.colors.status.error;

    // Check if prayer is truly missed (next prayer started)
    if (isPast(prayer.time) && !record && nextPrayer && isPast(nextPrayer.time)) {
      return theme.colors.status.error;
    }

    if (isFuture(prayer.time)) return theme.colors.text.secondary;
    return theme.colors.primary.DEFAULT;
  };

  const getStatusText = (): string => {
    if (record?.status === 'prayed') {
      return record.mindfulnessCompleted ? '✓ Prayed Mindfully' : '✓ Prayed';
    }

    // Check if prayer is truly missed (next prayer has started)
    if (isPast(prayer.time) && !record) {
      // Only mark as missed if the next prayer has started
      if (nextPrayer && isPast(nextPrayer.time)) {
        return 'Missed';
      }
      // Otherwise, still in grace period
      return 'Time to Pray';
    }

    if (prayer.isNext) {
      return 'Next Prayer';
    }
    if (isFuture(prayer.time)) {
      return 'Upcoming';
    }
    return 'Time to Pray';
  };

  // Prayer is active if it's the next prayer OR if it's in the grace period (time passed but next prayer hasn't started)
  const isActive = prayer.isNext ||
    (isPast(prayer.time) && !record && (!nextPrayer || isFuture(nextPrayer.time)));

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: theme.colors.card.background, borderColor: theme.colors.border.primary },
        isActive && [styles.activeContainer, { backgroundColor: theme.colors.card.hover, borderColor: theme.colors.primary.DEFAULT, shadowColor: theme.colors.primary.DEFAULT }],
        record?.status === 'prayed' && styles.completedContainer,
      ]}
      onPress={onComplete}
      disabled={
        Boolean(
          record?.status === 'prayed' ||
          isFuture(prayer.time) ||
          // Disable if prayer is truly missed (next prayer has started)
          (isPast(prayer.time) && !record && nextPrayer && isPast(nextPrayer.time))
        )
      }
      activeOpacity={0.8}
    >
      <View style={styles.leftSection}>
        <Text style={styles.icon}>{getPrayerIcon(prayer.name)}</Text>
        <View style={styles.timeInfo}>
          <Text style={[styles.prayerName, { color: theme.colors.text.primary }, isActive && styles.activeName]}>
            {PrayerTimeService.getPrayerDisplayName(prayer.name)}
          </Text>
          <Text style={[styles.time, { color: theme.colors.text.secondary }, isActive && [styles.activeTime, { color: theme.colors.text.primary }]]}>
            {format(prayer.time, 'h:mm a')}
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        <Text style={[styles.status, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
        {record?.reflectionAdded && (
          <Text style={styles.reflectionBadge}>📝</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  activeContainer: {
    borderWidth: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  completedContainer: {
    opacity: 0.6,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 32,
    marginRight: 12,
  },
  timeInfo: {
    justifyContent: 'center',
  },
  prayerName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  activeName: {
    fontSize: 20,
    fontWeight: '700',
  },
  time: {
    fontSize: 14,
  },
  activeTime: {
    fontWeight: '500',
  },
  rightSection: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
  },
  status: {
    fontSize: 14,
    fontWeight: '500',
  },
  reflectionBadge: {
    fontSize: 16,
  },
});

export default PrayerCard;