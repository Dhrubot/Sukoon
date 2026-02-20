// src/components/common/ThemedTimePicker.tsx
// Warm, themed bottom-sheet time picker that replaces the generic OS picker.
// Slides up from bottom with a drag handle. Fully integrated with the app theme.
// Supports both exact time (hour/minute/AM-PM) and offset (minutes) modes.

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  PanResponder,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = 380;

// ─── Data ────────────────────────────────────────────────────────

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => i);
const MINUTES_5 = Array.from({ length: 12 }, (_, i) => i * 5);

// ─── Helpers ─────────────────────────────────────────────────────

function parse24h(value: string): { hour12: number; minute: number; period: 'AM' | 'PM' } {
  const [hStr, mStr] = value.split(':');
  let h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute: m, period };
}

function to24h(hour12: number, minute: number, period: 'AM' | 'PM'): string {
  let h = hour12 % 12;
  if (period === 'PM') h += 12;
  return `${h.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

// ─── Props ───────────────────────────────────────────────────────

interface ThemedTimePickerProps {
  visible: boolean;
  title?: string;
  value: string; // "HH:mm" 24h format
  onChange: (value: string) => void;
  onClose: () => void;
  minuteInterval?: 1 | 5; // 1 = every minute, 5 = every 5 min (default)
}

// ─── Component ───────────────────────────────────────────────────

const ThemedTimePicker: React.FC<ThemedTimePickerProps> = ({
  visible,
  title = 'Set Time',
  value,
  onChange,
  onClose,
  minuteInterval = 5,
}) => {
  const { theme, themeMode } = useTheme();
  const styles = useThemedStyles(createStyles);

  // Colors used by native Picker on both platforms
  // Android native picker dialog always has a light background,
  // so force dark text there regardless of theme mode.
  const pickerTextColor =
    Platform.OS === 'android' && themeMode === 'dark'
      ? '#1C1C1E'
      : theme.colors.text.primary;

  const parsed = parse24h(value);
  const [hour, setHour] = useState(parsed.hour12);
  const [minute, setMinute] = useState(parsed.minute);
  const [period, setPeriod] = useState<'AM' | 'PM'>(parsed.period);

  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const minuteOptions = minuteInterval === 1 ? MINUTES_60 : MINUTES_5;

  // Sync internal state when value prop changes
  useEffect(() => {
    const p = parse24h(value);
    setHour(p.hour12);
    setMinute(p.minute);
    setPeriod(p.period);
  }, [value]);

  // Animate in/out
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          stiffness: 200,
          damping: 25,
          mass: 1,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const animateOut = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => callback?.());
  };

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = to24h(hour, minute, period);
    animateOut(() => {
      onChange(result);
      onClose();
    });
  };

  const handleCancel = () => {
    // Reset to original
    const p = parse24h(value);
    setHour(p.hour12);
    setMinute(p.minute);
    setPeriod(p.period);
    animateOut(onClose);
  };

  // Swipe-down to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 80) {
          handleCancel();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            stiffness: 200,
            damping: 25,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={handleCancel}>
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropAnim }]}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleCancel} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Drag handle */}
        <View {...panResponder.panHandlers} style={styles.handleArea}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} activeOpacity={0.7} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={handleConfirm} activeOpacity={0.7} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.confirmText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Picker wheels */}
        <View style={styles.pickerRow}>
          {/* Hour */}
          <View style={styles.pickerColumn}>
            <Picker
              selectedValue={hour}
              onValueChange={(v) => setHour(v as number)}
              style={styles.picker}
              itemStyle={[styles.pickerItem, { color: pickerTextColor }]}
              dropdownIconColor={pickerTextColor}
              selectionColor={theme.colors.primary.DEFAULT + '30'}
              // @ts-ignore — themeVariant is typed on PickerIOS but forwarded by cross-platform Picker
              themeVariant={themeMode}
              mode={Platform.OS === 'android' ? 'dropdown' : undefined}
            >
              {HOURS_12.map((h) => (
                <Picker.Item key={h} label={h.toString()} value={h} color={pickerTextColor} />
              ))}
            </Picker>
          </View>

          <Text style={styles.colonSeparator}>:</Text>

          {/* Minute */}
          <View style={styles.pickerColumn}>
            <Picker
              selectedValue={minute}
              onValueChange={(v) => setMinute(v as number)}
              style={styles.picker}
              itemStyle={[styles.pickerItem, { color: pickerTextColor }]}
              dropdownIconColor={pickerTextColor}
              selectionColor={theme.colors.primary.DEFAULT + '30'}
              // @ts-ignore
              themeVariant={themeMode}
              mode={Platform.OS === 'android' ? 'dropdown' : undefined}
            >
              {minuteOptions.map((m) => (
                <Picker.Item key={m} label={m.toString().padStart(2, '0')} value={m} color={pickerTextColor} />
              ))}
            </Picker>
          </View>

          {/* AM / PM */}
          <View style={styles.pickerColumnNarrow}>
            <Picker
              selectedValue={period}
              onValueChange={(v) => setPeriod(v as 'AM' | 'PM')}
              style={styles.picker}
              itemStyle={[styles.pickerItem, { color: pickerTextColor }]}
              dropdownIconColor={pickerTextColor}
              selectionColor={theme.colors.primary.DEFAULT + '30'}
              // @ts-ignore
              themeVariant={themeMode}
              mode={Platform.OS === 'android' ? 'dropdown' : undefined}
            >
              <Picker.Item label="AM" value="AM" color={pickerTextColor} />
              <Picker.Item label="PM" value="PM" color={pickerTextColor} />
            </Picker>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
};

// ─── Styles ──────────────────────────────────────────────────────

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    sheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: SHEET_HEIGHT,
      backgroundColor: theme.colors.card.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 34, // safe area
      // Shadow
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
    },
    handleArea: {
      alignItems: 'center',
      paddingVertical: 10,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.border.primary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    title: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.colors.text.primary,
    },
    cancelText: {
      fontSize: 16,
      fontWeight: '400',
      color: theme.colors.text.secondary,
    },
    confirmText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.primary.DEFAULT,
    },
    pickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      flex: 1,
    },
    pickerColumn: {
      flex: 2,
      alignItems: 'center',
    },
    pickerColumnNarrow: {
      flex: 1.5,
      alignItems: 'center',
    },
    picker: {
      width: '100%',
      height: 200,
    },
    pickerItem: {
      fontSize: 22,
      fontWeight: '500',
    },
    colonSeparator: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text.primary,
      marginHorizontal: -4,
      marginTop: -4,
    },
  });

export default ThemedTimePicker;
