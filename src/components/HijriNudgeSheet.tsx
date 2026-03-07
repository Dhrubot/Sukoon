// src/components/HijriNudgeSheet.tsx
// Bottom sheet shown once per session during days 1–3 of Ramadan, Shawwal,
// Dhul Hijjah when the user hasn't confirmed the moon sighting.
// Replaces the old persistent HijriNudgeCard with a less intrusive sheet.

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Modal,
} from 'react-native';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { AppTheme } from '../theme';
import { useStore } from '../store/useStore';
import { HijriNudgeEvent, confirmMoonSighting } from '../utils/moonSighting';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface HijriNudgeSheetProps {
  visible: boolean;
  nudge: HijriNudgeEvent | null;
  onDismissed: () => void;
}

const HijriNudgeSheet: React.FC<HijriNudgeSheetProps> = ({
  visible,
  nudge,
  onDismissed,
}) => {
  const styles = useThemedStyles(createStyles);
  const { updateUserSettings } = useStore();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleAdjust = (offset: -1 | 0 | 1) => {
    if (!nudge) return;
    updateUserSettings({ hijriAdjustment: offset });
    confirmMoonSighting(nudge.type, nudge.currentYear);
    onDismissed();
  };

  if (!nudge) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismissed}
    >
      <View style={styles.modalContainer}>
        <TouchableWithoutFeedback onPress={onDismissed}>
          <Animated.View
            style={[styles.backdrop, { opacity: backdropAnim }]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.handle} />

          <Text style={styles.emoji}>🌙</Text>

          <Text style={styles.title}>
            Is today {nudge.currentDay} {nudge.currentMonth}?
          </Text>

          <Text style={styles.body}>
            Our calculations show this date. If your community follows a
            different sighting, you can adjust below.
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => handleAdjust(-1)}
              activeOpacity={0.7}
            >
              <Text style={styles.adjustButtonText}>−1 Day</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.adjustButton, styles.correctButton]}
              onPress={() => handleAdjust(0)}
              activeOpacity={0.7}
            >
              <Text style={[styles.adjustButtonText, styles.correctButtonText]}>
                Correct
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => handleAdjust(1)}
              activeOpacity={0.7}
            >
              <Text style={styles.adjustButtonText}>+1 Day</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>
            You can always change this in Settings → Hijri Calendar
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.background.overlay,
    },
    sheet: {
      backgroundColor: theme.colors.card.background,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      paddingHorizontal: 24,
      paddingBottom: 40,
      paddingTop: 12,
      alignItems: 'center',
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.border.primary,
      alignSelf: 'center',
      marginBottom: 20,
    },
    emoji: {
      fontSize: 48,
      marginBottom: 12,
    },
    title: {
      fontSize: theme.typography.fontSize['2xl'],
      fontFamily: theme.typography.fontFamily.heading,
      color: theme.colors.text.primary,
      textAlign: 'center',
      marginBottom: 12,
    },
    body: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
    },
    buttonRow: {
      flexDirection: 'row',
      width: '100%',
      gap: 10,
      marginBottom: 20,
    },
    adjustButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: theme.colors.border.primary,
      alignItems: 'center',
    },
    adjustButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.secondary,
    },
    correctButton: {
      backgroundColor: theme.colors.primary.DEFAULT,
      borderColor: theme.colors.primary.DEFAULT,
    },
    correctButtonText: {
      color: theme.colors.primary.contrast,
    },
    footer: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.muted,
      textAlign: 'center',
    },
  });

export default HijriNudgeSheet;
