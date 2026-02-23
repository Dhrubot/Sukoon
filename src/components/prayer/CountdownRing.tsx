// src/components/prayer/CountdownRing.tsx
// Gold SVG progress ring with prayer name, time, and countdown centered inside.
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, RadialGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../providers/ThemeProvider';
import { AppTheme } from '../../theme';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import PrayerTimeService from '../../services/PrayerTimeService';
import { PrayerTime } from '../../types';
import { format } from 'date-fns';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RING_SIZE = Math.min(SCREEN_WIDTH * 0.54, 220);
const STROKE_WIDTH = 3;
const RADIUS = (RING_SIZE - STROKE_WIDTH * 2) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const INNER_INSET = 16;
const INNER_RADIUS = RING_SIZE / 2 - INNER_INSET;
// Fallback window when no previous prayer time is available
const FALLBACK_WINDOW_MINUTES = 60;

interface CountdownRingProps {
  prayer: PrayerTime;
  previousPrayerTime?: Date;
  iqamahTime?: Date;
  isAlreadyPrayed?: boolean;
}

const CountdownRing: React.FC<CountdownRingProps> = ({
  prayer,
  previousPrayerTime,
  iqamahTime,
  isAlreadyPrayed = false,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const diff = prayer.time.getTime() - now.getTime();
      const minutesLeft = diff / (1000 * 60);

      // Format remaining time helper
      const fmt = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = Math.floor(mins % 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      };

      if (minutesLeft <= 0) {
        // Prayer time has entered
        setProgress(1);
        setTimeRemaining('Now');
      } else if (previousPrayerTime) {
        // Inter-prayer gap progress: fills from prev prayer → this prayer
        const totalGap = prayer.time.getTime() - previousPrayerTime.getTime();
        const elapsed = now.getTime() - previousPrayerTime.getTime();
        setProgress(Math.max(0, Math.min(1, elapsed / totalGap)));
        setTimeRemaining(fmt(minutesLeft));
      } else if (minutesLeft >= FALLBACK_WINDOW_MINUTES) {
        // No previous prayer — fallback to 60-min window
        setProgress(0);
        setTimeRemaining(fmt(minutesLeft));
      } else {
        setProgress(1 - minutesLeft / FALLBACK_WINDOW_MINUTES);
        setTimeRemaining(fmt(minutesLeft));
      }
    };

    update();
    const interval = setInterval(update, 15000); // every 15s
    return () => clearInterval(interval);
  }, [prayer, previousPrayerTime]);

  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);
  const cx = RING_SIZE / 2;
  const cy = RING_SIZE / 2;
  const origin = `${cx}, ${cy}`;

  return (
    <View style={styles.container}>
      <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
        <Defs>
          {/* Arc gradient: gold → gold-light */}
          <SvgGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={theme.colors.gold} stopOpacity="1" />
            <Stop offset="100%" stopColor={theme.colors.goldLight} stopOpacity="1" />
          </SvgGradient>
          {/* Radial gradient for inner circle */}
          <RadialGradient id="innerGrad" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={theme.colors.sanctuary.ring.innerGradCenter} />
            <Stop offset="100%" stopColor={theme.colors.sanctuary.ring.innerGradEdge} />
          </RadialGradient>
        </Defs>

        {/* Track (dim ring) */}
        <Circle
          cx={cx}
          cy={cy}
          r={RADIUS}
          stroke={theme.colors.sanctuary.ring.trackStroke}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />

        {/* Glow layer — rendered before the real arc */}
        <Circle
          cx={cx}
          cy={cy}
          r={RADIUS}
          stroke={theme.colors.sanctuary.ring.glowStroke}
          strokeWidth={STROKE_WIDTH + 7}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE}`}
          strokeDashoffset={strokeDashoffset}
          rotation={-90}
          origin={origin}
        />

        {/* Progress arc */}
        <Circle
          cx={cx}
          cy={cy}
          r={RADIUS}
          stroke="url(#goldGrad)"
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE}`}
          strokeDashoffset={strokeDashoffset}
          rotation={-90}
          origin={origin}
        />

        {/* Inner circle with radial gradient */}
        <Circle
          cx={cx}
          cy={cy}
          r={INNER_RADIUS}
          fill="url(#innerGrad)"
          stroke={theme.colors.sanctuary.ring.innerBorder}
          strokeWidth={1}
        />
      </Svg>

      {/* Centered content inside the ring */}
      <View style={styles.innerContent}>
        <Text style={styles.label}>
          {isAlreadyPrayed ? 'Current Prayer' : 'Next Prayer'}
        </Text>
        <Text
          style={styles.prayerName}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {PrayerTimeService.getPrayerDisplayName(prayer.name)}
        </Text>
        <Text style={styles.prayerTime}>
          {PrayerTimeService.formatPrayerTime(prayer.time)}
        </Text>
        {isAlreadyPrayed ? (
          <Text style={styles.prayedStatus}>Prayed ✓</Text>
        ) : (
          <Text style={styles.countdown}>in {timeRemaining}</Text>
        )}
        {iqamahTime && (
          <Text style={styles.iqamah}>
            Iqamah · {format(iqamahTime, 'h:mm a')}
          </Text>
        )}
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      width: RING_SIZE,
      height: RING_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    innerContent: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: INNER_INSET + 8,
    },
    label: {
      fontSize: 10,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.sanctuary.label,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom: theme.spacing.xs,
    },
    prayerName: {
      fontSize: theme.typography.fontSize['6xl'],
      fontFamily: theme.typography.fontFamily.sanctuaryHeading,
      color: theme.colors.sanctuary.prayerName,
      lineHeight: 36,
      letterSpacing: -0.5,
      marginBottom: theme.spacing.xxs,
    },
    prayerTime: {
      fontSize: 17,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.goldLight,
      letterSpacing: -0.3,
      marginBottom: theme.spacing.xxs,
    },
    countdown: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.sanctuary.countdown,
    },
    prayedStatus: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.sanctuary.prayedStatus,
    },
    iqamah: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.sanctuaryItalic,
      fontStyle: 'italic' as const,
      color: theme.colors.goldLight,
      marginTop: theme.spacing.xs,
    },
  });

export default React.memo(CountdownRing);
