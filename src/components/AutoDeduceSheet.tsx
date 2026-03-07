// src/components/AutoDeduceSheet.tsx
// Celebratory bottom sheet shown when the Hijri date can be auto-deduced
// (e.g. Ramadan 30 → tomorrow MUST be Eid, since a month cannot be 31 days).
// This is informational, not a question — just a joyful confirmation.

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
import { AutoDeduceEvent } from '../utils/moonSighting';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AutoDeduceSheetProps {
  visible: boolean;
  event: AutoDeduceEvent | null;
  onDismiss: () => void;
}

const AutoDeduceSheet: React.FC<AutoDeduceSheetProps> = ({
  visible,
  event,
  onDismiss,
}) => {
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

  if (!event) return null;

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

          <Text style={styles.emoji}>{event.emoji}</Text>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.body}>{event.body}</Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onDismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Alhamdulillah</Text>
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
      fontSize: 56,
      marginBottom: 16,
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
      marginBottom: 28,
    },
    primaryButton: {
      width: '100%',
      backgroundColor: theme.colors.primary.DEFAULT,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
    },
    primaryButtonText: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.primary.contrast,
    },
  });

export default AutoDeduceSheet;
