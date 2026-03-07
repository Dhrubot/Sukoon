// src/components/MoonSightingPrompt.tsx
// Warm, spiritually-themed modal that appears on critical Hijri calendar
// transitions (Ramadan, Eid al-Fitr, Eid al-Adha) to confirm moon sighting.
// Shows once per event per year. Writes to hijriAdjustment setting.

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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
import { useTheme } from '../providers/ThemeProvider';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { AppTheme } from '../theme';
import { useStore } from '../store/useStore';
import {
  MoonSightingEvent,
  confirmMoonSighting,
  deferMoonSighting,
} from '../utils/moonSighting';

interface MoonSightingPromptProps {
  event: MoonSightingEvent;
  onDismiss: () => void;
}

const MoonSightingPrompt: React.FC<MoonSightingPromptProps> = ({
  event,
  onDismiss,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { updateUserSettings } = useStore();

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
  }, []);

  const handleYes = () => {
    updateUserSettings({ hijriAdjustment: event.yesAdjustment });
    confirmMoonSighting(event.type, event.rawDate.year);
    animateOut();
  };

  const handleNotYet = () => {
    updateUserSettings({ hijriAdjustment: event.noAdjustment });
    deferMoonSighting(event.type, event.rawDate.year);
    animateOut();
  };

  const handleFollowCalculations = () => {
    updateUserSettings({ hijriAdjustment: 0 });
    confirmMoonSighting(event.type, event.rawDate.year);
    animateOut();
  };

  const animateOut = () => {
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
    ]).start(() => {
      onDismiss();
    });
  };

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleFollowCalculations}
    >
      <View style={styles.modalContainer}>
        <TouchableWithoutFeedback onPress={handleFollowCalculations}>
          <Animated.View
            style={[styles.backdrop, { opacity: backdropAnim }]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.handle} />

          {/* Crescent */}
          <Text style={styles.emoji}>{event.emoji}</Text>

          {/* Title */}
          <Text style={styles.title}>{event.title}</Text>

          {/* Body */}
          <Text style={styles.body}>{event.body}</Text>

          {/* Primary: "Yes" */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleYes}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>{event.yesLabel}</Text>
          </TouchableOpacity>

          {/* Secondary: "Not yet" */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleNotYet}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>{event.noLabel}</Text>
          </TouchableOpacity>

          {/* Dismiss: "I follow calculations" */}
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleFollowCalculations}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissText}>I follow calculations</Text>
          </TouchableOpacity>

          {/* Footer hint */}
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
      marginBottom: 16,
    },
    body: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 28,
    },
    primaryButton: {
      width: '100%',
      backgroundColor: theme.colors.primary.DEFAULT,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: 12,
    },
    primaryButtonText: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.primary.contrast,
    },
    secondaryButton: {
      width: '100%',
      borderWidth: 1.5,
      borderColor: theme.colors.primary.DEFAULT,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: 16,
    },
    secondaryButtonText: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.primary.DEFAULT,
    },
    dismissButton: {
      paddingVertical: 8,
      alignItems: 'center',
      marginBottom: 16,
    },
    dismissText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.muted,
    },
    footer: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.muted,
      textAlign: 'center',
      opacity: 0.7,
    },
  });

export default MoonSightingPrompt;
