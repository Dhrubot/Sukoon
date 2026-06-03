import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { format } from 'date-fns';
import { FARD_PRAYER_NAMES_LIST } from '../../constants/prayerRegistry';
import NotificationService from '../../services/NotificationService';
import { useStore } from '../../store/useStore';
import { AppTheme } from '../../theme';
import { PrayerName, PrayerTime, UserSettings } from '../../types';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { withAlpha } from '../../utils/color';
import TimeInput, { formatTime } from '../common/TimeInput';
import { SegmentedControl } from './SegmentedControl';

type InputMode = 'offset' | 'exact';

interface PrayerTimeAdjustmentsProps {
  userSettings: UserSettings;
  todayPrayerTimes: PrayerTime[];
  hasValidLocation: boolean;
  onRefreshPrayerTimes?: () => Promise<void>;
}

const PRAYER_NAMES = FARD_PRAYER_NAMES_LIST as unknown as PrayerName[];
const QUICK_OFFSETS = [-10, -5, -3, 0, 3, 5, 10];
const MIN_ADJUSTMENT = -30;
const MAX_ADJUSTMENT = 30;

const clampAdjustment = (minutes: number): number =>
  Math.max(MIN_ADJUSTMENT, Math.min(MAX_ADJUSTMENT, minutes));

const formatSignedMinutes = (minutes: number): string => {
  if (minutes === 0) return 'No adjustment';
  return `${minutes > 0 ? '+' : ''}${minutes} min`;
};

