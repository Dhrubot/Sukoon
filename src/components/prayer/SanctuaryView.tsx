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
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PreAdhanSheet from './PreAdhanSheet';
import PostPrayerSheet from './PostPrayerSheet';
import CountdownRing from './CountdownRing';
import StarField from './StarField';
import { LinearGradient } from 'expo-linear-gradient';
import { PrayerTime, PrayerRecord } from '../../types';
import { format } from 'date-fns';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { formatHijriDate, formatHijriDateSync } from '../../utils/hijriDate';
import { useStore } from '../../store/useStore';
import { isFriday, isRamadan, getRamadanDay } from '../../utils/ramadan';
import { JummahResourceTopic } from '../../constants/jummahContent';
import { PrayerSurfaceRingColorMode } from '../../utils/prayerSurfaceResolver';

const { height } = Dimensions.get('window');
const HERO_MIN_HEIGHT = Platform.OS === 'ios' ? height * 0.72 : height * 0.78;
const HERO_FOCUS_MIN_HEIGHT = Platform.OS === 'ios' ? height * 0.8 : height * 0.86;

interface MosqueModeHeroInfo {
  iqamahTime: Date;
  /** Present only when mosque mode has fired (active silent period) */
  restoreTime?: Date;
}

interface SanctuaryViewProps {
  prayer: PrayerTime;
  gradientPrayer?: PrayerTime;
  greeting: string;
  userName?: string;
  record?: PrayerRecord;
  ringProgress: number;
  countdownTargetTime: Date;
  ringAccentPrayer: PrayerTime;
  ringColorMode: PrayerSurfaceRingColorMode;
  isTimeEntered?: boolean;
  missedPrayer?: PrayerTime;
  onPrepare: () => void;
  onPrepareQada?: () => void;
  onPraySunnah?: () => void;
  onRepeatPrayer?: () => void;
  onLongPress?: () => void;
  isFocusMode?: boolean;
  mosqueModeInfo?: MosqueModeHeroInfo;
  onMosqueModeTap?: () => void;
  onOpenJummahResource?: (topic: JummahResourceTopic) => void;
}

