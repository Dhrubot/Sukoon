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
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';

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
  const styles = useThemedStyles(createStyles);

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

const createStyles = (theme: AppTheme) => StyleSheet.create({
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  leftContent: {
    flex: 1,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  settingLabel: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.bodyMedium,
  },
  settingSubtext: {
    fontSize: theme.typography.fontSize.sm,
    marginTop: theme.spacing.xs,
  },
  settingValue: {
    fontSize: theme.typography.fontSize.base,
    marginRight: theme.spacing.sm,
  },
  chevron: {
    fontSize: theme.typography.fontSize['3xl'],
    fontFamily: theme.typography.fontFamily.body,
  },
  dangerText: {
    color: '#EF4444',
  },
  disabledText: {
    color: '#94A3B8',
  },
  disabledRow: {
    opacity: 0.7,
  },
});