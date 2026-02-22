// src/components/mosque/IqamahTimeConfig.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';
import { useMosqueMode } from '../../hooks/useMosqueMode';
import { usePrayerTimes } from '../../providers/PrayerTimesProvider';
import { PrayerName } from '../../types';
import { FARD_PRAYER_NAMES_LIST } from '../../constants/prayerRegistry';
import TimeInput, { formatTime } from '../common/TimeInput';

const PRAYER_NAMES = FARD_PRAYER_NAMES_LIST as unknown as PrayerName[];

// Offset options in minutes
const OFFSET_OPTIONS = [3, 5, 7, 10, 12, 15, 20, 25, 30];

type InputMode = 'offset' | 'exact';

export const IqamahTimeConfig: React.FC = () => {
  const { theme } = useTheme();
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
          style={[
            styles.prayerRow,
            { backgroundColor: theme.colors.card.background, borderColor: theme.colors.border.primary },
          ]}
          onPress={() => setExpandedPrayer(isExpanded ? null : prayer)}
          activeOpacity={0.7}
        >
          <View style={styles.prayerInfo}>
            <Text style={[styles.prayerName, { color: theme.colors.text.primary }]}>
              {prayer}
            </Text>
            <Text style={[styles.offsetText, { color: theme.colors.text.secondary }]}>
              {inputMode === 'offset'
                ? `${offset} minutes after adhan`
                : `Iqamah at ${formatTime(exactTime)}`}
            </Text>
          </View>
          <Text style={[styles.chevron, { color: theme.colors.primary.DEFAULT }]}>
            {isExpanded ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>

        {isExpanded && inputMode === 'offset' && (
          <View style={[styles.pickerContainer, { backgroundColor: theme.colors.card.hover }]}>
            <Text style={[styles.pickerLabel, { color: theme.colors.text.secondary }]}>
              Iqamah starts after:
            </Text>
            <View style={styles.chipGrid}>
              {OFFSET_OPTIONS.map((minutes) => {
                const isSelected = offset === minutes;
                return (
                  <TouchableOpacity
                    key={minutes}
                    style={[
                      styles.chip,
                      { borderColor: theme.colors.border.primary },
                      isSelected && { backgroundColor: theme.colors.primary.DEFAULT, borderColor: theme.colors.primary.DEFAULT },
                    ]}
                    onPress={() => handleOffsetChange(prayer, minutes)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: theme.colors.text.secondary },
                        isSelected && { color: '#FFFFFF', fontWeight: '700' },
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
          <View style={[styles.pickerContainer, { backgroundColor: theme.colors.card.hover }]}>
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
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>
          Iqamah Times
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
          {inputMode === 'offset'
            ? 'Set the Iqamah start time after Adhan'
            : 'Set the exact Iqamah time for each prayer'}
        </Text>
      </View>

      {/* Mode toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            inputMode === 'offset' && { backgroundColor: theme.colors.primary.DEFAULT },
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
            inputMode === 'exact' && { backgroundColor: theme.colors.primary.DEFAULT },
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

      <View style={styles.prayerList}>
        {PRAYER_NAMES.map(renderPrayerRow)}
      </View>

      <TouchableOpacity
        style={[styles.tipBox, { backgroundColor: theme.colors.card.hover, borderColor: theme.colors.border.primary }]}
        onPress={() => {
          Alert.alert(
            'ℹ️ About Iqamah Times',
            'These times tell the app when your mosque actually starts the prayer.\n\n' +
            'For example:\n' +
            '• If Fajr adhan is 5:10 AM\n' +
            '• And your mosque starts at 5:20 AM\n' +
            '• Set the offset to 10 minutes\n\n' +
            'Your phone will go silent at 5:20 AM when iqamah starts.',
            [{ text: 'Got it!' }]
          );
        }}
      >
        <Text style={[styles.tipText, { color: theme.colors.text.secondary }]}>
          ℹ️ Tap here for help understanding iqamah times
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  prayerList: {
    gap: 8,
  },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  prayerInfo: {
    flex: 1,
  },
  prayerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  offsetText: {
    fontSize: 13,
  },
  chevron: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerContainer: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  modeToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tipBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  tipText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
