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
import { withAlpha } from '../../utils/color';

interface SettingRowProps {
  label: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  rightComponent?: React.ReactNode;
  icon?: React.ReactNode;
  iconColor?: string;
  isDanger?: boolean;
  disabled?: boolean;
}

export const SettingRow: React.FC<SettingRowProps> = ({
  label,
  subtitle,
  value,
  onPress,
  rightComponent,
  icon,
  iconColor,
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
      {icon && (
        <View style={[
          styles.iconWrap,
          { backgroundColor: withAlpha(iconColor || theme.colors.primary.DEFAULT, 0.1) },
        ]}>
          {icon}
        </View>
      )}
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
            {onPress && <Text style={[styles.chevron, disabled && styles.disabledText, { color: theme.colors.text.muted }]}>›</Text>}
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
    gap: theme.spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodyMedium,
  },
  settingSubtext: {
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.body,
    marginTop: theme.spacing.xs,
  },
  settingValue: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
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
