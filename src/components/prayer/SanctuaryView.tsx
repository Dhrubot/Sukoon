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
import CountdownRing from './CountdownRing';
import StarField from './StarField';
import { LinearGradient } from 'expo-linear-gradient';
import { PrayerTime, PrayerRecord, PrayerName } from '../../types';
import { format } from 'date-fns';
import PrayerTimeService from '../../services/PrayerTimeService';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { formatHijriDate, formatHijriDateSync } from '../../utils/hijriDate';
import { useStore } from '../../store/useStore';
import { isFriday, isRamadan, getRamadanDay } from '../../utils/ramadan';

const { height } = Dimensions.get('window');

interface MosqueModeHeroInfo {
  iqamahTime: Date;
  /** Present only when mosque mode has fired (active silent period) */
  restoreTime?: Date;
}

interface SanctuaryViewProps {
  prayer: PrayerTime;
  greeting: string;
  userName?: string;
  previousPrayerTime?: Date;
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
  userName,
  previousPrayerTime,
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
  const [hijriDateStr, setHijriDateStr] = useState(formatHijriDateSync());
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  // Fetch accurate Hijri date — re-run when hijriAdjustment changes
  useEffect(() => {
    setHijriDateStr(formatHijriDateSync());
    formatHijriDate().then(setHijriDateStr).catch(() => {});
  }, [hijriAdjustment]);

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

  const ramadanDay = isRamadan() ? getRamadanDay() : null;

  return (
    <>
      <LinearGradient
        colors={getPrayerGradient()}
        style={[styles.container, isFocusMode && { minHeight: height * 0.82 }]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        {/* Animated star field — nighttime prayers only */}
        <StarField prayerName={prayer.name} />

        {/* Greeting + Hijri date */}
        <View style={styles.greetingContainer}>
          {/* Ramadan badge */}
          {ramadanDay && (
            <View style={styles.ramadanBadge}>
              <Text style={styles.ramadanBadgeText}>
                ☪ Ramadan Mubarak · Day {ramadanDay}
              </Text>
            </View>
          )}
          <Text style={styles.greeting}>
            {userName && greeting.includes(userName)
              ? <>{greeting.substring(0, greeting.lastIndexOf(userName))}<Text style={styles.greetingName}>{userName}</Text>{greeting.substring(greeting.lastIndexOf(userName) + userName.length)}</>
              : greeting
            }
          </Text>
          <Text style={styles.hijriDate}>{hijriDateStr}</Text>
        </View>

        {/* Countdown Ring — the focal point */}
        <CountdownRing
          prayer={prayer}
          previousPrayerTime={previousPrayerTime}
          iqamahTime={mosqueModeInfo?.iqamahTime}
          isAlreadyPrayed={isAlreadyPrayed}
        />

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

        {/* Hero curve — content bg overlaps hero bottom */}
        <View style={styles.heroCurve} />
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
      minHeight: height * 0.72,
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: theme.spacing['4xl'],
      paddingBottom: theme.spacing['3xl'] + 52,
      paddingHorizontal: theme.spacing['2xl'],
      overflow: 'hidden',
    },
    greetingContainer: {
      alignItems: 'center',
    },
    ramadanBadge: {
      backgroundColor: 'rgba(201, 168, 76, 0.12)',
      borderRadius: theme.borderRadius.full,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
      borderWidth: 1,
      borderColor: 'rgba(201, 168, 76, 0.20)',
    },
    ramadanBadgeText: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.goldLight,
      letterSpacing: 0.5,
    },
    greeting: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.headingRegular,
      color: theme.colors.sanctuary.greeting,
      textAlign: 'center',
    },
    greetingName: {
      color: theme.colors.goldLight,
    },
    hijriDate: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.sanctuary.label,
      textAlign: 'center',
      marginTop: theme.spacing.xs,
      opacity: 0.8,
    },
    prepareButton: {
      borderWidth: 1,
      borderColor: theme.colors.sanctuary.buttonBorder,
      borderRadius: theme.borderRadius.full,
      paddingVertical: theme.spacing.md + 2,
      paddingHorizontal: theme.spacing['4xl'],
      backgroundColor: theme.colors.sanctuary.buttonBg,
    },
    alreadyPrayedButton: {
      backgroundColor: theme.colors.sanctuary.buttonBgMuted,
      borderColor: theme.colors.sanctuary.buttonBorderMuted,
    },
    prepareText: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.sanctuary.buttonText,
      letterSpacing: 0.5,
    },
    sunnahRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    sunnahChip: {
      backgroundColor: 'rgba(201, 168, 76, 0.12)',
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md - 2,
      paddingVertical: theme.spacing.xs + 1,
      borderWidth: 1,
      borderColor: 'rgba(201, 168, 76, 0.20)',
    },
    sunnahText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.sanctuary.label,
      fontFamily: theme.typography.fontFamily.bodyMedium,
    },
    mosqueModePill: {
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
      borderRadius: theme.borderRadius.lg,
      paddingVertical: theme.spacing.xs + 2,
      paddingHorizontal: theme.spacing.md + 2,
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    mosqueModePillText: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.sanctuary.label,
      opacity: 0.85,
      textAlign: 'center',
    },
    heroCurve: {
      position: 'absolute',
      bottom: -1,
      left: 0,
      right: 0,
      height: 40,
      backgroundColor: theme.colors.background.primary,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
  });

export default SanctuaryView;
