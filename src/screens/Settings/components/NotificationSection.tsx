// src/screens/Settings/components/NotificationSection.tsx
import React from 'react';
import { SettingSection } from '../../../components/settings/SettingSection';
import { SettingRow } from '../../../components/settings/SettingRow';
import { UserSettings } from '../../../types';

interface NotificationSectionProps {
  userSettings: UserSettings;
  onNotificationPress: () => void;
}

export const NotificationSection: React.FC<NotificationSectionProps> = ({
  userSettings,
  onNotificationPress,
}) => {
  const getNotificationSubtitle = () => {
    if (!userSettings.notifications.enabled) return 'Disabled';
    
    let subtitle = 'Enabled';
    if (userSettings.notifications.beforePrayer > 0) {
      subtitle += ` • ${userSettings.notifications.beforePrayer} min before`;
    }
    return subtitle;
  };

  return (
    <SettingSection title="Notifications">
      <SettingRow
        label="Prayer Reminders"
        subtitle={getNotificationSubtitle()}
        onPress={onNotificationPress}
      />
    </SettingSection>
  );
};
