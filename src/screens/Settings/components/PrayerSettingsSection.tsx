// src/screens/Settings/components/PrayerSettingsSection.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SettingSection } from '../../../components/settings/SettingSection';
import { SettingRow } from '../../../components/settings/SettingRow';
import { SegmentedControl } from '../../../components/settings/SegmentedControl';
import { CalculationMethodType, UserSettings } from '../../../types';
import StorageService from '../../../services/StorageService';

interface PrayerSettingsSectionProps {
  userSettings: UserSettings;
  setUserSettings: (settings: UserSettings) => void;
  onCalculationMethodPress: () => void;
  calculationMethods: CalculationMethodType[];
}

export const PrayerSettingsSection: React.FC<PrayerSettingsSectionProps> = ({
  userSettings,
  setUserSettings,
  onCalculationMethodPress,
  calculationMethods,
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

  const handleJuristicChange = (value: string) => {
    const updated = { ...userSettings, asrJuristic: value as 'Standard' | 'Hanafi' };
    StorageService.setUserSettings(updated);
    setUserSettings(updated);
  };

  const getCurrentMethodLabel = () => {
    return calculationMethods.find(m => m.value === userSettings.calculationMethod)?.label || 'Unknown';
  };

  return (
    <SettingSection title="Prayer Settings">
      <SettingRow
        label="Calculation Method"
        value={getCurrentMethodLabel()}
        onPress={onCalculationMethodPress}
      />

      <View style={styles.juristicMethodWrapper}>
        <SettingRow
          label="Juristic Method"
          subtitle="Asr prayer calculation method"
        />
        
        <SegmentedControl
          options={juristicOptions}
          selectedValue={userSettings.asrJuristic === 'Hanafi' ? 'Hanafi' : 'Standard'}
          onValueChange={handleJuristicChange}
          style={styles.juristicControl}
        />
      </View>
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
});
