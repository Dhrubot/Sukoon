// src/components/mosque/MosqueModeOverlay.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Modal } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';
import { useMosqueMode } from '../../hooks/useMosqueMode';

/**
 * 4c: Brief overlay shown when mosque mode silences the phone.
 * Displays "Your phone is at rest 🕌" for 2 seconds, then auto-dismisses.
 */
export const MosqueModeOverlay: React.FC = () => {
  const { theme } = useTheme();
  const { isActive } = useMosqueMode();
  const [visible, setVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const wasActive = useRef(false);

  useEffect(() => {
    // Show overlay only on transition from inactive → active
    if (isActive && !wasActive.current) {
      setVisible(true);

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
          setVisible(false);
        });
      }, 2000);

      return () => clearTimeout(timer);
    }

    wasActive.current = isActive;
  }, [isActive]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Text style={[styles.emoji]}>🕌</Text>
        <Text style={[styles.text, { color: theme.colors.text.primary }]}>
          Your phone is at rest
        </Text>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  text: {
    fontSize: 24,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
});
