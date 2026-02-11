// src/components/prayer/SanctuaryView.tsx
// 1a: Full-screen next prayer display — the heart of the sanctuary experience
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PrayerTime } from '../../types';
import PrayerTimeService from '../../services/PrayerTimeService';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';

const { height } = Dimensions.get('window');

interface SanctuaryViewProps {
  prayer: PrayerTime;
  greeting: string;
  onPrepare: () => void;
}

const SanctuaryView: React.FC<SanctuaryViewProps> = ({
  prayer,
  greeting,
  onPrepare,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [timeRemaining, setTimeRemaining] = useState('');
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const diff = prayer.time.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Now');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}m`);
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 30000); // Update every 30s
    return () => clearInterval(timer);
  }, [prayer]);

  // Subtle pulse animation for the CTA
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const getPrayerGradient = (): readonly [string, string, string] => {
    const gradients = theme.colors.prayerGradients;
    return (gradients as any)[prayer.name] || gradients.default;
  };

  return (
    <LinearGradient
      colors={getPrayerGradient()}
      style={styles.container}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      {/* Greeting */}
      <Text style={styles.greeting}>{greeting}</Text>

      {/* Prayer name — the focal point */}
      <View style={styles.prayerInfo}>
        <Text style={styles.prayerLabel}>Next Prayer</Text>
        <Text style={styles.prayerName}>
          {PrayerTimeService.getPrayerDisplayName(prayer.name)}
        </Text>
        <Text style={styles.prayerTime}>
          {PrayerTimeService.formatPrayerTime(prayer.time)}
        </Text>
        <Text style={styles.countdown}>in {timeRemaining}</Text>
      </View>

      {/* CTA */}
      <Animated.View style={{ opacity: pulseAnim }}>
        <TouchableOpacity
          style={styles.prepareButton}
          onPress={onPrepare}
          activeOpacity={0.7}
        >
          <Text style={styles.prepareText}>Prepare for Prayer</Text>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      minHeight: height * 0.55,
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 40,
      paddingBottom: 32,
      paddingHorizontal: 24,
    },
    greeting: {
      fontSize: 16,
      fontWeight: '400',
      color: 'rgba(255, 255, 255, 0.7)',
      textAlign: 'center',
    },
    prayerInfo: {
      alignItems: 'center',
    },
    prayerLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: 'rgba(255, 255, 255, 0.5)',
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    prayerName: {
      fontSize: 48,
      fontWeight: '700',
      color: '#FFFFFF',
      marginBottom: 8,
    },
    prayerTime: {
      fontSize: 20,
      fontWeight: '400',
      color: 'rgba(255, 255, 255, 0.8)',
      marginBottom: 4,
    },
    countdown: {
      fontSize: 16,
      fontWeight: '300',
      color: 'rgba(255, 255, 255, 0.6)',
      fontStyle: 'italic',
    },
    prepareButton: {
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
      borderRadius: 24,
      paddingVertical: 14,
      paddingHorizontal: 40,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    prepareText: {
      fontSize: 16,
      fontWeight: '500',
      color: '#FFFFFF',
      letterSpacing: 0.5,
    },
  });

export default SanctuaryView;