const toTimeInputValue = (date: Date): string =>
  `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

export const PrayerTimeAdjustments: React.FC<PrayerTimeAdjustmentsProps> = ({
  userSettings,
  todayPrayerTimes,
  hasValidLocation,
  onRefreshPrayerTimes,
}) => {
  const styles = useThemedStyles(createStyles);
  const [inputMode, setInputMode] = useState<InputMode>('offset');
  const [expandedPrayer, setExpandedPrayer] = useState<PrayerName | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const updateUserSettings = useStore((state) => state.updateUserSettings);

  const modeOptions = [
    { value: 'offset', label: 'Offset' },
    { value: 'exact', label: 'Exact Time' },
  ];

  const getAdjustment = (prayer: PrayerName): number => userSettings.adjustments?.[prayer] ?? 0;
  const getDisplayedPrayer = (prayer: PrayerName): PrayerTime | undefined =>
    todayPrayerTimes.find((item) => item.name === prayer);

  const getBasePrayerTime = (prayer: PrayerName): Date | null => {
    const displayed = getDisplayedPrayer(prayer);
    if (!displayed) return null;
    return new Date(displayed.time.getTime() - getAdjustment(prayer) * 60000);
  };

  const updateAdjustment = async (prayer: PrayerName, nextMinutes: number) => {
    const clamped = clampAdjustment(nextMinutes);
    setIsUpdating(true);
    try {
      updateUserSettings({
        adjustments: {
          ...userSettings.adjustments,
          [prayer]: clamped,
        },
      });
      await onRefreshPrayerTimes?.();
      await NotificationService.reconcileScheduling('settings_change', { force: true });
    } catch (error) {
      Alert.alert('Adjustment Saved', 'Prayer times will refresh shortly.');
    } finally {
      setIsUpdating(false);
    }
  };

  const resetAll = async () => {
    setIsUpdating(true);
    try {
      updateUserSettings({
        adjustments: { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 },
      });
      await onRefreshPrayerTimes?.();
      await NotificationService.reconcileScheduling('settings_change', { force: true });
      setExpandedPrayer(null);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExactTimeChange = async (prayer: PrayerName, value: string) => {
    const baseTime = getBasePrayerTime(prayer);
    if (!baseTime) return;

    const [hourStr, minuteStr] = value.split(':');
    const selected = new Date(baseTime);
    selected.setHours(Number(hourStr), Number(minuteStr), 0, 0);
    const diffMinutes = Math.round((selected.getTime() - baseTime.getTime()) / 60000);

    if (diffMinutes < MIN_ADJUSTMENT || diffMinutes > MAX_ADJUSTMENT) {
      Alert.alert(
        'Adjustment Too Large',
        `Prayer time adjustments are limited to ${MIN_ADJUSTMENT} to +${MAX_ADJUSTMENT} minutes.`
      );
      return;
    }

    await updateAdjustment(prayer, diffMinutes);
  };

  const renderPrayerRow = (prayer: PrayerName) => {
    const adjustment = getAdjustment(prayer);
    const displayed = getDisplayedPrayer(prayer);
    const baseTime = getBasePrayerTime(prayer);
    const isExpanded = expandedPrayer === prayer;
    const exactValue = displayed ? toTimeInputValue(displayed.time) : '12:00';

    return (
      <View key={prayer}>
        <TouchableOpacity
          style={styles.prayerRow}
          onPress={() => setExpandedPrayer(isExpanded ? null : prayer)}
          activeOpacity={0.75}
          disabled={isUpdating}
        >
          <View style={styles.prayerInfo}>
            <Text style={styles.prayerName}>{prayer}</Text>
            <Text style={styles.prayerMeta}>
              {displayed
                ? `${format(displayed.time, 'h:mm a')} • ${formatSignedMinutes(adjustment)}`
                : 'Prayer time unavailable'}
            </Text>
          </View>
          <Text style={[styles.offsetValue, adjustment !== 0 && styles.offsetValueActive]}>
            {adjustment === 0 ? '0' : `${adjustment > 0 ? '+' : ''}${adjustment}`}
          </Text>
        </TouchableOpacity>

        {isExpanded && inputMode === 'offset' && (
          <View style={styles.pickerContainer}>
            <View style={styles.chipGrid}>
              {QUICK_OFFSETS.map((minutes) => {
                const selected = adjustment === minutes;
                return (
                  <TouchableOpacity
                    key={minutes}
                    style={[styles.chip, selected && styles.chipActive]}
                    onPress={() => updateAdjustment(prayer, minutes)}
                    activeOpacity={0.75}
                    disabled={isUpdating}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                      {minutes === 0 ? '0' : `${minutes > 0 ? '+' : ''}${minutes}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {isExpanded && inputMode === 'exact' && (
          <View style={styles.pickerContainer}>
            <TimeInput
              label={`${prayer} Prayer Time`}
              value={exactValue}
              onChange={(value) => handleExactTimeChange(prayer, value)}
              disabled={!displayed || isUpdating}
            />
            {baseTime ? (
              <Text style={styles.exactHelp}>
                Calculated base: {formatTime(toTimeInputValue(baseTime))}
              </Text>
            ) : null}
          </View>
        )}
      </View>
    );
  };

  const hasAdjustments = PRAYER_NAMES.some((prayer) => getAdjustment(prayer) !== 0);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Prayer Time Adjustments</Text>
          <Text style={styles.subtitle}>
            Fine-tune adhan and reminder times if your local timetable differs.
          </Text>
        </View>
        {hasAdjustments ? (
          <TouchableOpacity onPress={resetAll} disabled={isUpdating} activeOpacity={0.75}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <SegmentedControl
        options={modeOptions}
        selectedValue={inputMode}
        onValueChange={(value) => {
          setInputMode(value as InputMode);
          setExpandedPrayer(null);
        }}
        style={styles.segmented}
      />

      {!hasValidLocation ? (
        <Text style={styles.emptyText}>Set your location before adjusting prayer times.</Text>
      ) : (
        <View style={styles.prayerList}>{PRAYER_NAMES.map(renderPrayerRow)}</View>
      )}
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    headerText: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    title: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      lineHeight: 20,
    },
    resetText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.primary.DEFAULT,
    },
    segmented: {
      marginTop: theme.spacing.xs,
    },
    prayerList: {
      gap: theme.spacing.sm,
    },
    prayerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.card.background,
      borderWidth: 1,
      borderColor: theme.colors.border.secondary,
    },
    prayerInfo: {
      flex: 1,
      gap: 2,
    },
    prayerName: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.text.primary,
    },
    prayerMeta: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
    },
    offsetValue: {
      minWidth: 44,
      textAlign: 'center',
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.muted,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.background.secondary,
    },
    offsetValueActive: {
      color: theme.colors.primary.DEFAULT,
      backgroundColor: withAlpha(theme.colors.primary.DEFAULT, 0.1),
    },
    pickerContainer: {
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border.secondary,
      backgroundColor: theme.colors.background.secondary,
      gap: theme.spacing.md,
    },
    chipGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    chip: {
      minWidth: 52,
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      backgroundColor: theme.colors.card.background,
    },
    chipActive: {
      borderColor: theme.colors.primary.DEFAULT,
      backgroundColor: withAlpha(theme.colors.primary.DEFAULT, 0.12),
    },
    chipText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.secondary,
    },
    chipTextActive: {
      color: theme.colors.primary.DEFAULT,
    },
    exactHelp: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      lineHeight: 18,
    },
    emptyText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      lineHeight: 20,
    },
  });
