// src/components/common/ThemedTimePicker.tsx
// Warm, themed bottom-sheet time picker that replaces the generic OS picker.
// Slides up from bottom with a drag handle. Fully integrated with the app theme.
// Supports both exact time (hour/minute/AM-PM) and offset (minutes) modes.

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = 380;
const WHEEL_ITEM_HEIGHT = 44;
const WHEEL_VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ITEMS;

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

// ─── Android Wheel Picker ────────────────────────────────────────

interface WheelPickerProps<T extends string | number> {
  data: T[];
  selectedValue: T;
  onValueChange: (value: T) => void;
  labelFn?: (value: T) => string;
  textColor: string;
  selectedBgColor: string;
  style?: object;
}

function AndroidWheelPicker<T extends string | number>({
  data,
  selectedValue,
  onValueChange,
  labelFn,
  textColor,
  selectedBgColor,
  style,
}: WheelPickerProps<T>) {
  const flatListRef = useRef<FlatList>(null);
  const isUserScrolling = useRef(false);
  const pendingScroll = useRef(false);

  // Padding items so the first/last real item can be centered
  const padCount = Math.floor(WHEEL_VISIBLE_ITEMS / 2);
  const paddedData: (T | null)[] = [
    ...Array(padCount).fill(null),
    ...data,
    ...Array(padCount).fill(null),
  ];

  const selectedIndex = data.indexOf(selectedValue);

  // Scroll to selected item on mount or when selectedValue changes externally
  useEffect(() => {
    if (selectedIndex >= 0 && flatListRef.current && !isUserScrolling.current) {
      pendingScroll.current = true;
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: selectedIndex * WHEEL_ITEM_HEIGHT,
          animated: false,
        });
        pendingScroll.current = false;
      }, 50);
    }
  }, [selectedIndex]);

  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      isUserScrolling.current = false;
      const offsetY = e.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / WHEEL_ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
      if (data[clampedIndex] !== selectedValue) {
        onValueChange(data[clampedIndex]);
      }
    },
    [data, selectedValue, onValueChange]
  );

  const handleScrollBeginDrag = useCallback(() => {
    isUserScrolling.current = true;
  }, []);

  const getLabel = (item: T): string => {
    if (labelFn) return labelFn(item);
    return String(item);
  };

  const renderItem = useCallback(
    ({ item, index: flatIndex }: { item: T | null; index: number }) => {
      if (item === null) {
        return <View style={{ height: WHEEL_ITEM_HEIGHT }} />;
      }
      const realIndex = flatIndex - padCount;
      const isSelected = realIndex === selectedIndex;
      return (
        <View
          style={[
            {
              height: WHEEL_ITEM_HEIGHT,
              justifyContent: 'center',
              alignItems: 'center',
            },
            isSelected && {
              backgroundColor: selectedBgColor,
              borderRadius: 10,
            },
          ]}
        >
          <Text
            style={{
              fontSize: isSelected ? 22 : 18,
              fontWeight: isSelected ? '600' : '400',
              color: textColor,
              opacity: isSelected ? 1 : 0.4,
            }}
          >
            {getLabel(item)}
          </Text>
        </View>
      );
    },
    [selectedIndex, textColor, selectedBgColor, padCount]
  );

  const keyExtractor = useCallback(
    (_: T | null, index: number) => `wheel-${index}`,
    []
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: WHEEL_ITEM_HEIGHT,
      offset: WHEEL_ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  return (
    <View style={[{ height: WHEEL_HEIGHT, overflow: 'hidden' }, style]}>
      <FlatList
        ref={flatListRef}
        data={paddedData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        bounces={false}
        nestedScrollEnabled
      />
    </View>
  );
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
  const pickerTextColor = theme.colors.text.primary;
  const pickerBgColor = theme.colors.card.background;

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
          {Platform.OS === 'ios' ? (
            <>
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
                >
                  {HOURS_12.map((h) => (
                    <Picker.Item key={h} label={h.toString()} value={h} />
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
                >
                  {minuteOptions.map((m) => (
                    <Picker.Item key={m} label={m.toString().padStart(2, '0')} value={m} />
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
                >
                  <Picker.Item label="AM" value="AM" />
                  <Picker.Item label="PM" value="PM" />
                </Picker>
              </View>
            </>
          ) : (
            <>
              {/* Android: custom scroll-wheel pickers */}
              <View style={styles.pickerColumn}>
                <AndroidWheelPicker
                  data={HOURS_12}
                  selectedValue={hour}
                  onValueChange={(v) => setHour(v as number)}
                  labelFn={(h) => h.toString()}
                  textColor={pickerTextColor}
                  selectedBgColor={theme.colors.primary.DEFAULT + '18'}
                />
              </View>

              <Text style={styles.colonSeparator}>:</Text>

              <View style={styles.pickerColumn}>
                <AndroidWheelPicker
                  data={minuteOptions}
                  selectedValue={minute}
                  onValueChange={(v) => setMinute(v as number)}
                  labelFn={(m) => m.toString().padStart(2, '0')}
                  textColor={pickerTextColor}
                  selectedBgColor={theme.colors.primary.DEFAULT + '18'}
                />
              </View>

              <View style={styles.pickerColumnNarrow}>
                <AndroidWheelPicker
                  data={['AM' as const, 'PM' as const]}
                  selectedValue={period}
                  onValueChange={(v) => setPeriod(v as 'AM' | 'PM')}
                  textColor={pickerTextColor}
                  selectedBgColor={theme.colors.primary.DEFAULT + '18'}
                />
              </View>
            </>
          )}
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
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
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
      paddingVertical: theme.spacing.md - 2,
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
      paddingHorizontal: theme.spacing.xl,
      paddingBottom: theme.spacing.sm,
    },
    title: {
      fontSize: theme.typography.fontSize.lg + 1,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
    },
    cancelText: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
    },
    confirmText: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.primary.DEFAULT,
    },
    pickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
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
      fontSize: theme.typography.fontSize['2xl'] + 2,
      fontFamily: theme.typography.fontFamily.bodyMedium,
    },
    colonSeparator: {
      fontSize: theme.typography.fontSize['3xl'],
      fontFamily: theme.typography.fontFamily.bodyBold,
      color: theme.colors.text.primary,
      marginHorizontal: -4,
      marginTop: -4,
    },
  });

export default ThemedTimePicker;
