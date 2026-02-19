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
import TimeInput, { formatTime } from '../common/TimeInput';

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
            Khutba + prayer — longer silent mode for Fridays
          </Text>
        </View>
        <Switch
          value={jummah.enabled}
          onValueChange={handleToggle}
          trackColor={{
            false: theme.colors.switch.trackFalse,
            true: '#D4AF37',
          }}
          thumbColor={theme.colors.switch.thumb}
        />
      </View>

      {jummah.enabled && (
        <View style={styles.options}>
          {/* Silent Duration */}
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setShowDurationPicker(!showDurationPicker)}
            activeOpacity={0.7}
          >
            <View>
              <Text style={styles.optionLabel}>Silent Duration</Text>
              <Text style={styles.optionHint}>
                Includes khutba (~20 min) + prayer (~10 min)
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
                      { borderColor: theme.colors.border.primary },
                      isSelected && { backgroundColor: '#D4AF37', borderColor: '#D4AF37' },
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
                        { color: theme.colors.text.secondary },
                        isSelected && { color: '#FFFFFF', fontWeight: '700' },
                      ]}
                    >
                      {min} min
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Iqamah Time — Offset / Exact toggle */}
          <View style={styles.iqamahSection}>
            <Text style={styles.optionLabel}>Jumu'ah Iqamah</Text>

            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  inputMode === 'offset' && { backgroundColor: '#D4AF37' },
                ]}
                onPress={() => setInputMode('offset')}
              >
                <Text style={[
                  styles.modeButtonText,
                  { color: inputMode === 'offset' ? '#FFFFFF' : theme.colors.text.secondary },
                ]}>
                  Offset
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  inputMode === 'exact' && { backgroundColor: '#D4AF37' },
                ]}
                onPress={() => setInputMode('exact')}
              >
                <Text style={[
                  styles.modeButtonText,
                  { color: inputMode === 'exact' ? '#FFFFFF' : theme.colors.text.secondary },
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
                    Minutes after Dhuhr adhan on Friday
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
                            { borderColor: theme.colors.border.primary },
                            isSelected && { backgroundColor: '#D4AF37', borderColor: '#D4AF37' },
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
                              { color: theme.colors.text.secondary },
                              isSelected && { color: '#FFFFFF', fontWeight: '700' },
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
      backgroundColor: theme.colors.card.background,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: 'rgba(212, 175, 55, 0.2)',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerLeft: {
      flex: 1,
      marginRight: 12,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text.primary,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 13,
      color: theme.colors.text.secondary,
      lineHeight: 18,
    },
    options: {
      marginTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.primary,
      paddingTop: 12,
    },
    optionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
    },
    optionLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text.primary,
    },
    optionHint: {
      fontSize: 12,
      color: theme.colors.text.secondary,
      marginTop: 2,
    },
    optionValue: {
      fontSize: 14,
      fontWeight: '600',
      color: '#D4AF37',
    },
    chipGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
      marginBottom: 8,
    },
    chip: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      borderWidth: 1,
    },
    chipText: {
      fontSize: 14,
      fontWeight: '500',
    },
    iqamahSection: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: 'rgba(128, 128, 128, 0.1)',
    },
    modeToggle: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 10,
      marginBottom: 8,
    },
    modeButton: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(212, 175, 55, 0.3)',
    },
    modeButtonText: {
      fontSize: 13,
      fontWeight: '600',
    },
    exactTimeRow: {
      marginTop: 4,
    },
  });

export default JummahMosqueConfig;
