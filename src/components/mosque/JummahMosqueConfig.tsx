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
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { useMosqueMode } from '../../hooks/useMosqueMode';

const DURATION_OPTIONS = [15, 20, 25, 30, 35, 40, 45, 60];
const OFFSET_OPTIONS = [5, 10, 15, 20, 25, 30];

const JummahMosqueConfig: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { settings, updateMosqueModeSettings } = useMosqueMode();
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showOffsetPicker, setShowOffsetPicker] = useState(false);

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
            true: theme.colors.switch.trackTrue,
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
            <Picker
              selectedValue={jummah.silentDuration}
              onValueChange={(v) => handleDurationChange(v as number)}
              style={styles.picker}
              itemStyle={{ color: theme.colors.text.primary }}
            >
              {DURATION_OPTIONS.map((min) => (
                <Picker.Item
                  key={min}
                  label={`${min} minutes`}
                  value={min}
                />
              ))}
            </Picker>
          )}

          {/* Iqamah Offset */}
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setShowOffsetPicker(!showOffsetPicker)}
            activeOpacity={0.7}
          >
            <View>
              <Text style={styles.optionLabel}>Iqamah Offset</Text>
              <Text style={styles.optionHint}>
                Minutes after Dhuhr adhan on Friday
              </Text>
            </View>
            <Text style={styles.optionValue}>{jummah.iqamahOffset} min</Text>
          </TouchableOpacity>

          {showOffsetPicker && (
            <Picker
              selectedValue={jummah.iqamahOffset}
              onValueChange={(v) => handleOffsetChange(v as number)}
              style={styles.picker}
              itemStyle={{ color: theme.colors.text.primary }}
            >
              {OFFSET_OPTIONS.map((min) => (
                <Picker.Item
                  key={min}
                  label={`${min} minutes after adhan`}
                  value={min}
                />
              ))}
            </Picker>
          )}
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
    picker: {
      marginTop: -8,
      marginBottom: 4,
    },
  });

export default JummahMosqueConfig;
