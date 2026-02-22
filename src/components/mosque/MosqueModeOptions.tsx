// src/components/mosque/MosqueModeOptions.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';
import { useMosqueMode } from '../../hooks/useMosqueMode';

const DURATION_OPTIONS = [5, 10, 15, 20, 25, 30, 45, 60];

export const MosqueModeOptions: React.FC = () => {
  const { theme } = useTheme();
  const { settings, updateMosqueModeSettings } = useMosqueMode();
  const [showDurationPicker, setShowDurationPicker] = useState(false);

  if (!settings) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
        Silent Mode Options
      </Text>

      {/* Silent Duration */}
      <TouchableOpacity
        style={[styles.row, { backgroundColor: theme.colors.card.background, borderColor: theme.colors.border.primary }]}
        onPress={() => setShowDurationPicker(!showDurationPicker)}
        activeOpacity={0.7}
      >
        <View style={styles.rowInfo}>
          <Text style={[styles.rowLabel, { color: theme.colors.text.primary }]}>
            Silent Duration
          </Text>
          <Text style={[styles.rowValue, { color: theme.colors.text.secondary }]}>
            {settings.silentDuration} minutes
          </Text>
        </View>
        <Text style={[styles.chevron, { color: theme.colors.primary.DEFAULT }]}>
          {showDurationPicker ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {showDurationPicker && (
        <View style={[styles.pickerContainer, { backgroundColor: theme.colors.card.hover }]}>
          <Text style={[styles.pickerLabel, { color: theme.colors.text.secondary }]}>
            How long should silent mode stay on?
          </Text>
          <View style={styles.chipGrid}>
            {DURATION_OPTIONS.map((min) => {
              const isSelected = settings.silentDuration === min;
              return (
                <TouchableOpacity
                  key={min}
                  style={[
                    styles.chip,
                    { borderColor: theme.colors.border.primary },
                    isSelected && { backgroundColor: theme.colors.primary.DEFAULT, borderColor: theme.colors.primary.DEFAULT },
                  ]}
                  onPress={() => {
                    updateMosqueModeSettings({ silentDuration: min });
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
        </View>
      )}

      {/* Auto-Restore Toggle */}
      <View
        style={[styles.row, { backgroundColor: theme.colors.card.background, borderColor: theme.colors.border.primary }]}
      >
        <View style={styles.rowInfo}>
          <Text style={[styles.rowLabel, { color: theme.colors.text.primary }]}>
            Auto-Restore Ringer
          </Text>
          <Text style={[styles.rowValue, { color: theme.colors.text.secondary }]}>
            Automatically restore sound after duration ends
          </Text>
        </View>
        <Switch
          value={settings.autoRestore}
          onValueChange={(value) => updateMosqueModeSettings({ autoRestore: value })}
          trackColor={{ false: theme.colors.switch.trackFalse, true: theme.colors.switch.trackTrue }}
          thumbColor={theme.colors.switch.thumb}
        />
      </View>

      {/* Vibrate vs Silent Toggle */}
      <View
        style={[styles.row, { backgroundColor: theme.colors.card.background, borderColor: theme.colors.border.primary }]}
      >
        <View style={styles.rowInfo}>
          <Text style={[styles.rowLabel, { color: theme.colors.text.primary }]}>
            Vibrate Instead of Silent
          </Text>
          <Text style={[styles.rowValue, { color: theme.colors.text.secondary }]}>
            {settings.useVibrateInsteadOfSilent ? 'Phone will vibrate during prayer' : 'Phone will be completely silent'}
          </Text>
        </View>
        <Switch
          value={settings.useVibrateInsteadOfSilent}
          onValueChange={(value) => updateMosqueModeSettings({ useVibrateInsteadOfSilent: value })}
          trackColor={{ false: theme.colors.switch.trackFalse, true: theme.colors.switch.trackTrue }}
          thumbColor={theme.colors.switch.thumb}
        />
      </View>

      {/* Confirm Before Each Prayer Toggle */}
      <View
        style={[styles.row, { backgroundColor: theme.colors.card.background, borderColor: theme.colors.border.primary }]}
      >
        <View style={styles.rowInfo}>
          <Text style={[styles.rowLabel, { color: theme.colors.text.primary }]}>
            Confirm Before Each Prayer
          </Text>
          <Text style={[styles.rowValue, { color: theme.colors.text.secondary }]}>
            {settings.promptBeforeEnable
              ? 'You\'ll be asked before your phone goes silent'
              : 'Phone silences automatically at iqamah time'}
          </Text>
        </View>
        <Switch
          value={settings.promptBeforeEnable}
          onValueChange={(value) => updateMosqueModeSettings({ promptBeforeEnable: value })}
          trackColor={{ false: theme.colors.switch.trackFalse, true: theme.colors.switch.trackTrue }}
          thumbColor={theme.colors.switch.thumb}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  rowInfo: {
    flex: 1,
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  rowValue: {
    fontSize: 13,
    lineHeight: 18,
  },
  chevron: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerContainer: {
    padding: 16,
    borderRadius: 12,
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
});
