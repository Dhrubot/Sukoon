import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { format } from 'date-fns';
import { SettingSection } from '../../../components/settings/SettingSection';
import { SettingRow } from '../../../components/settings/SettingRow';
import { SegmentedControl } from '../../../components/settings/SegmentedControl';
import StorageService from '../../../services/StorageService';
import { UserSettings, CalculationMethodType, PrayerTime } from '../../../types';

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
  const juristicOptions = [
    {
      value: 'Standard',
      label: 'Standard',
      description: 'Shafi, Maliki, Hanbali',
    },
    {
      value: 'Hanafi',
      label: 'Hanafi',
      description: 'Earlier Asr time',
    },
  ];

  // 🔧 FIXED: Immediate refresh when Asr method changes
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
          {todayPrayerTimes.slice(0, 3).map((prayer) => (
            <View key={prayer.name} style={styles.prayerTimeRow}>
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
              ? '⏰ Hanafi: Asr begins when shadow = 2× object length (earlier)'
              : '⏰ Standard: Asr begins when shadow = 1× object length (later)'
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
              {prayerTimesLoading ? '⏳ Loading...' : '🧪 Test Prayer Calculations'}
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

const styles = StyleSheet.create({
  juristicMethodWrapper: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  juristicControl: {
    marginTop: 12,
  },
  juristicExplanation: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#1B5E3F',
  },
  explanationText: {
    fontSize: 13,  // sm
    color: '#495057',
    lineHeight: 18,
  },
  
  // Prayer times preview styles
  statusContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  statusText: {
    fontSize: 14,  // md
    color: '#6C757D',
    textAlign: 'center',
  },
  prayerTimesContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  prayerTimesTitle: {
    fontSize: 16,  // lg
    fontWeight: '600',  // semibold
    color: '#1B5E3F',
    marginBottom: 12,
  },
  prayerTimesList: {
    gap: 8,
  },
  prayerTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prayerName: {
    fontSize: 14,  // md
    color: '#495057',
    fontWeight: '500',  // medium
  },
  nextPrayerName: {
    color: '#1B5E3F',
    fontWeight: '700',  // bold
  },
  asrHighlight: {
    color: '#FF6F00', // 🆕 Orange color for Asr to draw attention
  },
  prayerTime: {
    fontSize: 14,  // md
    color: '#6C757D',
    fontWeight: '400',  // regular
  },
  nextPrayerTime: {
    color: '#1B5E3F',
    fontWeight: '600',  // semibold
  },
  moreText: {
    fontSize: 13,  // sm (adjusted up)
    color: '#ADB5BD',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  
  // Test button styles
  testSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  testButton: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  testButtonText: {
    fontSize: 14,  // md
    color: '#1B5E3F',
    fontWeight: '600',  // semibold
  },
  
  // Hint styles
  hintContainer: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FFEAA7',
  },
  hintText: {
    fontSize: 13,  // sm (adjusted up)
    color: '#856404',
    textAlign: 'center',
    lineHeight: 16,
  },
});
