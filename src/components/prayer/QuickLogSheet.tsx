// src/components/prayer/QuickLogSheet.tsx
// Lightweight bottom sheet for one-tap prayer logging without full MindfulnessFlow
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
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import PrayerTimeService from '../../services/PrayerTimeService';
import { PrayerName } from '../../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface QuickLogSheetProps {
  visible: boolean;
  prayerName: PrayerName | null;
  onConfirm: () => void;
  onOpenFlow: () => void;
  onDismiss: () => void;
}

const QuickLogSheet: React.FC<QuickLogSheetProps> = ({
  visible,
  prayerName,
  onConfirm,
  onOpenFlow,
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

  const displayName = prayerName
    ? PrayerTimeService.getPrayerDisplayName(prayerName)
    : '';

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
            style={[
              styles.backdrop,
              { opacity: backdropAnim },
            ]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.handle} />

          <Text style={styles.title}>Mark {displayName} as Prayed?</Text>

          <Text style={styles.message}>
            You can log your prayer quickly, or take a moment to prepare mindfully.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onConfirm}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              I Prayed {displayName}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onOpenFlow}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Prepare Mindfully</Text>
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
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 24,
      paddingBottom: 40,
      paddingTop: 12,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.border.primary,
      alignSelf: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: theme.typography.fontSize['2xl'],
      fontFamily: theme.typography.fontFamily.heading,
      color: theme.colors.text.primary,
      textAlign: 'center',
      marginBottom: 12,
    },
    message: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
    },
    primaryButton: {
      backgroundColor: theme.colors.primary.DEFAULT,
      borderRadius: 16,
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
      paddingVertical: 12,
      alignItems: 'center',
    },
    secondaryButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.muted,
    },
  });

export default React.memo(QuickLogSheet);
