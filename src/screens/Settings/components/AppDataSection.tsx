// src/screens/Settings/components/AppDataSection.tsx
import React from 'react';
import { SettingSection } from '../../../components/settings/SettingSection';
import { SettingRow } from '../../../components/settings/SettingRow';

interface AppDataSectionProps {
  onExportData: () => void;
  onImportData: () => void;
  onResetApp: () => void;
}

export const AppDataSection: React.FC<AppDataSectionProps> = ({
  onExportData,
  onImportData,
  onResetApp,
}) => (
  <SettingSection title="App Data">
    <SettingRow
      label="Export Prayer Data"
      onPress={onExportData}
    />
    <SettingRow
      label="Import Prayer Data"
      onPress={onImportData}
    />
    <SettingRow
      label="Reset App"
      onPress={onResetApp}
      isDanger
    />
  </SettingSection>
);
