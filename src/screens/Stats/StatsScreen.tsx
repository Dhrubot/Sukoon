import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  format,
  startOfWeek,
  eachDayOfInterval,
  subDays,
  startOfMonth,
} from 'date-fns';
import { useShallow } from 'zustand/react/shallow';
import PrayerDotGrid from '../../components/charts/PrayerDotGrid';
import PrayerBreakdownBar from '../../components/charts/PrayerBreakdownBar';
import { useStore } from '../../store/useStore';
import { getPrayerIcon } from '../../assets/icons';
import StorageService from '../../services/StorageService';
import logger from '../../utils/logger';
import { usePrayerTimes } from '../../providers/PrayerTimesProvider';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';

type TimeRange = 'week' | 'month' | 'all';

type PrayerPattern = {
  name: string;
  count: number;
  color: string;
};

type InsightState = {
  completedPrayers: number;
  returnedDays: number;
  presenceCount: number;
  patternSummary: string;
  mostConsistentPrayer: string | null;
  atRiskPrayer: string | null;
  gentleNextStep: string;
};

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

const StatsScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const ambientColors = [theme.colors.ambient.top, theme.colors.ambient.bottom] as const;
  const {
    todayPrayerTimes,
    hasValidLocation,
    isLoading: prayerTimesLoading,
    error: prayerTimesError,
  } = usePrayerTimes();
  const { todayPrayerRecords } = useStore(
    useShallow((state) => ({
      todayPrayerRecords: state.todayPrayerRecords,
    })),
  );

  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [isLoading, setIsLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<number[]>([]);
  const [prayerBreakdown, setPrayerBreakdown] = useState<PrayerPattern[]>([]);
  const [insights, setInsights] = useState<InsightState>({
    completedPrayers: 0,
    returnedDays: 0,
    presenceCount: 0,
    patternSummary: 'Your first prayer begins the story here.',
    mostConsistentPrayer: null,
    atRiskPrayer: null,
    gentleNextStep: 'Start with the next prayer in front of you.',
  });

  useEffect(() => {
    if (hasValidLocation && todayPrayerTimes.length > 0) {
      loadInsights();
    }
  }, [timeRange, hasValidLocation, todayPrayerTimes.length]);

  const getPrayerColor = (prayer: string): string => {
    const colors = theme.colors.prayer;
    return colors[prayer.toLowerCase() as keyof typeof colors] || theme.colors.primary.DEFAULT;
  };

  const getRangeLabel = () => {
    if (timeRange === 'week') return 'This Week';
    if (timeRange === 'month') return 'This Month';
    return 'Last 90 Days';
  };

  const buildPatternSummary = (
    completedPrayers: number,
    returnedDays: number,
    dayCount: number,
    mostConsistentPrayer: string | null,
  ) => {
    if (completedPrayers === 0) {
      return 'Your first prayer begins the story here.';
    }
    if (returnedDays === dayCount) {
      return 'You returned to prayer every day in this period.';
    }
    if (mostConsistentPrayer) {
      return `${mostConsistentPrayer} has been the prayer you protect most often.`;
    }
    return 'Your return to prayer is taking shape.';
  };

  const buildGentleNextStep = (atRiskPrayer: string | null) => {
    if (!atRiskPrayer) {
      return 'Stay close to the next prayer and protect the calm you already have.';
    }
    return `${atRiskPrayer} is the prayer that slips most. Try an earlier preparation reminder for it.`;
  };

  const loadInsights = async () => {
    setIsLoading(true);
    try {
      const endDate = new Date();
      const startDate =
        timeRange === 'week'
          ? startOfWeek(endDate)
          : timeRange === 'month'
            ? startOfMonth(endDate)
            : subDays(endDate, 89);

      const days = eachDayOfInterval({ start: startDate, end: endDate });
      const prayerCounts = {
        fajr: 0,
        dhuhr: 0,
        asr: 0,
        maghrib: 0,
        isha: 0,
      };

      let completedPrayers = 0;
      let returnedDays = 0;
      let presenceCount = 0;
      const weekData = new Array(days.length).fill(0);

      days.forEach((day, index) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const records = StorageService.getDayPrayerRecords(dateStr);
        const prayedToday = records.filter((record) => record.status === 'prayed');

        if (prayedToday.length > 0) {
          returnedDays += 1;
        }

        completedPrayers += prayedToday.length;
        presenceCount += prayedToday.filter((record) => record.mindfulnessCompleted).length;
        weekData[index] = prayedToday.length;

        prayedToday.forEach((record) => {
          prayerCounts[record.prayer.toLowerCase() as keyof typeof prayerCounts] += 1;
        });
      });

      const allPrayerPatterns = Object.entries(prayerCounts)
        .map(([prayer, count]) => ({
          name: prayer.charAt(0).toUpperCase() + prayer.slice(1),
          count,
          color: getPrayerColor(prayer),
        }));
      const prayerPatterns = allPrayerPatterns.filter((item) => item.count > 0);

      const mostConsistentPrayer =
        prayerPatterns.length > 0
          ? prayerPatterns.reduce((highest, current) =>
              current.count > highest.count ? current : highest,
            ).name
          : null;

      const atRiskPrayer =
        allPrayerPatterns.length > 0
          ? allPrayerPatterns.reduce((lowest, current) =>
              current.count < lowest.count ? current : lowest,
            ).name
          : PRAYER_NAMES[0];

      setPrayerBreakdown(prayerPatterns);
      setWeeklyData(timeRange === 'week' ? weekData : weekData.slice(-7));
      setInsights({
        completedPrayers,
        returnedDays,
        presenceCount,
        patternSummary: buildPatternSummary(
          completedPrayers,
          returnedDays,
          days.length,
          mostConsistentPrayer,
        ),
        mostConsistentPrayer,
        atRiskPrayer: completedPrayers > 0 ? atRiskPrayer : null,
        gentleNextStep: buildGentleNextStep(completedPrayers > 0 ? atRiskPrayer : null),
      });
    } catch (error) {
      logger.error('Error loading prayer insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasValidLocation) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient colors={ambientColors} style={styles.gradient}>
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateIcon}>📍</Text>
            <Text style={styles.emptyStateTitle}>Location Required</Text>
            <Text style={styles.emptyStateText}>
              Please set your location to view prayer insights.
            </Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (prayerTimesLoading || (todayPrayerTimes.length === 0 && !prayerTimesError)) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient colors={ambientColors} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
            <Text style={styles.loadingText}>Preparing your prayer insights...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (prayerTimesError) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient colors={ambientColors} style={styles.gradient}>
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateIcon}>⚠️</Text>
            <Text style={styles.emptyStateTitle}>Prayer Times Unavailable</Text>
            <Text style={styles.emptyStateText}>{prayerTimesError}</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient colors={ambientColors} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
            <Text style={styles.loadingText}>Reading your recent prayer rhythm...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={ambientColors} style={styles.gradient}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Prayer Insights</Text>
            <Text style={styles.title}>Private Accountability</Text>
            <Text style={styles.subtitle}>
              A quiet record of return, rhythm, and the prayers that need more care.
            </Text>

            <View style={styles.timeRangeContainer}>
              {(['week', 'month', 'all'] as TimeRange[]).map((range) => (
                <TouchableOpacity
                  key={range}
                  style={[
                    styles.timeRangeButton,
                    timeRange === range && styles.timeRangeButtonActive,
                  ]}
                  onPress={() => setTimeRange(range)}
                >
                  <Text
                    style={[
                      styles.timeRangeText,
                      timeRange === range && styles.timeRangeTextActive,
                    ]}
                  >
                    {range === 'all'
                      ? 'Last 90 Days'
                      : range.charAt(0).toUpperCase() + range.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{getRangeLabel()}</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>
                  {insights.completedPrayers > 0 ? insights.completedPrayers : '—'}
                </Text>
                <Text style={styles.summaryLabel}>Prayers offered</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>
                  {insights.returnedDays > 0 ? insights.returnedDays : '—'}
                </Text>
                <Text style={styles.summaryLabel}>Days returned</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>
                  {insights.presenceCount > 0 ? insights.presenceCount : '—'}
                </Text>
                <Text style={styles.summaryLabel}>With presence</Text>
              </View>
            </View>
            <Text style={styles.patternSummary}>{insights.patternSummary}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today</Text>
            <View style={styles.todayCard}>
              {todayPrayerTimes.map((prayer) => {
                const record = todayPrayerRecords.find((item) => item.prayer === prayer.name);
                const isCompleted = record?.status === 'prayed';
                return (
                  <View key={prayer.name} style={styles.todayPrayerItem}>
                    <View style={styles.prayerIconContainer}>
                      {React.createElement(getPrayerIcon(prayer.name), {
                        size: 22,
                        color: isCompleted
                          ? theme.colors.primary.DEFAULT
                          : theme.colors.text.muted,
                      })}
                    </View>
                    <Text style={[styles.prayerName, isCompleted && styles.prayerNameComplete]}>
                      {prayer.name}
                    </Text>
                    <Text style={styles.prayerTime}>{format(prayer.time, 'HH:mm')}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {weeklyData.some((count) => count > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Prayer Rhythm</Text>
              <PrayerDotGrid data={weeklyData} />
            </View>
          )}

          {prayerBreakdown.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Patterns</Text>
              <View style={styles.patternCard}>
                <Text style={styles.patternLabel}>Most consistent prayer</Text>
                <Text style={styles.patternValue}>
                  {insights.mostConsistentPrayer || 'Still taking shape'}
                </Text>
              </View>
              <View style={styles.patternCard}>
                <Text style={styles.patternLabel}>Prayer needing more care</Text>
                <Text style={styles.patternValue}>
                  {insights.atRiskPrayer || 'Start with the next prayer'}
                </Text>
              </View>
              <PrayerBreakdownBar data={prayerBreakdown} />
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gentle Next Step</Text>
            <View style={styles.nextStepCard}>
              <Text style={styles.nextStepText}>{insights.gentleNextStep}</Text>
            </View>
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },
    gradient: {
      flex: 1,
    },
    header: {
      padding: theme.spacing.xl,
      paddingBottom: theme.spacing.lg,
    },
    eyebrow: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.muted,
      letterSpacing: 1.4,
      marginBottom: theme.spacing.sm,
      textTransform: 'uppercase',
    },
    title: {
      fontSize: 22,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      lineHeight: 22,
    },
    timeRangeContainer: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.lg,
    },
    timeRangeButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.card.background,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    timeRangeButtonActive: {
      borderColor: theme.colors.primary.DEFAULT,
      backgroundColor: theme.colors.card.hover,
    },
    timeRangeText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.text.secondary,
    },
    timeRangeTextActive: {
      color: theme.colors.primary.DEFAULT,
    },
    section: {
      paddingHorizontal: theme.spacing.xl,
      paddingBottom: theme.spacing.xl,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.lg,
    },
    summaryGrid: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    summaryCard: {
      flex: 1,
      backgroundColor: theme.colors.card.background,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      padding: theme.spacing.lg,
    },
    summaryValue: {
      fontSize: theme.typography.fontSize['3xl'],
      fontFamily: theme.typography.fontFamily.bodyBold,
      color: theme.colors.primary.DEFAULT,
      marginBottom: theme.spacing.xs,
    },
    summaryLabel: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.text.secondary,
    },
    patternSummary: {
      marginTop: theme.spacing.lg,
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      lineHeight: 22,
    },
    todayCard: {
      backgroundColor: theme.colors.card.background,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      paddingHorizontal: theme.spacing.lg,
    },
    todayPrayerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.primary,
    },
    prayerIconContainer: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.md,
    },
    prayerName: {
      flex: 1,
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.text.primary,
    },
    prayerNameComplete: {
      color: theme.colors.primary.DEFAULT,
    },
    prayerTime: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
    },
    patternCard: {
      backgroundColor: theme.colors.card.background,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    patternLabel: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.text.muted,
      marginBottom: theme.spacing.xs,
    },
    patternValue: {
      fontSize: theme.typography.fontSize.xl,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
    },
    nextStepCard: {
      backgroundColor: theme.colors.card.background,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      padding: theme.spacing.xl,
    },
    nextStepText: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      lineHeight: 24,
    },
    emptyStateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing['4xl'],
    },
    emptyStateIcon: {
      fontSize: 48,
      marginBottom: theme.spacing.lg,
    },
    emptyStateTitle: {
      fontSize: theme.typography.fontSize['2xl'],
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    emptyStateText: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing['4xl'],
    },
    loadingText: {
      marginTop: theme.spacing.lg,
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      textAlign: 'center',
    },
  });

export default StatsScreen;
