// src/screens/Settings/components/AboutSection.tsx
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { SettingSection } from '../../../components/settings/SettingSection';
import { SettingRow } from '../../../components/settings/SettingRow';
import { useThemedStyles } from '../../../hooks/useThemedStyles';
import { AppTheme } from '../../../theme';

interface AboutSectionProps {
  onPrivacyPolicy: () => void;
  onShowDebugInfo?: () => Promise<void>;
}

export const AboutSection: React.FC<AboutSectionProps> = ({
  onPrivacyPolicy,
  onShowDebugInfo,
}) => {
  const styles = useThemedStyles(createStyles);
  return (
  <SettingSection title="About">
    <SettingRow
      label="Privacy Policy"
      onPress={onPrivacyPolicy}
    />
    {onShowDebugInfo && (
      <SettingRow
        label="Debug Information"
        onPress={onShowDebugInfo}
      />
    )}
    <Text style={styles.aboutText}>
      Sukoon is a free app built with ❤️ for the Muslim community
    </Text>
  </SettingSection>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  aboutText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
});