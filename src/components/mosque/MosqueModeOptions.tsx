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
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { useMosqueMode } from '../../hooks/useMosqueMode';

const DURATION_OPTIONS = [5, 10, 15, 20, 25, 30, 45, 60];

export const MosqueModeOptions: React.FC = () => {
  const styles = useThemedStyles(createStyles);
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

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
  },
  rowInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  rowLabel: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: 3,
  },
  rowValue: {
    fontSize: theme.typography.fontSize.sm,
    lineHeight: 18,
  },
  chevron: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  pickerContainer: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  pickerLabel: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
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
  },
  chipText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
  },
});
