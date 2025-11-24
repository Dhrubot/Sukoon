// src/components/settings/SettingRow.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';

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
  const { theme } = useTheme();

  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      style={[styles.settingRow, disabled && styles.disabledRow]}
      onPress={onPress}
      disabled={disabled || !onPress}
    >
      <View style={styles.leftContent}>
        <Text style={[styles.settingLabel, isDanger && styles.dangerText, disabled && styles.disabledText, { color: theme.colors.text.primary }]}>{label}</Text>
        {subtitle && (
          <Text style={[styles.settingSubtext, disabled && styles.disabledText, { color: theme.colors.text.muted }]}>{subtitle}</Text>
        )}
      </View>

      <View style={styles.rightContent}>
        {rightComponent || (
          <>
            {value && (
              <Text style={[styles.settingValue, disabled && styles.disabledText, { color: theme.colors.text.secondary }]}>{value}</Text>
            )}
            {onPress && <Text style={[styles.chevron, disabled && styles.disabledText, { color: theme.colors.primary.DEFAULT }]}>›</Text>}
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
    fontWeight: '500',
  },
  settingSubtext: {
    fontSize: 13,
    marginTop: 4,
  },
  settingValue: {
    fontSize: 15,
    marginRight: 8,
  },
  chevron: {
    fontSize: 24,
    fontWeight: '300',
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