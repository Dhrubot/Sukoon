// src/components/mosque/IqamahTimeConfig.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { useMosqueMode } from '../../hooks/useMosqueMode';
import { usePrayerTimes } from '../../providers/PrayerTimesProvider';
import { PrayerName } from '../../types';
import { FARD_PRAYER_NAMES_LIST } from '../../constants/prayerRegistry';
import TimeInput, { formatTime } from '../common/TimeInput';
import { mosqueModePlatformUi } from '../../utils/mosqueModePlatform';

const PRAYER_NAMES = FARD_PRAYER_NAMES_LIST as unknown as PrayerName[];

// Offset options in minutes
const OFFSET_OPTIONS = [3, 5, 7, 10, 12, 15, 20, 25, 30];

type InputMode = 'offset' | 'exact';

export const IqamahTimeConfig: React.FC = () => {
  const styles = useThemedStyles(createStyles);
  const { settings, setIqamahOffset } = useMosqueMode();
  const { todayPrayerTimes } = usePrayerTimes();
  const [expandedPrayer, setExpandedPrayer] = useState<PrayerName | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('offset');

  if (!settings) return null;

  const handleOffsetChange = async (prayer: PrayerName, minutes: number) => {
    await setIqamahOffset(prayer, minutes);
    setExpandedPrayer(null);
  };

  // Convert exact time back to offset minutes from adhan
  const handleExactTimeChange = async (prayer: PrayerName, timeStr: string) => {
    const adhan = todayPrayerTimes.find(p => p.name === prayer);
    if (!adhan) return;

    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);

    const exactDate = new Date(adhan.time);
    exactDate.setHours(h, m, 0, 0);

    const diffMs = exactDate.getTime() - adhan.time.getTime();
    const diffMin = Math.max(1, Math.round(diffMs / 60000));
    await setIqamahOffset(prayer, diffMin);
  };

  // Compute the exact iqamah time from offset
  const getExactTime = (prayer: PrayerName): string => {
    const adhan = todayPrayerTimes.find(p => p.name === prayer);
    if (!adhan) return '12:00';
    const offset = settings.iqamahOffsets[prayer] || 10;
    const iqamah = new Date(adhan.time.getTime() + offset * 60000);
    const h = iqamah.getHours();
    const m = iqamah.getMinutes();
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const renderPrayerRow = (prayer: PrayerName) => {
    const offset = settings.iqamahOffsets[prayer];
    const isExpanded = expandedPrayer === prayer;
    const exactTime = getExactTime(prayer);

    return (
      <View key={prayer}>
        <TouchableOpacity
          style={styles.prayerRow}
          onPress={() => setExpandedPrayer(isExpanded ? null : prayer)}
          activeOpacity={0.7}
        >
          <View style={styles.prayerInfo}>
            <Text style={styles.prayerName}>{prayer}</Text>
            <Text style={styles.offsetText}>
              {inputMode === 'offset'
                ? `${offset} minutes after adhan`
                : `Iqamah at ${formatTime(exactTime)}`}
            </Text>
          </View>
          <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {isExpanded && inputMode === 'offset' && (
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Iqamah starts after:</Text>
            <View style={styles.chipGrid}>
              {OFFSET_OPTIONS.map((minutes) => {
                const isSelected = offset === minutes;
                return (
                  <TouchableOpacity
                    key={minutes}
                    style={[
                      styles.chip,
                      isSelected && styles.chipActive,
                    ]}
                    onPress={() => handleOffsetChange(prayer, minutes)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextActive,
                      ]}
                    >
                      {minutes} min
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
              label={`${prayer} Iqamah Time`}
              value={exactTime}
              onChange={(val) => handleExactTimeChange(prayer, val)}
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Iqamah Times</Text>
        <Text style={styles.subtitle}>
          {inputMode === 'offset'
            ? mosqueModePlatformUi.iqamahSubtitleOffset
            : mosqueModePlatformUi.iqamahSubtitleExact}
        </Text>
      </View>

      {/* Segmented control */}
      <View style={styles.segmentControl}>
        <TouchableOpacity
          style={[
            styles.segmentButton,
            inputMode === 'offset' && styles.segmentButtonActive,
          ]}
          onPress={() => setInputMode('offset')}
        >
          <Text style={[
            styles.segmentButtonText,
            inputMode === 'offset' && styles.segmentButtonTextActive,
          ]}>
            Offset
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.segmentButton,
            inputMode === 'exact' && styles.segmentButtonActive,
          ]}
          onPress={() => setInputMode('exact')}
        >
          <Text style={[
            styles.segmentButtonText,
            inputMode === 'exact' && styles.segmentButtonTextActive,
          ]}>
            Exact Time
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.prayerList}>
        {PRAYER_NAMES.map(renderPrayerRow)}
      </View>

      <TouchableOpacity
        style={styles.hintBox}
        onPress={() => {
          Alert.alert(
            'ℹ️ About Iqamah Times',
            mosqueModePlatformUi.iqamahHelpText,
            [{ text: 'Got it!' }]
          );
        }}
      >
        <Text style={styles.hintText}>
          ℹ️ Tap here for help understanding iqamah times
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    marginBottom: theme.spacing.xl,
  },
  header: {
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xs,
  },
  title: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs + 2,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  prayerList: {
    gap: theme.spacing.sm,
  },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    backgroundColor: theme.colors.mosqueMode.accordion.bg,
    borderColor: theme.colors.mosqueMode.accordion.border,
  },
  prayerInfo: {
    flex: 1,
  },
  prayerName: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  offsetText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
  },
  chevron: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.mosqueMode.accordion.chevron,
  },
  pickerContainer: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.mosqueMode.card.bg,
    borderWidth: 1,
    borderColor: theme.colors.mosqueMode.card.border,
  },
  pickerLabel: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    paddingVertical: theme.spacing.md - 2,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.sm + 2,
    borderWidth: 1,
    backgroundColor: theme.colors.mosqueMode.chip.bg,
    borderColor: theme.colors.mosqueMode.chip.border,
  },
  chipActive: {
    backgroundColor: theme.colors.mosqueMode.chip.activeBg,
    borderColor: theme.colors.mosqueMode.chip.activeBorder,
  },
  chipText: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.mosqueMode.chip.text,
  },
  chipTextActive: {
    color: theme.colors.mosqueMode.chip.activeText,
    fontWeight: '700',
  },
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: theme.colors.mosqueMode.segment.bg,
    borderRadius: theme.borderRadius.sm + 2,
    padding: 2,
    marginBottom: theme.spacing.lg,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: theme.spacing.md - 2,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.mosqueMode.segment.activeBg,
  },
  segmentButtonText: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.mosqueMode.segment.inactiveText,
  },
  segmentButtonTextActive: {
    color: theme.colors.mosqueMode.segment.activeText,
  },
  hintBox: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md + 2,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    backgroundColor: theme.colors.mosqueMode.hint.bg,
    borderColor: theme.colors.mosqueMode.hint.border,
  },
  hintText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.mosqueMode.hint.text,
    textAlign: 'center',
    lineHeight: 18,
  },
});
