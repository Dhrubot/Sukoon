// src/components/common/NotificationToggleButton.tsx
import React from 'react';
import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../providers/ThemeProvider';
import { Icon } from './Icon';
import { SoundOnIcon, SoundOffIcon } from '../../assets/icons';
import { PrayerName } from '../../types';

interface NotificationToggleButtonProps {
  prayerName: PrayerName;
  enabled: boolean;
  onToggle: (prayerName: PrayerName, newState: boolean) => void;
  disabled?: boolean;
  size?: number;
}

export const NotificationToggleButton: React.FC<NotificationToggleButtonProps> = ({
  prayerName,
  enabled,
  onToggle,
  disabled = false,
  size = 22,
}) => {
  const { theme } = useTheme();
  const [scaleAnim] = React.useState(new Animated.Value(1));

  const handlePress = () => {
    if (disabled) return;

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Scale animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Toggle state
    onToggle(prayerName, !enabled);
  };

  const getColor = () => {
    if (disabled) return theme.colors.text.muted;
    return enabled ? theme.colors.primary.DEFAULT : theme.colors.text.muted;
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.6}
        style={[styles.container, disabled && styles.disabled]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon
          source={enabled ? SoundOnIcon : SoundOffIcon}
          size={size}
          color={getColor()}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
});

export default NotificationToggleButton;
