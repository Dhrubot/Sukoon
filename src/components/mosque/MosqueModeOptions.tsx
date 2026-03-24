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
import { mosqueModePlatformUi } from '../../utils/mosqueModePlatform';

const DURATION_OPTIONS = [5, 10, 15, 20, 25, 30, 45, 60];

export const MosqueModeOptions: React.FC = () => {
  const styles = useThemedStyles(createStyles);
  const { theme } = useTheme();
  const { settings, updateMosqueModeSettings } = useMosqueMode();
  const [showDurationPicker, setShowDurationPicker] = useState(false);

  if (!settings) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{mosqueModePlatformUi.optionsSectionLabel === 'SILENT MODE OPTIONS' ? 'Silent Mode Options' : 'Reminder Options'}</Text>

      {mosqueModePlatformUi.showsSilentModeControls && (
        <>
          <TouchableOpacity
            style={styles.row}
            onPress={() => setShowDurationPicker(!showDurationPicker)}
            activeOpacity={0.7}
          >
            <View style={styles.rowInfo}>
              <Text style={styles.rowLabel}>Silent Duration</Text>
              <Text style={styles.rowValue}>{settings.silentDuration} minutes</Text>
            </View>
            <Text style={styles.chevron}>{showDurationPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showDurationPicker && (
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>How long should silent mode stay on?</Text>
              <View style={styles.chipGrid}>
                {DURATION_OPTIONS.map((min) => {
                  const isSelected = settings.silentDuration === min;
                  return (
                    <TouchableOpacity
                      key={min}
                      style={[
                        styles.chip,
                        isSelected && styles.chipActive,
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
                          isSelected && styles.chipTextActive,
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
        </>
      )}

      {mosqueModePlatformUi.showsSilentModeControls && (
        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowLabel}>Auto-Restore Ringer</Text>
            <Text style={styles.rowValue}>Automatically restore sound after duration ends</Text>
          </View>
          <Switch
            value={settings.autoRestore}
            onValueChange={(value) => updateMosqueModeSettings({ autoRestore: value })}
            trackColor={{ false: theme.colors.switch.trackFalse, true: theme.colors.switch.trackTrue }}
            thumbColor={theme.colors.switch.thumb}
          />
        </View>
      )}

      {mosqueModePlatformUi.showsSilentModeControls && (
        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowLabel}>Vibrate Instead of Silent</Text>
            <Text style={styles.rowValue}>
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
      )}

      {/* Confirm Before Each Prayer Toggle */}
      <View style={styles.row}>
        <View style={styles.rowInfo}>
          <Text style={styles.rowLabel}>Confirm Before Each Prayer</Text>
          <Text style={styles.rowValue}>
            {settings.promptBeforeEnable
              ? mosqueModePlatformUi.confirmBeforeValueEnabled
              : mosqueModePlatformUi.confirmBeforeValueDisabled}
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
    fontSize: 17,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.text.primary,
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
    backgroundColor: theme.colors.mosqueMode.card.bg,
    borderColor: theme.colors.mosqueMode.card.border,
  },
  rowInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
    marginBottom: 3,
  },
  rowValue: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 11,
    color: theme.colors.text.secondary,
    lineHeight: 16,
  },
  chevron: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.mosqueMode.accordion.chevron,
  },
  pickerContainer: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.mosqueMode.card.bg,
    borderWidth: 1,
    borderColor: theme.colors.mosqueMode.card.border,
  },
  pickerLabel: {
    fontSize: 14,
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
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.mosqueMode.chip.text,
  },
  chipTextActive: {
    color: theme.colors.mosqueMode.chip.activeText,
    fontWeight: '700',
  },
});
