// src/components/prayer/PreAdhanSheet.tsx
// Bottom sheet shown when user taps "Prepare for Prayer" before adhan has happened.
// Islamically, fard prayer cannot be performed before its time enters.
// Offers alternatives: make up a missed prayer or pray sunnah/nafl.

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
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import PrayerTimeService from '../../services/PrayerTimeService';
import { PrayerName } from '../../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PreAdhanSheetProps {
  visible: boolean;
  /** The upcoming fard prayer whose adhan hasn't happened */
  prayerName: PrayerName;
  /** A previous prayer that hasn't been prayed yet (optional) */
  missedPrayerName?: PrayerName;
  onMakeUpPrayer?: () => void;
  onPraySunnah: () => void;
  onDismiss: () => void;
}

const PreAdhanSheet: React.FC<PreAdhanSheetProps> = ({
  visible,
  prayerName,
  missedPrayerName,
  onMakeUpPrayer,
  onPraySunnah,
  onDismiss,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
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

  const displayName = PrayerTimeService.getPrayerDisplayName(prayerName);
  const missedDisplayName = missedPrayerName
    ? PrayerTimeService.getPrayerDisplayName(missedPrayerName)
    : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.modalContainer}>
        <TouchableWithoutFeedback onPress={onDismiss}>
          <Animated.View
            style={[styles.backdrop, { opacity: backdropAnim }]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.handle} />

          <Text style={styles.title}>{displayName} begins later</Text>

          <Text style={styles.message}>
            The time for {displayName} has not entered yet, so this fard prayer should wait until its adhan.
            {'\n\n'}
            If you wish, you can make up an earlier prayer or spend this moment in Sunnah or Nafl.
          </Text>

          {/* Option A: Make up a missed prayer */}
          {missedDisplayName && onMakeUpPrayer && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onMakeUpPrayer}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>
                Make Up {missedDisplayName}
              </Text>
            </TouchableOpacity>
          )}

          {/* Option B: Pray Sunnah/Nafl */}
          <TouchableOpacity
            style={[
              missedDisplayName ? styles.outlineButton : styles.primaryButton,
            ]}
            onPress={onPraySunnah}
            activeOpacity={0.8}
          >
            <Text
              style={[
                missedDisplayName
                  ? styles.outlineButtonText
                  : styles.primaryButtonText,
              ]}
            >
              Pray Sunnah / Nafl
            </Text>
          </TouchableOpacity>

          {/* Dismiss */}
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissButtonText}>Wait for adhan</Text>
          </TouchableOpacity>
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
      paddingHorizontal: theme.spacing['2xl'],
      paddingBottom: theme.spacing['4xl'],
      paddingTop: theme.spacing.md,
    },
    handle: {
      width: theme.spacing['4xl'],
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.border.primary,
      alignSelf: 'center',
      marginBottom: theme.spacing.xl,
    },
    title: {
      fontSize: theme.typography.fontSize['2xl'],
      fontFamily: theme.typography.fontFamily.heading,
      color: theme.colors.text.primary,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    message: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: theme.spacing['2xl'],
    },
    primaryButton: {
      backgroundColor: theme.colors.primary.DEFAULT,
      borderRadius: theme.borderRadius.lg,
      paddingVertical: theme.spacing.lg,
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    primaryButtonText: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.primary.contrast,
    },
    outlineButton: {
      borderWidth: 1.5,
      borderColor: theme.colors.primary.DEFAULT,
      borderRadius: theme.borderRadius.lg,
      paddingVertical: theme.spacing.lg,
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    outlineButtonText: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.primary.DEFAULT,
    },
    dismissButton: {
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
    },
    dismissButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.muted,
    },
  });

export default PreAdhanSheet;
