import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { format, isPast, isFuture } from 'date-fns';
import { PrayerTime, PrayerRecord, PrayerName, UserSettings } from '../../types';
import PrayerTimeService from '../../services/PrayerTimeService';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { useStore, useUserSettings, useSunTimes } from '../../store/useStore';
import NotificationService from '../../services/NotificationService';
import { NotificationToggleButton } from '../common/NotificationToggleButton';
import { getPrayerIcon } from '../../assets/icons';
import logger from '../../utils/logger';
import { withAlpha } from '../../utils/color';

interface PrayerCardProps {
  prayer: PrayerTime;
  record?: PrayerRecord;
  onComplete: () => void;
  onLongPress?: () => void;
  nextPrayer?: PrayerTime | null; // Used to determine grace period
  compact?: boolean;
  isLast?: boolean;
}

const PrayerCard: React.FC<PrayerCardProps> = ({
  prayer,
  record,
  onComplete,
  onLongPress,
  nextPrayer,
  compact = false,
  isLast = false,
}) => {
  // Subscribe to shared clock to trigger re-renders on 60s tick
  // (isPast/isFuture from date-fns use new Date() internally)
  useStore((s) => s.currentTime);
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const userSettings = useUserSettings();
  const { todaySunrise } = useSunTimes();
  const updateUserSettings = useStore((s) => s.updateUserSettings);

  // Handle notification toggle
  const handleNotificationToggle = async (prayerName: PrayerName, newState: boolean) => {
    if (!userSettings) return;

    updateUserSettings({ prayerNotifications: { [prayerName]: newState } as UserSettings['prayerNotifications'] });

    if (!userSettings.notifications.enabled) {
      logger.log(`${prayerName} notifications ${newState ? 'enabled' : 'disabled'}`);
      return;
    }

    if (newState) {
      await NotificationService.reconcileScheduling('settings_change');
    } else {
      await NotificationService.cancelPrayerNotifications(prayerName);
    }

    logger.log(`${prayerName} notifications ${newState ? 'enabled' : 'disabled'}`);
  };

  const getStatusColor = (): string => {
    if (record?.status === 'prayed') return theme.colors.status.success;
    if (record?.status === 'missed' && isPast(prayer.time)) return theme.colors.text.muted;

    // Special case: Fajr is missed after Sunrise
    if (prayer.name === 'Fajr' && todaySunrise && isPast(prayer.time) && !record && isPast(todaySunrise)) {
      return theme.colors.text.muted;
    }

    // Check if prayer is truly missed (next prayer started)
    if (isPast(prayer.time) && !record && nextPrayer && isPast(nextPrayer.time)) {
      return theme.colors.text.muted;
    }

    if (isFuture(prayer.time)) return theme.colors.text.secondary;
    return theme.colors.primary.DEFAULT;
  };

  const getStatusText = (): string => {
    if (record?.status === 'prayed') {
      return record.mindfulnessCompleted ? '✓ Prayed with Presence' : '✓ Prayed';
    }

    // Check if prayer time has passed — gentle "Make Up" framing instead of "Missed"
    if (isPast(prayer.time) && !record) {
      // Special case: Fajr after Sunrise
      if (prayer.name === 'Fajr' && todaySunrise && isPast(todaySunrise)) {
        return 'Make Up';
      }
      // Other prayers: Only mark as Make Up if the next prayer has started
      if (nextPrayer && isPast(nextPrayer.time)) {
        return 'Make Up';
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

  // Missed: past prayer with no record and next prayer has already started
  const isMissed = () => {
    if (record) return false;
    if (!isPast(prayer.time)) return false;
    if (prayer.name === 'Fajr' && todaySunrise && isPast(todaySunrise)) return true;
    return nextPrayer ? isPast(nextPrayer.time) : false;
  };

  const active = isActive();
  const missed = isMissed();
  const statusText = getStatusText();
  const statusColor = getStatusColor();
  const compactSecondaryColor = missed ? theme.colors.text.muted : statusColor;
  const compactSecondaryText = compact
    ? record?.mindfulnessCompleted
      ? 'Prayed with presence'
      : record?.status === 'prayed'
        ? 'Prayed'
        : missed
          ? 'Make up'
          : null
    : null;

  return (
    <TouchableOpacity
      style={[
        compact ? styles.compactContainer : styles.container,
        compact
          ? { borderBottomColor: withAlpha(theme.colors.text.muted, 0.28) }
          : { backgroundColor: theme.colors.card.background, borderColor: theme.colors.border.secondary },
        active && [compact ? styles.compactActiveContainer : styles.activeContainer, compact ? null : { backgroundColor: withAlpha(theme.colors.gold, 0.09), borderColor: withAlpha(theme.colors.gold, 0.25) }],
        record?.status === 'prayed' && !compact && [styles.prayedContainer, { backgroundColor: withAlpha(theme.colors.interactive.active, 0.07), borderColor: withAlpha(theme.colors.interactive.active, 0.19) }],
        missed && [compact ? styles.compactMissedContainer : styles.missedContainer, compact ? null : { backgroundColor: withAlpha(theme.colors.status.error, 0.06), borderColor: withAlpha(theme.colors.status.error, 0.15) }],
        compact && isLast && styles.compactContainerLast,
      ]}
      onPress={onComplete}
      onLongPress={onLongPress}
      delayLongPress={400}
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
      <View style={[styles.leftSection, compact && styles.compactLeftSection]}>
        {!compact && (
          <View style={styles.iconContainer}>
            {React.createElement(getPrayerIcon(prayer.name), {
              size: 32,
              color: record?.status === 'prayed'
                ? theme.colors.interactive.active
                : active
                  ? theme.colors.gold
                  : theme.colors.text.secondary,
            })}
          </View>
        )}
        <View style={styles.timeInfo}>
          {compact ? (
            <View style={styles.compactTextBlock}>
              <Text
                style={[
                  styles.compactPrayerName,
                  { color: theme.colors.text.primary },
                  active && styles.compactPrayerNameActive,
                ]}
              >
                {PrayerTimeService.getPrayerDisplayName(prayer.name)}
              </Text>
              {!!compactSecondaryText && (
                <Text style={[styles.compactSecondaryText, { color: compactSecondaryColor }]}>
                  {compactSecondaryText}
                </Text>
              )}
            </View>
          ) : (
            <>
              <Text
                style={[
                  styles.prayerName,
                  { color: theme.colors.text.primary },
                  active && styles.activeName,
                ]}
              >
                {PrayerTimeService.getPrayerDisplayName(prayer.name)}
              </Text>
              <Text
                style={[
                  styles.time,
                  { color: theme.colors.text.secondary },
                  active && [styles.activeTime, { color: theme.colors.text.primary }],
                ]}
              >
                {format(prayer.time, 'h:mm a')}
              </Text>
            </>
          )}
        </View>
      </View>

      <View style={[styles.rightSection, compact && styles.compactRightSection]}>
        {!compact && (
          <View style={styles.statusContainer}>
            <Text style={[styles.status, { color: statusColor }]}>
              {statusText}
            </Text>
            {/* {record?.reflectionAdded && (
              <Text style={styles.reflectionBadge}>📝</Text>
            )} */}
          </View>
        )}
        {compact && (
          <Text
            style={[
              styles.compactTime,
              { color: theme.colors.text.secondary },
              active && styles.compactTimeActive,
            ]}
          >
              {format(prayer.time, 'h:mm a')}
          </Text>
        )}
        <NotificationToggleButton
          prayerName={prayer.name}
          enabled={userSettings?.prayerNotifications?.[prayer.name] ?? true}
          onToggle={handleNotificationToggle}
          disabled={!userSettings?.notifications?.enabled}
          size={compact ? 18 : 22}
        />
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
  },
  activeContainer: {
    borderWidth: 1.5,
  },
  prayedContainer: {
    borderWidth: 1,
  },
  missedContainer: {
    borderWidth: 1,
  },
  compactContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    backgroundColor: 'transparent',
  },
  compactContainerLast: {
    borderBottomWidth: 0,
  },
  compactActiveContainer: {
    borderRadius: 0,
    borderWidth: 0,
    marginHorizontal: 0,
    marginVertical: 0,
    backgroundColor: 'transparent',
  },
  compactMissedContainer: {
    borderRadius: 0,
    borderWidth: 0,
    marginHorizontal: 0,
    marginVertical: 0,
    backgroundColor: 'transparent',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactLeftSection: {
    flex: 1,
    minWidth: 0,
  },
  compactTextBlock: {
    justifyContent: 'center',
    minHeight: 28,
  },
  iconContainer: {
    width: theme.iconSizes['3xl'],
    height: theme.iconSizes['3xl'],
    marginRight: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeInfo: {
    justifyContent: 'center',
  },
  prayerName: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.heading,
    marginBottom: theme.spacing.xs,
  },
  activeName: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.heading,
  },
  compactPrayerName: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    flexShrink: 1,
  },
  compactPrayerNameActive: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
  },
  time: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
  },
  compactTime: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    minWidth: 84,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.1,
  },
  compactTimeActive: {
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.bodySemibold,
  },
  activeTime: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
  },
  rightSection: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  compactRightSection: {
    gap: theme.spacing.sm,
    marginLeft: theme.spacing.md,
    minWidth: 114,
    justifyContent: 'flex-end',
  },
  compactSecondaryText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    flexShrink: 1,
    marginTop: 2,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  status: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodyMedium,
  },
  reflectionBadge: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.body,
  },
});

export default React.memo(PrayerCard, (prev, next) => {
  return (
    prev.prayer.name === next.prayer.name &&
    prev.prayer.time.getTime() === next.prayer.time.getTime() &&
    prev.prayer.isNext === next.prayer.isNext &&
    prev.compact === next.compact &&
    prev.isLast === next.isLast &&
    prev.record?.status === next.record?.status &&
    prev.record?.mindfulnessCompleted === next.record?.mindfulnessCompleted &&
    prev.record?.reflectionAdded === next.record?.reflectionAdded &&
    prev.nextPrayer?.time?.getTime() === next.nextPrayer?.time?.getTime()
  );
});
