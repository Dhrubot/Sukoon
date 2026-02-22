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
import PreAdhanSheet from './PreAdhanSheet';
import { LinearGradient } from 'expo-linear-gradient';
import { PrayerTime, PrayerRecord, PrayerName } from '../../types';
import { format } from 'date-fns';
import PrayerTimeService from '../../services/PrayerTimeService';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { formatHijriDate, formatHijriDateSync } from '../../utils/hijriDate';
import { useStore } from '../../store/useStore';
import { isFriday } from '../../utils/ramadan';

const { height } = Dimensions.get('window');

interface MosqueModeHeroInfo {
  iqamahTime: Date;
  /** Present only when mosque mode has fired (active silent period) */
  restoreTime?: Date;
}

interface SanctuaryViewProps {
  prayer: PrayerTime;
  greeting: string;
  record?: PrayerRecord;
  isTimeEntered?: boolean;
  missedPrayer?: PrayerTime;
  onPrepare: () => void;
  onPrepareQada?: () => void;
  onPraySunnah?: () => void;
  isFocusMode?: boolean;
  mosqueModeInfo?: MosqueModeHeroInfo;
  onMosqueModeTap?: () => void;
}

const SanctuaryView: React.FC<SanctuaryViewProps> = ({
  prayer,
  greeting,
  record,
  isTimeEntered = true,
  missedPrayer,
  onPrepare,
  onPrepareQada,
  onPraySunnah,
  isFocusMode = false,
  mosqueModeInfo,
  onMosqueModeTap,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { userSettings } = useStore();
  const hijriAdjustment = userSettings?.hijriAdjustment ?? 0;
  const [timeRemaining, setTimeRemaining] = useState('');
  const [hijriDateStr, setHijriDateStr] = useState(formatHijriDateSync());
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  // Fetch accurate Hijri date — re-run when hijriAdjustment changes
  useEffect(() => {
    setHijriDateStr(formatHijriDateSync());
    formatHijriDate().then(setHijriDateStr).catch(() => {});
  }, [hijriAdjustment]);

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
  const isJummah = prayer.name === 'Dhuhr' && isFriday();
  const [showPreAdhanSheet, setShowPreAdhanSheet] = useState(false);

  const handlePress = () => {
    if (isAlreadyPrayed) {
      onPrepare();
    } else if (!isTimeEntered) {
      // Adhan hasn't happened — show PreAdhanSheet with alternatives
      setShowPreAdhanSheet(true);
    } else {
      onPrepare();
    }
  };

  const getButtonText = (): string => {
    if (isAlreadyPrayed) return 'Already Prayed';
    if (isJummah) return "Prepare for Jumu'ah";
    if (!isTimeEntered) return 'Prepare For Prayer';
    return 'Prepare for Prayer';
  };

  const getPrayerGradient = (): readonly [string, string, string] => {
    const gradients = theme.colors.prayerGradients;
    if (isJummah) return (gradients as any).Jumah || gradients.default;
    return (gradients as any)[prayer.name] || gradients.default;
  };

  return (
    <>
      <LinearGradient
        colors={getPrayerGradient()}
        style={[styles.container, isFocusMode && { minHeight: height * 0.82 }]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        {/* Greeting + Hijri date */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.hijriDate}>{hijriDateStr}</Text>
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
          {mosqueModeInfo && (
            <Text style={styles.iqamahText}>
              {mosqueModeInfo.iqamahTime > new Date()
                ? `Iqamah at ${format(mosqueModeInfo.iqamahTime, 'h:mm a')}`
                : `Iqamah was at ${format(mosqueModeInfo.iqamahTime, 'h:mm a')}`}
            </Text>
          )}
        </View>

        {/* Jumu'ah sunnah reminders */}
        {isJummah && !isAlreadyPrayed && (
          <View style={styles.sunnahRow}>
            <View style={styles.sunnahChip}>
              <Text style={styles.sunnahText}>Al-Kahf</Text>
            </View>
            <View style={styles.sunnahChip}>
              <Text style={styles.sunnahText}>Ghusl</Text>
            </View>
            <View style={styles.sunnahChip}>
              <Text style={styles.sunnahText}>Salawat</Text>
            </View>
          </View>
        )}

        {/* Mosque Mode Active Pill — only when silent mode is on */}
        {mosqueModeInfo?.restoreTime && (
          <TouchableOpacity
            style={styles.mosqueModePill}
            onPress={onMosqueModeTap}
            activeOpacity={0.7}
          >
            <Text style={styles.mosqueModePillText}>
              Mosque Mode · until {format(mosqueModeInfo.restoreTime, 'h:mm a')}
            </Text>
          </TouchableOpacity>
        )}

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

      {/* Pre-Adhan Sheet — blocks fard prayer before its time, offers alternatives */}
      <PreAdhanSheet
        visible={showPreAdhanSheet}
        prayerName={prayer.name}
        missedPrayerName={missedPrayer?.name}
        onMakeUpPrayer={
          missedPrayer && onPrepareQada
            ? () => {
                setShowPreAdhanSheet(false);
                onPrepareQada();
              }
            : undefined
        }
        onPraySunnah={() => {
          setShowPreAdhanSheet(false);
          onPraySunnah?.();
        }}
        onDismiss={() => setShowPreAdhanSheet(false)}
      />
    </>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      minHeight: height * 0.70,
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
    sunnahRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
      marginTop: 4,
    },
    sunnahChip: {
      backgroundColor: 'rgba(212, 175, 55, 0.15)',
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: 'rgba(212, 175, 55, 0.25)',
    },
    sunnahText: {
      fontSize: 12,
      color: theme.colors.sanctuary.label,
      fontWeight: '500',
    },
    iqamahText: {
      fontSize: 13,
      fontWeight: '400',
      color: theme.colors.sanctuary.countdown,
      marginTop: 4,
      opacity: 0.90,
      fontStyle: 'italic', 
    },
    mosqueModePill: {
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
      borderRadius: 16,
      paddingVertical: 6,
      paddingHorizontal: 14,
      alignItems: 'center',
      marginBottom: 12,
    },
    mosqueModePillText: {
      fontSize: 12,
      fontWeight: '500',
      color: theme.colors.sanctuary.label,
      opacity: 0.85,
      textAlign: 'center',
    },
  });

export default SanctuaryView;
