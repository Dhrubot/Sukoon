// src/components/settings/SettingRow.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface SettingRowProps {
  label: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  rightComponent?: React.ReactNode;
  isDanger?: boolean;
}

export const SettingRow: React.FC<SettingRowProps> = ({
  label,
  subtitle,
  value,
  onPress,
  rightComponent,
  isDanger = false,
}) => {
  const Component = onPress ? TouchableOpacity : View;
  
  return (
    <Component
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.leftContent}>
        <Text style={[styles.settingLabel, isDanger && styles.dangerText]}>
          {label}
        </Text>
        {subtitle && (
          <Text style={styles.settingSubtext}>
            {subtitle}
          </Text>
        )}
      </View>
      
      <View style={styles.rightContent}>
        {rightComponent || (
          <>
            {value && (
              <Text style={styles.settingValue}>
                {value}
              </Text>
            )}
            {onPress && <Text style={styles.chevron}>›</Text>}
          </>
        )}
      </View>
    </Component>
  );
};

const styles = StyleSheet.create({
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  leftContent: {
    flex: 1,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingLabel: {
    fontSize: 16,
    color: '#212121',
  },
  settingSubtext: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
    lineHeight: 18,
  },
  settingValue: {
    fontSize: 16,
    color: '#757575',
  },
  chevron: {
    fontSize: 20,
    color: '#757575',
  },
  dangerText: {
    color: '#F44336',
  },
});