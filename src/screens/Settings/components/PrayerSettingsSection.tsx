import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { format } from 'date-fns';
import { SettingSection } from '../../../components/settings/SettingSection';
import { SettingRow } from '../../../components/settings/SettingRow';
import StorageService from '../../../services/StorageService';
import NotificationService from '../../../services/NotificationService';
import { UserSettings, CalculationMethodType, PrayerTime, PrayerName } from '../../../types';
import { useTheme } from '../../../providers/ThemeProvider';
import { useThemedStyles } from '../../../hooks/useThemedStyles';
import { AppTheme } from '../../../theme';
import { NotificationToggleButton } from '../../../components/common/NotificationToggleButton';
import { SegmentedControl } from '../../../components/settings/SegmentedControl';

interface PrayerSettingsSectionProps {
  userSettings: UserSettings;
  setUserSettings: (settings: UserSettings) => void;
  onCalculationMethodPress: () => void;
  calculationMethods: CalculationMethodType[];
  
  // Enhanced props
  isUpdatingMethod?: boolean;
  todayPrayerTimes?: PrayerTime[];
  nextPrayer?: PrayerTime | null;
  prayerTimesLoading?: boolean;
  hasValidLocation?: boolean;
  onTestCalculations?: () => void;
  onPreviewMethod?: (method: CalculationMethodType) => void;
  onRefreshPrayerTimes?: () => Promise<void>; // 🆕 NEW: For immediate refresh
}

