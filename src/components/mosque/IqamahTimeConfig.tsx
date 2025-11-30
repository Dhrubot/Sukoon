// src/components/mosque/IqamahTimeConfig.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../../providers/ThemeProvider';
import { useMosqueMode } from '../../hooks/useMosqueMode';
import { PrayerName } from '../../types';

const PRAYER_NAMES: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

// Offset options in minutes
const OFFSET_OPTIONS = [3, 5, 7, 10, 12, 15, 20, 25, 30];

export const IqamahTimeConfig: React.FC = () => {
  const { theme } = useTheme();
  const { settings, setIqamahOffset } = useMosqueMode();
  const [expandedPrayer, setExpandedPrayer] = useState<PrayerName | null>(null);

  if (!settings) return null;

  const handleOffsetChange = async (prayer: PrayerName, minutes: number) => {
    await setIqamahOffset(prayer, minutes);
    setExpandedPrayer(null);
  };

  const renderPrayerRow = (prayer: PrayerName) => {
    const offset = settings.iqamahOffsets[prayer];
    const isExpanded = expandedPrayer === prayer;

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
              {offset} minutes after adhan
            </Text>
          </View>
          <Text style={[styles.chevron, { color: theme.colors.primary.DEFAULT }]}>
            {isExpanded ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={[styles.pickerContainer, { backgroundColor: theme.colors.card.hover }]}>
            <Text style={[styles.pickerLabel, { color: theme.colors.text.secondary }]}>
              Iqamah starts after:
            </Text>
            <Picker
              selectedValue={offset}
              onValueChange={(value) => handleOffsetChange(prayer, value as number)}
              style={[styles.picker, { color: theme.colors.text.primary }]}
              itemStyle={styles.pickerItem}
            >
              {OFFSET_OPTIONS.map((minutes) => (
                <Picker.Item
                  key={minutes}
                  label={`${minutes} minutes`}
                  value={minutes}
                />
              ))}
            </Picker>
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
          Set how many minutes after adhan your mosque starts iqamah
        </Text>
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
  picker: {
    width: '100%',
  },
  pickerItem: {
    fontSize: 16,
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
