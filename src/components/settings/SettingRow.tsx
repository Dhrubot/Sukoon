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
  disabled?: boolean;
}

export const SettingRow: React.FC<SettingRowProps> = ({
  label,
  subtitle,
  value,
  onPress,
  rightComponent,
  isDanger = false,
  disabled = false,
}) => {
  const Component = onPress ? TouchableOpacity : View;
  
  return (
    <Component
      style={[styles.settingRow, disabled && styles.disabledRow]}
      onPress={onPress}
      disabled={disabled || !onPress}
    >
      <View style={styles.leftContent}>
        <Text style={[styles.settingLabel, isDanger && styles.dangerText, disabled && styles.disabledText]}>
          {label}
        </Text>
        {subtitle && (
          <Text style={[styles.settingSubtext, disabled && styles.disabledText]}>
            {subtitle}
          </Text>
        )}
      </View>
      
      <View style={styles.rightContent}>
        {rightComponent || (
          <>
            {value && (
              <Text style={[styles.settingValue, disabled && styles.disabledText]}>
                {value}
              </Text>
            )}
            {onPress && <Text style={[styles.chevron, disabled && styles.disabledText]}>›</Text>}
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
    color: '#FFFFFF', // White text
  },
  settingSubtext: {
    fontSize: 14,
    color: '#A0AEC0', // Gray secondary text
    marginTop: 4,
    lineHeight: 18,
  },
  settingValue: {
    fontSize: 16,
    color: '#A0AEC0', // Gray secondary text
  },
  chevron: {
    fontSize: 20,
    color: '#00C9A7', // Turquoise accent
  },
  dangerText: {
    color: '#F44336',
  },
  disabledText: {
    color: '#BDBDBD',
  },
  disabledRow: {
    opacity: 0.7,
  },
});