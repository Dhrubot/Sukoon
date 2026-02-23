// src/components/mosque/MosqueModeOverlay.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Modal } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { useMosqueMode } from '../../hooks/useMosqueMode';

/**
 * 4c: Brief overlay shown when mosque mode silences the phone.
 * Shows "Your phone is at rest 🕌" on activation (2s) and
 * "Your phone is awake again ☀️" on deactivation (2s).
 */
export const MosqueModeOverlay: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { isActive } = useMosqueMode();
  const [overlayType, setOverlayType] = useState<'activation' | 'deactivation' | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const wasActive = useRef(false);

  useEffect(() => {
    const showOverlay = (type: 'activation' | 'deactivation') => {
      setOverlayType(type);
      fadeAnim.setValue(0);

      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();

      // After 2 seconds, fade out and dismiss
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }).start(() => {
          setOverlayType(null);
        });
      }, 2000);

      return timer;
    };

    let timer: ReturnType<typeof setTimeout> | undefined;

    // Transition from inactive → active
    if (isActive && !wasActive.current) {
      timer = showOverlay('activation');
    }
    // Transition from active → inactive
    else if (!isActive && wasActive.current) {
      timer = showOverlay('deactivation');
    }

    wasActive.current = isActive;

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isActive]);

  if (!overlayType) return null;

  const isActivation = overlayType === 'activation';

  return (
    <Modal transparent visible={!!overlayType} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Text style={[styles.emoji]}>{isActivation ? '🕌' : '☀️'}</Text>
        <Text style={[styles.text, { color: theme.colors.text.primary }]}>
          {isActivation ? 'Your phone is at rest' : 'Your phone is awake again'}
        </Text>
      </Animated.View>
    </Modal>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: theme.spacing.xl,
  },
  text: {
    fontSize: theme.typography.fontSize['3xl'],
    fontFamily: theme.typography.fontFamily.headingRegular,
    letterSpacing: 0.5,
  },
});
