import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { format, isPast, isFuture } from 'date-fns';
import { PrayerTime, PrayerRecord, PrayerName } from '../../types';
import PrayerTimeService from '../../services/PrayerTimeService';
import { useTheme } from '../../providers/ThemeProvider';
import { useStore } from '../../store/useStore';
import StorageService from '../../services/StorageService';
import NotificationService from '../../services/NotificationService';
import { Icon } from '../common/Icon';
import { NotificationToggleButton } from '../common/NotificationToggleButton';
import { getPrayerIcon } from '../../assets/icons';
import logger from '../../utils/logger';

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
  const { userSettings, setUserSettings, todaySunrise } = useStore();

  // Handle notification toggle
  const handleNotificationToggle = async (prayerName: PrayerName, newState: boolean) => {
    if (!userSettings) return;

    const updatedSettings = {
      ...userSettings,
      prayerNotifications: {
        ...userSettings.prayerNotifications,
        [prayerName]: newState,
      },
    };

    setUserSettings(updatedSettings);
    StorageService.setUserSettings(updatedSettings);

    if (!updatedSettings.notifications.enabled) {
      logger.log(`${prayerName} notifications ${newState ? 'enabled' : 'disabled'}`);
      return;
    }

    if (newState) {
      await NotificationService.scheduleAllPrayerNotifications();
    } else {
      await NotificationService.cancelPrayerNotifications(prayerName);
    }

    logger.log(`${prayerName} notifications ${newState ? 'enabled' : 'disabled'}`);
  };

  const getStatusColor = (): string => {
    if (record?.status === 'prayed') return theme.colors.status.success;
    if (record?.status === 'missed' && isPast(prayer.time)) return theme.colors.status.error;

    // Special case: Fajr is missed after Sunrise
    if (prayer.name === 'Fajr' && todaySunrise && isPast(prayer.time) && !record && isPast(todaySunrise)) {
      return theme.colors.status.error;
    }

    // Check if prayer is truly missed (next prayer started)
    if (isPast(prayer.time) && !record && nextPrayer && isPast(nextPrayer.time)) {
      return theme.colors.status.error;
    }

    if (isFuture(prayer.time)) return theme.colors.text.secondary;
    return theme.colors.primary.DEFAULT;
  };

  const getStatusText = (): string => {
    if (record?.status === 'prayed') {
      return record.mindfulnessCompleted ? '✓ Prayed with Presence' : '✓ Prayed';
    }

    // Check if prayer is truly missed
    if (isPast(prayer.time) && !record) {
      // Special case: Fajr is missed after Sunrise
      if (prayer.name === 'Fajr' && todaySunrise && isPast(todaySunrise)) {
        return 'Missed';
      }
      // Other prayers: Only mark as missed if the next prayer has started
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

  // Prayer is active if it's the next prayer OR if it's in the grace period
  const isActive = () => {
    if (prayer.isNext) return true;
    if (!isPast(prayer.time) || record) return false;
    
    // Special case: Fajr is not active after Sunrise
    if (prayer.name === 'Fajr' && todaySunrise && isPast(todaySunrise)) {
      return false;
    }
    
    // Other prayers: active until next prayer starts
    return !nextPrayer || isFuture(nextPrayer.time);
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: theme.colors.card.background, borderColor: theme.colors.border.primary },
        isActive() && [styles.activeContainer, { backgroundColor: theme.colors.card.hover, borderColor: theme.colors.primary.DEFAULT, shadowColor: theme.colors.primary.DEFAULT }],
        record?.status === 'prayed' && styles.completedContainer,
      ]}
      onPress={onComplete}
      disabled={
        Boolean(
          record?.status === 'prayed' ||
          isFuture(prayer.time)
          // ✅ REMOVED: Disabled conditions for missed prayers
          // Users can now click missed prayers to mark them as makeup
        )
      }
      activeOpacity={0.8}
    >
      <View style={styles.leftSection}>
        <View style={styles.iconContainer}>
          <Icon 
            source={getPrayerIcon(prayer.name)} 
            size={32}
            color={isActive() ? theme.colors.primary.DEFAULT : theme.colors.text.secondary}
          />
        </View>
        <View style={styles.timeInfo}>
          <Text style={[styles.prayerName, { color: theme.colors.text.primary }, isActive() && styles.activeName]}>
            {PrayerTimeService.getPrayerDisplayName(prayer.name)}
          </Text>
          <Text style={[styles.time, { color: theme.colors.text.secondary }, isActive() && [styles.activeTime, { color: theme.colors.text.primary }]]}>
            {format(prayer.time, 'h:mm a')}
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        <View style={styles.statusContainer}>
          <Text style={[styles.status, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
          {record?.reflectionAdded && (
            <Text style={styles.reflectionBadge}>📝</Text>
          )}
        </View>
        <NotificationToggleButton
          prayerName={prayer.name}
          enabled={userSettings?.prayerNotifications?.[prayer.name] ?? true}
          onToggle={handleNotificationToggle}
          disabled={!userSettings?.notifications?.enabled}
          size={22}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,      // theme.borderRadius.md
    padding: 16,           // theme.spacing.lg
    marginBottom: 12,      // theme.spacing.md
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
  iconContainer: {
    width: 40,
    height: 40,
    marginRight: 12,       // theme.spacing.md
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeInfo: {
    justifyContent: 'center',
  },
  prayerName: {
    fontSize: 16,          // theme.typography.fontSize.lg
    fontWeight: '500',     // theme.typography.fontWeight.medium
    marginBottom: 4,       // theme.spacing.xs
  },
  activeName: {
    fontSize: 18,          // theme.typography.fontSize.xl
    fontWeight: '600',     // theme.typography.fontWeight.semibold
  },
  time: {
    fontSize: 14,          // theme.typography.fontSize.md
  },
  activeTime: {
    fontWeight: '500',     // theme.typography.fontWeight.medium
  },
  rightSection: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,                // theme.spacing.md
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  status: {
    fontSize: 13,          // theme.typography.fontSize.sm
    fontWeight: '500',  // medium
  },
  reflectionBadge: {
    fontSize: 16,  // lg
  },
});

export default React.memo(PrayerCard, (prev, next) => {
  return (
    prev.prayer.name === next.prayer.name &&
    prev.prayer.time.getTime() === next.prayer.time.getTime() &&
    prev.prayer.isNext === next.prayer.isNext &&
    prev.record?.status === next.record?.status &&
    prev.record?.mindfulnessCompleted === next.record?.mindfulnessCompleted &&
    prev.record?.reflectionAdded === next.record?.reflectionAdded &&
    prev.currentTime.getMinutes() === next.currentTime.getMinutes() &&
    prev.nextPrayer?.time?.getTime() === next.nextPrayer?.time?.getTime()
  );
});