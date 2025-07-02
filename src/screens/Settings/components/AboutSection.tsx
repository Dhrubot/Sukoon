// src/screens/Settings/components/AboutSection.tsx
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { SettingSection } from '../../../components/settings/SettingSection';
import { SettingRow } from '../../../components/settings/SettingRow';

interface AboutSectionProps {
  onPrivacyPolicyPress: () => void;
}

export const AboutSection: React.FC<AboutSectionProps> = ({
  onPrivacyPolicyPress,
}) => (
  <SettingSection title="About">
    <SettingRow
      label="Privacy Policy"
      onPress={onPrivacyPolicyPress}
    />
    <Text style={styles.aboutText}>
      PrayerBuddy is a free app built with ❤️ for the Muslim community
    </Text>
  </SettingSection>
);

const styles = StyleSheet.create({
  aboutText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
});