const SanctuaryView: React.FC<SanctuaryViewProps> = ({
  prayer,
  gradientPrayer,
  greeting,
  userName,
  record,
  ringProgress,
  countdownTargetTime,
  ringAccentPrayer,
  ringColorMode,
  isTimeEntered = true,
  missedPrayer,
  onPrepare,
  onPrepareQada,
  onPraySunnah,
  onRepeatPrayer,
  onLongPress,
  isFocusMode = false,
  mosqueModeInfo,
  onMosqueModeTap,
  onOpenJummahResource,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const hijriAdjustment = useStore((state) => state.userSettings?.hijriAdjustment ?? 0);
  const [hijriDateStr, setHijriDateStr] = useState(formatHijriDateSync());
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Fetch accurate Hijri date — re-run when hijriAdjustment changes
  useEffect(() => {
    setHijriDateStr(formatHijriDateSync());
    formatHijriDate().then(setHijriDateStr).catch(() => {});
  }, [hijriAdjustment]);

  const heroGradientPrayer = gradientPrayer ?? prayer;
  const isAlreadyPrayed = record?.status === 'prayed';
  const isJummah = prayer.name === 'Dhuhr' && isFriday();
  const isGradientJummah = heroGradientPrayer.name === 'Dhuhr' && isFriday();
  const [showPreAdhanSheet, setShowPreAdhanSheet] = useState(false);
  const [showPostPrayerSheet, setShowPostPrayerSheet] = useState(false);

  const handlePress = () => {
    if (isAlreadyPrayed) {
      // Fard done — offer sunnah/nafl or repeat
      setShowPostPrayerSheet(true);
    } else if (!isTimeEntered) {
      // Adhan hasn't happened — show PreAdhanSheet with alternatives
      setShowPreAdhanSheet(true);
    } else {
      onPrepare();
    }
  };

  const handleLongPress = () => {
    if (isCTAActive) {
      // Prayer window open — skip sheet, go straight to MindfulnessFlow
      onLongPress?.();
    } else {
      // Same as tap for pre-adhan / already-prayed states
      handlePress();
    }
  };

  // Pulse only when time has entered and prayer is not yet prayed (State 2)
  const isCTAActive = isTimeEntered && !isAlreadyPrayed;

  useEffect(() => {
    pulseLoopRef.current?.stop();
    pulseLoopRef.current = null;

    if (!isCTAActive) {
      pulseAnim.setValue(1);
      return;
    }

    pulseAnim.setValue(0.6);
    pulseLoopRef.current = Animated.loop(
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
    );
    pulseLoopRef.current.start();

    return () => {
      pulseLoopRef.current?.stop();
      pulseLoopRef.current = null;
    };
  }, [isCTAActive, pulseAnim]);

  const getButtonText = (): string => {
    return 'Prepare for Prayer';
  };

  const getPrayerGradient = (): readonly [string, string, string] => {
    const gradients = theme.colors.prayerGradients as unknown as Record<string, readonly [string, string, string]>;
    if (isGradientJummah) return gradients.Jumah || gradients.default;
    return gradients[heroGradientPrayer.name] || gradients.default;
  };

  const ramadanDay = isRamadan() ? getRamadanDay() : null;

  return (
    <>
      <LinearGradient
        colors={getPrayerGradient()}
        style={[
          styles.container,
          {
            paddingTop: insets.top + theme.spacing['2xl'],
            minHeight: HERO_MIN_HEIGHT + insets.top,
          },
          isFocusMode && { minHeight: HERO_FOCUS_MIN_HEIGHT + insets.top },
        ]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        {/* Animated star field — nighttime prayers only */}
        <StarField prayerName={heroGradientPrayer.name} />

        {/* Greeting + Hijri date */}
        <View style={styles.greetingContainer}>
          {/* Ramadan badge */}
          {ramadanDay && (
            <View style={styles.ramadanBadge}>
              <Text style={styles.ramadanBadgeText}>
                Ramadan Mubarak · Day {ramadanDay}
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
          progress={ringProgress}
          countdownTargetTime={countdownTargetTime}
          ringAccentPrayer={ringAccentPrayer}
          ringColorMode={ringColorMode}
          iqamahTime={mosqueModeInfo?.iqamahTime}
          isAlreadyPrayed={isAlreadyPrayed}
        />

        {/* Jumu'ah sunnah reminders */}
        {isJummah && !isAlreadyPrayed && (
          <View style={styles.sunnahRow}>
            <TouchableOpacity
              style={styles.sunnahChip}
              onPress={() => onOpenJummahResource?.('kahf')}
              activeOpacity={0.75}
            >
              <Text style={styles.sunnahText}>Al-Kahf</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sunnahChip}
              onPress={() => onOpenJummahResource?.('ghusl')}
              activeOpacity={0.75}
            >
              <Text style={styles.sunnahText}>Ghusl</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sunnahChip}
              onPress={() => onOpenJummahResource?.('salawat')}
              activeOpacity={0.75}
            >
              <Text style={styles.sunnahText}>Salawat</Text>
            </TouchableOpacity>
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
        <Animated.View style={{ opacity: isCTAActive ? pulseAnim : 1 }}>
          <TouchableOpacity
            style={[
              styles.prepareButton,
              !isCTAActive && styles.mutedButton,
            ]}
            onPress={handlePress}
            onLongPress={handleLongPress}
            delayLongPress={400}
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

      {/* Post-Prayer Sheet — fard done, offer sunnah/nafl or repeat */}
      <PostPrayerSheet
        visible={showPostPrayerSheet}
        prayerName={prayer.name}
        onPraySunnah={() => {
          setShowPostPrayerSheet(false);
          onPraySunnah?.();
        }}
        onRepeatPrayer={() => {
          setShowPostPrayerSheet(false);
          onRepeatPrayer?.();
        }}
        onDismiss={() => setShowPostPrayerSheet(false)}
      />
    </>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      minHeight: HERO_MIN_HEIGHT,
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: Platform.OS === 'ios'
        ? theme.spacing['3xl'] + 32
        : theme.spacing['4xl'] + 72,
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
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.goldLight,
      letterSpacing: 0.5,
    },
    greeting: {
      fontSize: theme.typography.fontSize.xl,
      fontFamily: theme.typography.fontFamily.headingRegular,
      color: theme.colors.sanctuary.greeting,
      textAlign: 'center',
    },
    greetingName: {
      color: theme.colors.goldLight,
    },
    hijriDate: {
      fontSize: theme.typography.fontSize.sm,
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
    mutedButton: {
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
      height: 32,
      backgroundColor: theme.colors.background.primary,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
  });

export default React.memo(SanctuaryView);
