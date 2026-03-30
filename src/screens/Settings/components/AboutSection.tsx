// src/screens/Settings/components/AboutSection.tsx
import React from 'react';
import { SettingSection } from '../../../components/settings/SettingSection';
import { SettingRow } from '../../../components/settings/SettingRow';

interface AboutSectionProps {
  onPrivacyPolicy: () => void;
  onSupport?: () => void;
  onShowDebugInfo?: () => Promise<void>;
  showSupport?: boolean;
}

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
