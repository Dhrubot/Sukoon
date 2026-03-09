// src/components/prayer/CatchUpSheet.tsx
// Bottom sheet shown once per session when ≥3 prayers are missed.
// Replaces the old persistent CatchUpCard in the scroll view.
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
import { PrayerTime } from '../../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CatchUpSheetProps {
  visible: boolean;
  missedPrayers: PrayerTime[];
  onCatchUp: (prayer: PrayerTime) => void;
  onDismiss: () => void;
}

const CatchUpSheet: React.FC<CatchUpSheetProps> = ({
  visible,
  missedPrayers,
  onCatchUp,
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

  if (missedPrayers.length === 0) return null;

  const earliest = missedPrayers[0];
  const earliestName = PrayerTimeService.getPrayerDisplayName(earliest.name);

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

          <Text style={styles.title}>
            You have {missedPrayers.length} prayers to return to
          </Text>

          <Text style={styles.body}>
            Begin with {earliestName} — every step back is beloved.
          </Text>

          {/* Individual prayer buttons */}
          {missedPrayers.map((prayer) => {
            const name = PrayerTimeService.getPrayerDisplayName(prayer.name);
            const isFirst = prayer.name === earliest.name;
            return (
              <TouchableOpacity
                key={prayer.name}
                style={[
                  styles.prayerButton,
                  isFirst && styles.prayerButtonPrimary,
                ]}
                onPress={() => {
                  onDismiss();
                  onCatchUp(prayer);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.prayerButtonText,
                    isFirst && styles.prayerButtonTextPrimary,
                  ]}
                >
                  Make Up {name}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissText}>I'll catch up later</Text>
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
    prayerButton: {
      width: '100%',
      borderWidth: 1.5,
      borderColor: theme.colors.primary.DEFAULT,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 10,
    },
    prayerButtonPrimary: {
      backgroundColor: theme.colors.primary.DEFAULT,
      borderColor: theme.colors.primary.DEFAULT,
    },
    prayerButtonText: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.primary.DEFAULT,
    },
    prayerButtonTextPrimary: {
      color: theme.colors.primary.contrast,
    },
    dismissButton: {
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 6,
    },
    dismissText: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.muted,
    },
  });

export default React.memo(CatchUpSheet);