export const PrayerSettingsSection: React.FC<PrayerSettingsSectionProps> = ({
  userSettings,
  setUserSettings,
  onCalculationMethodPress,
  calculationMethods,
  
  // Enhanced props
  isUpdatingMethod = false,
  todayPrayerTimes = [],
  nextPrayer = null,
  prayerTimesLoading = false,
  hasValidLocation = false,
  onTestCalculations,
  onPreviewMethod,
  onRefreshPrayerTimes, // 🆕 NEW
}) => {
  const styles = useThemedStyles(createStyles);
  const juristicOptions = [
    {
      value: 'Standard',
      label: 'Standard',
      description: 'Shafi, Maliki, Hanbali',
    },
    {
      value: 'Hanafi',
      label: 'Hanafi',
      description: 'Later Asr time',
    },
  ];

  // 🔧 FIXED: Immediate refresh when Asr method changes
  // Handle notification toggle for individual prayers
  const handleNotificationToggle = async (prayerName: PrayerName, newState: boolean) => {
    const updatedSettings = {
      ...userSettings,
      prayerNotifications: {
        ...userSettings.prayerNotifications,
        [prayerName]: newState,
      },
    };

    StorageService.setUserSettings(updatedSettings);
    setUserSettings(updatedSettings);

    if (!updatedSettings.notifications.enabled) {
      console.log(`${prayerName} notifications ${newState ? 'enabled' : 'disabled'}`);
      return;
    }

    if (newState) {
      await NotificationService.scheduleAllPrayerNotifications();
    } else {
      await NotificationService.cancelPrayerNotifications(prayerName);
    }

    console.log(`${prayerName} notifications ${newState ? 'enabled' : 'disabled'}`);
  };

  const handleJuristicChange = async (value: string) => {
    const updated = { 
      ...userSettings, 
      asrJuristic: value as 'Standard' | 'Hanafi' 
    };
    
    // Save to storage
    StorageService.setUserSettings(updated);
    setUserSettings(updated);
    
    // 🔧 FIX: Immediately refresh prayer times
    if (onRefreshPrayerTimes && hasValidLocation) {
      try {
        await onRefreshPrayerTimes();
        
        // Show confirmation with new Asr time
        const asrPrayer = todayPrayerTimes.find(p => p.name === 'Asr');
        const timeStr = asrPrayer ? format(asrPrayer.time, 'h:mm a') : '';
        
        Alert.alert(
          'Asr Method Updated ✅',
          `Prayer times updated using ${value} juristic method.\n\n` +
          (timeStr ? `New Asr time: ${timeStr}` : 'Prayer times have been recalculated.'),
          [{ text: 'OK' }]
        );
      } catch (error) {
        console.error('Failed to refresh prayer times:', error);
        Alert.alert(
          'Update Complete',
          'Asr method changed. Prayer times will update on next refresh.',
          [{ text: 'OK' }]
        );
      }
    } else if (!hasValidLocation) {
      Alert.alert(
        'Location Required',
        'Please set your location to see updated prayer times.',
        [{ text: 'OK' }]
      );
    }
  };

  const getCurrentMethodLabel = () => {
    const method = calculationMethods.find(m => m.value === userSettings.calculationMethod);
    return method?.label || 'Unknown';
  };

  // Render current prayer times preview
  const renderCurrentPrayerTimes = () => {
    if (!hasValidLocation) {
      return (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>📍 Location required to show prayer times</Text>
        </View>
      );
    }

    if (prayerTimesLoading) {
      return (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>⏳ Loading prayer times...</Text>
        </View>
      );
    }

    if (todayPrayerTimes.length === 0) {
      return (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>❌ No prayer times available</Text>
        </View>
      );
    }

    return (
      <View style={styles.prayerTimesContainer}>
        <Text style={styles.prayerTimesTitle}>Today's Prayer Times</Text>
        <View style={styles.prayerTimesList}>
          {todayPrayerTimes.map((prayer) => (
            <View key={prayer.name} style={styles.prayerTimeRow}>
              <View style={styles.prayerInfoSection}>
                <Text style={[
                  styles.prayerName,
                  prayer.name === nextPrayer?.name && styles.nextPrayerName,
                  prayer.name === 'Asr' && styles.asrHighlight // 🆕 Highlight Asr
                ]}>
                  {prayer.name}
                </Text>
                <Text style={[
                  styles.prayerTime,
                  prayer.name === nextPrayer?.name && styles.nextPrayerTime
                ]}>
                  {format(prayer.time, 'h:mm a')}
                  {prayer.name === nextPrayer?.name && ' ⭐'}
                </Text>
              </View>
              <NotificationToggleButton
                prayerName={prayer.name}
                enabled={userSettings.prayerNotifications?.[prayer.name] ?? true}
                onToggle={handleNotificationToggle}
                disabled={!userSettings.notifications?.enabled}
                size={20}
              />
            </View>
          ))}
          {todayPrayerTimes.length > 3 && (
            <Text style={styles.moreText}>... and {todayPrayerTimes.length - 3} more</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SettingSection title="Prayer Settings">
      {/* Calculation Method */}
      <SettingRow
        label="Calculation Method"
        value={isUpdatingMethod ? 'Updating...' : getCurrentMethodLabel()}
        onPress={onCalculationMethodPress}
        disabled={isUpdatingMethod}
      />

      {/* Current prayer times preview */}
      {renderCurrentPrayerTimes()}

      {/* Juristic Method for Asr */}
      <View style={styles.juristicMethodWrapper}>
        <SettingRow
          label="Juristic Method"
          subtitle="Asr prayer calculation - changes Asr time immediately"
        />
        
        <SegmentedControl
          options={juristicOptions}
          selectedValue={userSettings.asrJuristic === 'Hanafi' ? 'Hanafi' : 'Standard'}
          onValueChange={handleJuristicChange}
          style={styles.juristicControl}
        />
        
        {/* 🆕 NEW: Explanation of the difference */}
        <View style={styles.juristicExplanation}>
          <Text style={styles.explanationText}>
            {userSettings.asrJuristic === 'Hanafi' 
              ? 'Hanafi: Asr begins when shadow = 2× object length (later)'
              : 'Standard: Asr begins when shadow = 1× object length (earlier)'
            }
          </Text>
        </View>
      </View>

      {/* Test calculations button */}
      {onTestCalculations && hasValidLocation && (
        <View style={styles.testSection}>
          <TouchableOpacity 
            style={styles.testButton} 
            onPress={onTestCalculations}
            disabled={prayerTimesLoading}
          >
            <Text style={styles.testButtonText}>
              {prayerTimesLoading ? '⏳ Loading...' : 'Test Prayer Calculations'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Method comparison hint */}
      {hasValidLocation && todayPrayerTimes.length > 0 && (
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>
            💡 Tap on calculation method to preview different timing methods
          </Text>
        </View>
      )}
    </SettingSection>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  juristicMethodWrapper: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.primary,
  },
  juristicControl: {
    marginTop: 12,
  },
  juristicExplanation: {
    backgroundColor: theme.colors.settings.previewBg,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary.DEFAULT,
  },
  explanationText: {
    fontSize: 13,
    color: theme.colors.settings.labelPrimary,
    lineHeight: 18,
  },
  statusContainer: {
    backgroundColor: theme.colors.settings.previewBg,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  statusText: {
    fontSize: 14,
    color: theme.colors.settings.labelMuted,
    textAlign: 'center',
  },
  prayerTimesContainer: {
    backgroundColor: theme.colors.settings.previewBg,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.colors.settings.optionBorder,
  },
  prayerTimesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary.DEFAULT,
    marginBottom: 12,
  },
  prayerTimesList: {
    gap: 8,
  },
  prayerTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  prayerInfoSection: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 12,
  },
  prayerName: {
    fontSize: 14,
    color: theme.colors.settings.labelPrimary,
    fontWeight: '500',
  },
  nextPrayerName: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '700',
  },
  asrHighlight: {
    color: theme.colors.status.warning,
  },
  prayerTime: {
    fontSize: 14,
    color: theme.colors.settings.labelMuted,
    fontWeight: '400',
  },
  nextPrayerTime: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '600',
  },
  moreText: {
    fontSize: 13,
    color: theme.colors.settings.labelMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  testSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.primary,
  },
  testButton: {
    backgroundColor: theme.colors.settings.optionActiveBg,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.settings.optionActiveBorder,
  },
  testButtonText: {
    fontSize: 14,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '600',
  },
  hintContainer: {
    backgroundColor: theme.colors.settings.hintBg,
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.colors.settings.hintBorder,
  },
  hintText: {
    fontSize: 13,
    color: theme.colors.settings.hintText,
    textAlign: 'center',
    lineHeight: 16,
  },
});
