// src/components/common/NotificationToggleButton.tsx
import React from 'react';
import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../providers/ThemeProvider';
import { PrayerName } from '../../types';
import Svg, { Path, Line } from 'react-native-svg';

// Outline speaker-on icon (volume-2)
const SpeakerOnIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 5L6 9H2v6h4l5 4V5z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M19.07 4.93a10 10 0 010 14.14"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M15.54 8.46a5 5 0 010 7.07"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Outline speaker-off icon (volume-x)
const SpeakerOffIcon: React.FC<{ color: string; size: number }> = ({ color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 5L6 9H2v6h4l5 4V5z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Line
      x1="23" y1="9" x2="17" y2="15"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <Line
      x1="17" y1="9" x2="23" y2="15"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);

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
        {enabled
          ? <SpeakerOnIcon color={getColor()} size={size} />
          : <SpeakerOffIcon color={getColor()} size={size} />
        }
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
