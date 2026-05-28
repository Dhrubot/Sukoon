// src/screens/Settings/components/AboutSection.tsx
import React from 'react';
import { Alert, Linking } from 'react-native';
import { SettingSection } from '../../../components/settings/SettingSection';
import { SettingRow } from '../../../components/settings/SettingRow';
import { getSupportMailtoUri, supportEmail } from '../../../utils/supportConfig';

interface AboutSectionProps {
  onPrivacyPolicy: () => void;
  onSupport?: () => void;
  onShowDebugInfo?: () => Promise<void>;
  showSupport?: boolean;
}

const handleContactSupport = async () => {
  const uri = getSupportMailtoUri('Sukoon Support Request');
  const canOpen = await Linking.canOpenURL(uri);
  if (canOpen) {
    await Linking.openURL(uri);
  } else {
    Alert.alert(
      'No email client found',
      `Please email us at ${supportEmail}`,
      [{ text: 'OK' }],
    );
  }
};

export const AboutSection: React.FC<AboutSectionProps> = ({
  onPrivacyPolicy,
  onSupport,
  onShowDebugInfo,
  showSupport = false,
}) => {
  return (
  <SettingSection title="About">
    <SettingRow
      label="Privacy Policy"
      onPress={onPrivacyPolicy}
    />
    <SettingRow
      label="Contact Support"
      subtitle={supportEmail}
      onPress={handleContactSupport}
    />
    {showSupport && onSupport && (
      <SettingRow
        label="Support Sukoon"
        subtitle="Optional sadaqah to help sustain the app"
        onPress={onSupport}
      />
    )}
    {onShowDebugInfo && (
      <SettingRow
        label="Debug Information"
        onPress={onShowDebugInfo}
      />
    )}
  </SettingSection>
  );
};
