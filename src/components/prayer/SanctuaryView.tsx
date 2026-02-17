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
  Alert,
} from 'react-native';
import QadaSheet from './QadaSheet';
import { LinearGradient } from 'expo-linear-gradient';
import { PrayerTime, PrayerRecord } from '../../types';
import PrayerTimeService from '../../services/PrayerTimeService';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { formatHijriDate } from '../../utils/hijriDate';

const { height } = Dimensions.get('window');

interface SanctuaryViewProps {
  prayer: PrayerTime;
  greeting: string;
  record?: PrayerRecord;
  isTimeEntered?: boolean;
  missedPrayer?: PrayerTime;
  onPrepare: () => void;
  onPrepareQada?: () => void;
}

const SanctuaryView: React.FC<SanctuaryViewProps> = ({
  prayer,
  greeting,
  record,
  isTimeEntered = true,
  missedPrayer,
  onPrepare,
  onPrepareQada,
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

  const isAlreadyPrayed = record?.status === 'prayed';
  const [showQadaSheet, setShowQadaSheet] = useState(false);

  const handlePress = () => {
    if (isAlreadyPrayed) {
      // Already prayed — offer to repeat the mindfulness flow
      Alert.alert(
        'Already Prayed',
        'You\'ve already recorded this prayer. Would you like to go through the mindfulness flow again?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes, Repeat Flow', onPress: onPrepare },
        ]
      );
    } else if (!isTimeEntered && missedPrayer && onPrepareQada) {
      // Show warm bottom sheet instead of clinical Alert
      setShowQadaSheet(true);
    } else if (!isTimeEntered) {
      // Adhan hasn't happened yet but no missed prayers — confirm early preparation
      Alert.alert(
        'Adhan Hasn\'t Happened Yet',
        `${PrayerTimeService.getPrayerDisplayName(prayer.name)} time hasn\'t entered yet. Would you like to prepare for prayer anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Yes, Prepare', onPress: onPrepare },
        ]
      );
    } else {
      onPrepare();
    }
  };

  const getButtonText = (): string => {
    if (isAlreadyPrayed) return 'Already Prayed';
    if (!isTimeEntered) return 'Prepare For Prayer';
    return 'Prepare for Prayer';
  };

  const getPrayerGradient = (): readonly [string, string, string] => {
    const gradients = theme.colors.prayerGradients;
    return (gradients as any)[prayer.name] || gradients.default;
  };

  const showQadaSheetElement = missedPrayer != null && onPrepareQada != null;

  return (
    <>
      <LinearGradient
        colors={getPrayerGradient()}
        style={styles.container}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        {/* Greeting + Hijri date */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.hijriDate}>{formatHijriDate()}</Text>
        </View>

        {/* Prayer name — the focal point */}
        <View style={styles.prayerInfo}>
          <Text style={styles.prayerLabel}>
            {isAlreadyPrayed ? 'Current Prayer' : 'Next Prayer'}
          </Text>
          <Text style={styles.prayerName}>
            {PrayerTimeService.getPrayerDisplayName(prayer.name)}
          </Text>
          <Text style={styles.prayerTime}>
            {PrayerTimeService.formatPrayerTime(prayer.time)}
          </Text>
          {isAlreadyPrayed ? (
            <Text style={styles.prayedStatus}>Prayed with Presence ✓</Text>
          ) : (
            <Text style={styles.countdown}>in {timeRemaining}</Text>
          )}
        </View>

        {/* CTA */}
        <Animated.View style={{ opacity: isAlreadyPrayed ? 1 : pulseAnim }}>
          <TouchableOpacity
            style={[
              styles.prepareButton,
              (isAlreadyPrayed || !isTimeEntered) && styles.alreadyPrayedButton,
            ]}
            onPress={handlePress}
            activeOpacity={0.7}
          >
            <Text style={styles.prepareText}>
              {getButtonText()}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>

      {/* Qada Bottom Sheet — replaces Alert.alert for missed prayer prompts */}
      {showQadaSheetElement && (
        <QadaSheet
          visible={showQadaSheet}
          prayerName={missedPrayer!.name}
          nextPrayerName={prayer.name}
          onPrayQada={() => {
            setShowQadaSheet(false);
            onPrepareQada!();
          }}
          onDismiss={() => setShowQadaSheet(false)}
        />
      )}
    </>
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
    greetingContainer: {
      alignItems: 'center',
    },
    greeting: {
      fontSize: 16,
      fontWeight: '400',
      color: theme.colors.sanctuary.greeting,
      textAlign: 'center',
    },
    hijriDate: {
      fontSize: 12,
      fontWeight: '400',
      color: theme.colors.sanctuary.label,
      textAlign: 'center',
      marginTop: 4,
      opacity: 0.8,
    },
    prayerInfo: {
      alignItems: 'center',
    },
    prayerLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.sanctuary.label,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    prayerName: {
      fontSize: 48,
      fontFamily: theme.typography.fontFamily.heading,
      color: theme.colors.sanctuary.prayerName,
      marginBottom: 8,
    },
    prayerTime: {
      fontSize: 20,
      fontWeight: '400',
      color: theme.colors.sanctuary.prayerTime,
      marginBottom: 4,
    },
    countdown: {
      fontSize: 16,
      fontWeight: '300',
      color: theme.colors.sanctuary.countdown,
      fontStyle: 'italic',
    },
    prayedStatus: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.sanctuary.prayedStatus,
      marginTop: 4,
    },
    prepareButton: {
      borderWidth: 1,
      borderColor: theme.colors.sanctuary.buttonBorder,
      borderRadius: 24,
      paddingVertical: 14,
      paddingHorizontal: 40,
      backgroundColor: theme.colors.sanctuary.buttonBg,
    },
    alreadyPrayedButton: {
      backgroundColor: theme.colors.sanctuary.buttonBgMuted,
      borderColor: theme.colors.sanctuary.buttonBorderMuted,
    },
    prepareText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.sanctuary.buttonText,
      letterSpacing: 0.5,
    },
  });

export default SanctuaryView;
