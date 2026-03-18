// src/components/mosque/JummahMosqueConfig.tsx
// Jummah-specific configuration for Mosque Mode.
// Allows setting silent duration for khutba + prayer (default 30 min).

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { useMosqueMode } from '../../hooks/useMosqueMode';
import { usePrayerTimes } from '../../providers/PrayerTimesProvider';
import TimeInput from '../common/TimeInput';
import { mosqueModePlatformUi } from '../../utils/mosqueModePlatform';

const DURATION_OPTIONS = [15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
const OFFSET_OPTIONS = [5, 10, 15, 20, 25, 30];

type InputMode = 'offset' | 'exact';

const JummahMosqueConfig: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { settings, updateMosqueModeSettings } = useMosqueMode();
  const { todayPrayerTimes } = usePrayerTimes();
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showOffsetPicker, setShowOffsetPicker] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('offset');

  const jummah = settings?.jummah ?? {
    enabled: true,
    silentDuration: 30,
    iqamahOffset: 15,
  };

  const handleToggle = (value: boolean) => {
    updateMosqueModeSettings({
      jummah: { ...jummah, enabled: value },
    });
  };

  const handleDurationChange = (value: number) => {
    updateMosqueModeSettings({
      jummah: { ...jummah, silentDuration: value },
    });
  };

  const handleOffsetChange = (value: number) => {
    updateMosqueModeSettings({
      jummah: { ...jummah, iqamahOffset: value },
    });
  };

  // Compute exact iqamah time from Dhuhr adhan + offset
  const getExactJummahTime = (): string => {
    const dhuhr = todayPrayerTimes.find(p => p.name === 'Dhuhr');
    if (!dhuhr) return '12:30';
    const iqamah = new Date(dhuhr.time.getTime() + jummah.iqamahOffset * 60000);
    const h = iqamah.getHours();
    const m = iqamah.getMinutes();
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // Convert exact time back to offset from Dhuhr adhan
  const handleExactTimeChange = (timeStr: string) => {
    const dhuhr = todayPrayerTimes.find(p => p.name === 'Dhuhr');
    if (!dhuhr) return;
    const [hStr, mStr] = timeStr.split(':');
    const exactDate = new Date(dhuhr.time);
    exactDate.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);
    const diffMin = Math.max(1, Math.round((exactDate.getTime() - dhuhr.time.getTime()) / 60000));
    updateMosqueModeSettings({
      jummah: { ...jummah, iqamahOffset: diffMin },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Jumu'ah Settings</Text>
          <Text style={styles.subtitle}>
            {mosqueModePlatformUi.jummahSubtitle}
          </Text>
        </View>
        <Switch
          value={jummah.enabled}
          onValueChange={handleToggle}
          trackColor={{
            false: theme.colors.switch.trackFalse,
            true: theme.colors.mosqueMode.jummah.accent,
          }}
          thumbColor={theme.colors.switch.thumb}
        />
      </View>

      {jummah.enabled && (
        <View style={styles.options}>
          {mosqueModePlatformUi.showsSilentModeControls && (
            <>
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => setShowDurationPicker(!showDurationPicker)}
                activeOpacity={0.7}
              >
                <View>
                  <Text style={styles.optionLabel}>{mosqueModePlatformUi.jummahDurationLabel}</Text>
                  <Text style={styles.optionHint}>
                    {mosqueModePlatformUi.jummahDurationHint}
                  </Text>
                </View>
                <Text style={styles.optionValue}>{jummah.silentDuration} min</Text>
              </TouchableOpacity>

              {showDurationPicker && (
                <View style={styles.chipGrid}>
                  {DURATION_OPTIONS.map((min) => {
                    const isSelected = jummah.silentDuration === min;
                    return (
                      <TouchableOpacity
                        key={min}
                        style={[
                          styles.chip,
                          isSelected && styles.chipActive,
                        ]}
                        onPress={() => {
                          handleDurationChange(min);
                          setShowDurationPicker(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextActive,
                          ]}
                        >
                          {min} min
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {/* Iqamah Time — Offset / Exact toggle */}
          <View style={styles.iqamahSection}>
            <Text style={styles.optionLabel}>Jumu'ah Iqamah</Text>

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

            {inputMode === 'offset' ? (
              <>
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() => setShowOffsetPicker(!showOffsetPicker)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionHint}>
                    {mosqueModePlatformUi.jummahOffsetHint}
                  </Text>
                  <Text style={styles.optionValue}>{jummah.iqamahOffset} min</Text>
                </TouchableOpacity>

                {showOffsetPicker && (
                  <View style={styles.chipGrid}>
                    {OFFSET_OPTIONS.map((min) => {
                      const isSelected = jummah.iqamahOffset === min;
                      return (
                        <TouchableOpacity
                          key={min}
                          style={[
                            styles.chip,
                            isSelected && styles.chipActive,
                          ]}
                          onPress={() => {
                            handleOffsetChange(min);
                            setShowOffsetPicker(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              isSelected && styles.chipTextActive,
                            ]}
                          >
                            {min} min
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </>
            ) : (
              <View style={styles.exactTimeRow}>
                <TimeInput
                  label="Jumu'ah Start"
                  value={getExactJummahTime()}
                  onChange={handleExactTimeChange}
                />
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.mosqueMode.card.bg,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.mosqueMode.jummah.accentDim,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerLeft: {
      flex: 1,
      marginRight: theme.spacing.md,
    },
    title: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      lineHeight: 18,
    },
    options: {
      marginTop: theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.mosqueMode.jummah.accentDim,
      paddingTop: theme.spacing.md,
    },
    optionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.md - 2,
    },
    optionLabel: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.text.primary,
    },
    optionHint: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.xxs,
    },
    optionValue: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.mosqueMode.jummah.accent,
    },
    chipGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
    },
    chip: {
      paddingVertical: theme.spacing.md - 2,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.sm + 2,
      borderWidth: 1,
      backgroundColor: theme.colors.mosqueMode.chip.bg,
      borderColor: theme.colors.mosqueMode.jummah.accentDim,
    },
    chipActive: {
      backgroundColor: theme.colors.mosqueMode.jummah.chipActiveBg,
      borderColor: theme.colors.mosqueMode.jummah.chipActiveBg,
    },
    chipText: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.mosqueMode.chip.text,
    },
    chipTextActive: {
      color: theme.colors.mosqueMode.jummah.chipActiveText,
      fontWeight: '700',
    },
    iqamahSection: {
      marginTop: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.mosqueMode.jummah.accentDim,
    },
    segmentControl: {
      flexDirection: 'row',
      backgroundColor: theme.colors.mosqueMode.segment.bg,
      borderRadius: theme.borderRadius.sm + 2,
      padding: 2,
      marginTop: theme.spacing.md - 2,
      marginBottom: theme.spacing.sm,
    },
    segmentButton: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
      borderRadius: theme.borderRadius.sm,
    },
    segmentButtonActive: {
      backgroundColor: theme.colors.mosqueMode.jummah.segmentActiveBg,
    },
    segmentButtonText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.mosqueMode.segment.inactiveText,
    },
    segmentButtonTextActive: {
      color: theme.colors.mosqueMode.jummah.chipActiveText,
    },
    exactTimeRow: {
      marginTop: theme.spacing.xs,
    },
  });

export default JummahMosqueConfig;
