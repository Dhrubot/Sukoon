// src/components/common/TimeInput.tsx
// Reusable time input component with scroll-wheel pickers for hours, minutes, and AM/PM.
// Used for manual iqamah time entry and other time-related inputs.

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';

interface TimeInputProps {
  value: string; // "HH:mm" in 24h format (e.g., "13:30")
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1); // 1–12
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, 10, ..., 55

/**
 * Parse a "HH:mm" 24h string into { hour12, minute, period }.
 */
function parse24h(value: string): { hour12: number; minute: number; period: 'AM' | 'PM' } {
  const [hStr, mStr] = value.split(':');
  let h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute: m, period };
}

/**
 * Convert { hour12, minute, period } back to "HH:mm" 24h string.
 */
function to24h(hour12: number, minute: number, period: 'AM' | 'PM'): string {
  let h = hour12 % 12;
  if (period === 'PM') h += 12;
  return `${h.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

/**
 * Format "HH:mm" to display string like "1:30 PM".
 */
export function formatTime(value: string): string {
  const { hour12, minute, period } = parse24h(value);
  return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
}

const TimeInput: React.FC<TimeInputProps> = ({
  value,
  onChange,
  label,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [modalVisible, setModalVisible] = useState(false);

  const parsed = parse24h(value);
  const [hour, setHour] = useState(parsed.hour12);
  const [minute, setMinute] = useState(parsed.minute);
  const [period, setPeriod] = useState<'AM' | 'PM'>(parsed.period);

  // Sync internal state when value prop changes
  useEffect(() => {
    const p = parse24h(value);
    setHour(p.hour12);
    setMinute(p.minute);
    setPeriod(p.period);
  }, [value]);

  const handleConfirm = () => {
    onChange(to24h(hour, minute, period));
    setModalVisible(false);
  };

  const handleCancel = () => {
    // Reset to current value
    const p = parse24h(value);
    setHour(p.hour12);
    setMinute(p.minute);
    setPeriod(p.period);
    setModalVisible(false);
  };

  const displayValue = formatTime(value);

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={() => !disabled && setModalVisible(true)}
        activeOpacity={0.7}
        disabled={disabled}
      >
        {label && <Text style={styles.label}>{label}</Text>}
        <Text style={[styles.timeDisplay, disabled && styles.timeDisplayDisabled]}>
          {displayValue}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card.background }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
              {label || 'Set Time'}
            </Text>

            <View style={styles.pickerRow}>
              {/* Hour picker */}
              <View style={styles.pickerColumn}>
                <Text style={[styles.pickerLabel, { color: theme.colors.text.secondary }]}>
                  Hour
                </Text>
                <Picker
                  selectedValue={hour}
                  onValueChange={(v) => setHour(v as number)}
                  style={[styles.picker, { color: theme.colors.text.primary }]}
                  itemStyle={{ color: theme.colors.text.primary, fontSize: 20 }}
                >
                  {HOURS_12.map((h) => (
                    <Picker.Item key={h} label={h.toString()} value={h} />
                  ))}
                </Picker>
              </View>

              <Text style={[styles.colonSeparator, { color: theme.colors.text.primary }]}>:</Text>

              {/* Minute picker */}
              <View style={styles.pickerColumn}>
                <Text style={[styles.pickerLabel, { color: theme.colors.text.secondary }]}>
                  Min
                </Text>
                <Picker
                  selectedValue={minute}
                  onValueChange={(v) => setMinute(v as number)}
                  style={[styles.picker, { color: theme.colors.text.primary }]}
                  itemStyle={{ color: theme.colors.text.primary, fontSize: 20 }}
                >
                  {MINUTES.map((m) => (
                    <Picker.Item
                      key={m}
                      label={m.toString().padStart(2, '0')}
                      value={m}
                    />
                  ))}
                </Picker>
              </View>

              {/* AM/PM picker */}
              <View style={styles.pickerColumn}>
                <Text style={[styles.pickerLabel, { color: theme.colors.text.secondary }]}>
                  {' '}
                </Text>
                <Picker
                  selectedValue={period}
                  onValueChange={(v) => setPeriod(v as 'AM' | 'PM')}
                  style={[styles.picker, { color: theme.colors.text.primary }]}
                  itemStyle={{ color: theme.colors.text.primary, fontSize: 20 }}
                >
                  <Picker.Item label="AM" value="AM" />
                  <Picker.Item label="PM" value="PM" />
                </Picker>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={[styles.cancelText, { color: theme.colors.text.secondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: theme.colors.primary.DEFAULT }]}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
      paddingBottom: 40,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 16,
    },
    pickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pickerColumn: {
      flex: 1,
      alignItems: 'center',
    },
    pickerLabel: {
      fontSize: 12,
      fontWeight: '500',
      marginBottom: 4,
    },
    picker: {
      width: '100%',
      height: 150,
    },
    colonSeparator: {
      fontSize: 24,
      fontWeight: '700',
      marginTop: 20,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    cancelText: {
      fontSize: 16,
      fontWeight: '500',
    },
    confirmButton: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
      borderRadius: 12,
    },
    confirmText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });

export default TimeInput;
