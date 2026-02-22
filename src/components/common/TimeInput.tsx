// src/components/common/TimeInput.tsx
// Reusable time input component that opens a themed bottom-sheet picker.
// Used for manual iqamah time entry and other time-related inputs.

import React, { useState } from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import ThemedTimePicker from './ThemedTimePicker';

interface TimeInputProps {
  value: string; // "HH:mm" in 24h format (e.g., "13:30")
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
}

/**
 * Format "HH:mm" to display string like "1:30 PM".
 */
export function formatTime(value: string): string {
  const [hStr, mStr] = value.split(':');
  let h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  const period = h >= 12 ? 'PM' : 'AM';
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

const TimeInput: React.FC<TimeInputProps> = ({
  value,
  onChange,
  label,
  disabled = false,
}) => {
  const styles = useThemedStyles(createStyles);
  const [pickerVisible, setPickerVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={() => !disabled && setPickerVisible(true)}
        activeOpacity={0.7}
        disabled={disabled}
      >
        {label && <Text style={styles.label}>{label}</Text>}
        <Text style={[styles.timeDisplay, disabled && styles.timeDisplayDisabled]}>
          {formatTime(value)}
        </Text>
      </TouchableOpacity>

      <ThemedTimePicker
        visible={pickerVisible}
        title={label || 'Set Time'}
        value={value}
        onChange={onChange}
        onClose={() => setPickerVisible(false)}
      />
    </>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: theme.colors.card.background,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    triggerDisabled: {
      opacity: 0.5,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text.primary,
    },
    timeDisplay: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.primary.DEFAULT,
    },
    timeDisplayDisabled: {
      color: theme.colors.text.muted,
    },
  });

export default TimeInput;
