// src/screens/ReflectionGarden/ReflectionGardenScreen.tsx

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import DevTreeTester from '../../components/garden/DevTreeTester';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { useReflectionGarden } from '../../hooks/useReflectionGarden';
import { TreeLeafData, LeafDetailData } from '../../types/tubaTree';
import { isRamadan, getRamadanDay } from '../../utils/ramadan';
import TubaTreeCanvas from '../../components/garden/TubaTreeCanvas';
import WeekTimeline from '../../components/garden/WeekTimeline';
import ReflectionJournal from '../../components/garden/ReflectionJournal';
import DawamBadge from '../../components/garden/DawamBadge';
import LeafDetailSheet from '../../components/garden/LeafDetailSheet';
import MiniTubaTree from '../../components/garden/MiniTubaTree';
import { FARD_PRAYERS } from '../../constants/prayerRegistry';
import { resolveTreePrayerColor } from '../../constants/tubaTree';

const ReflectionGardenScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const ambientColors = [theme.colors.ambient.top, theme.colors.ambient.bottom] as const;
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const {
    plants,
    weekSummary,
    recentReflections,
    isEmpty,
    isLoading,
  } = useReflectionGarden(28);

  // DEV-ONLY: Tree stage tester
  const [devMode, setDevMode] = useState(false);

  // ── Leaf detail state ───────────────────────────────────────────
  const [selectedLeaf, setSelectedLeaf] = useState<LeafDetailData | null>(null);

  const handleLeafPress = useCallback((leaf: TreeLeafData) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLeaf({
      prayer: leaf.prayer,
      date: leaf.date,
      mood: leaf.mood,
      growthStage: leaf.growthStage,
      hasText: leaf.hasText,
      screenX: leaf.x,
      screenY: leaf.y,
    });
  }, []);

  const dismissLeafDetail = useCallback(() => {
    setSelectedLeaf(null);
  }, []);

  // ── Ramadan detection ───────────────────────────────────────────
  const ramadan = useMemo(() => isRamadan(), []);
  const ramadanDay = useMemo(() => getRamadanDay(), []);

  // ── Derived stats ───────────────────────────────────────────────
  const dawamDays = useMemo(() => {
    if (plants.length === 0) return 0;
    const dates = new Set(plants.map((p) => p.date));
    const today = new Date();
    let count = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      if (dates.has(dateStr)) {
        count++;
      } else if (i > 0) {
        break;
      }
    }
    return count;
  }, [plants]);

  const writtenReflectionCount = useMemo(
    () => recentReflections.filter((reflection) => (reflection.text?.trim().length ?? 0) > 0).length,
    [recentReflections],
  );
  const emptyTreeSize = Math.min(width * 0.42, 180);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={ambientColors} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
            <Text style={styles.loadingText}>Opening your private reflections...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // DEV-ONLY: Show tree tester when devMode is active
  if (__DEV__ && devMode) {
    return <DevTreeTester onClose={() => setDevMode(false)} />;
  }

  if (isEmpty) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={ambientColors} style={styles.gradient}>
          <ScrollView contentContainerStyle={styles.emptyContainer}>
            <View style={styles.emptyTreeWrap}>
              <MiniTubaTree size={emptyTreeSize} activeBranches={0} />
            </View>
            <Text style={styles.emptyTitle}>
              The Tuba Tree begins{'\n'}with a single return
            </Text>
            <Text style={styles.emptySubtitle}>
              After your next prayer, you can leave a quiet note here. This space is private witness, not a score.
            </Text>
            <TouchableOpacity
              style={[styles.emptyCta, { borderColor: theme.colors.primary.DEFAULT }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.emptyCtaText, { color: theme.colors.primary.DEFAULT }]}>
                Return to prayers
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.emptyInfoLink}
              onPress={() => navigation.navigate('MainTabs', { screen: 'Menu', params: { screen: 'TubaTreeInfo' } })}
              activeOpacity={0.7}
            >
              <Text style={[styles.emptyInfoLinkText, { color: theme.colors.interactive.active }]}>
                Learn about the Tuba Tree →
              </Text>
            </TouchableOpacity>
            {__DEV__ && (
              <TouchableOpacity
                style={styles.devButton}
                onPress={() => setDevMode(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.devButtonText}>🧪 Test Tree Stages</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={ambientColors} style={styles.gradient}>
      <ScrollView showsVerticalScrollIndicator={false} bounces>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.subtitle}>
              {ramadan
                ? 'Blessed Ramadan — every prayer\nis shade on the Day of Judgment'
                : 'A private witness to prayer,\nreturn, and reflection'}
            </Text>
          </View>
          <DawamBadge days={dawamDays} />
        </View>

        {/* Main tree canvas — with Ramadan mode and leaf press */}
        <TubaTreeCanvas
          plants={plants}
          isRamadan={ramadan}
          ramadanDay={ramadanDay}
          onLeafPress={handleLeafPress}
        />

        {/* Prayer color legend */}
        <View style={styles.legendRow}>
          {FARD_PRAYERS.map((prayer) => {
            const color = resolveTreePrayerColor(
              theme.mode as 'dark' | 'light' | 'midnight',
              prayer.key,
            );
            return (
              <View key={prayer.key} style={styles.legendChip}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={[styles.legendLabel, { color: theme.colors.text.muted }]}>
                  {prayer.name}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text style={[styles.statVal, { color: theme.colors.garden.dawamPillText }]}>
              {plants.length > 0 ? plants.length : '—'}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.text.muted }]}>
              reflections
            </Text>
          </View>
          <View style={[styles.statBlock, styles.statBlockBorder]}>
            <Text style={[styles.statVal, { color: theme.colors.interactive.active }]}>
              {dawamDays > 0 ? dawamDays : '—'}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.text.muted }]}>
              {dawamDays > 0 ? 'days of return' : 'begin today'}
            </Text>
          </View>
          <View style={[styles.statBlock, styles.statBlockBorder]}>
            <Text style={[styles.statVal, { color: theme.colors.primary.DEFAULT }]}>
              {writtenReflectionCount > 0 ? writtenReflectionCount : '—'}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.text.muted }]}>
              {writtenReflectionCount > 0 ? 'written notes' : 'written notes'}
            </Text>
          </View>
        </View>

        {/* Week timeline */}
        <WeekTimeline weekSummary={weekSummary} />

        {/* Recent reflections journal */}
        <ReflectionJournal reflections={recentReflections} />

        {/* Learn more link */}
        <TouchableOpacity
          style={styles.infoLink}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Menu', params: { screen: 'TubaTreeInfo' } })}
          activeOpacity={0.7}
        >
          <Text style={[styles.infoLinkText, { color: theme.colors.interactive.active }]}>
            About the Tuba Tree →
          </Text>
        </TouchableOpacity>

        {/* DEV-ONLY: Tree stage tester button */}
        {__DEV__ && (
          <TouchableOpacity
            style={[styles.devButton, { alignSelf: 'center', marginBottom: 8 }]}
            onPress={() => setDevMode(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.devButtonText}>🧪 Test Tree Stages</Text>
          </TouchableOpacity>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
      </LinearGradient>

      {/* Leaf detail overlay — appears when a leaf is tapped */}
      <LeafDetailSheet detail={selectedLeaf} onDismiss={dismissLeafDetail} />
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
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: theme.spacing.lg,
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      fontStyle: 'italic',
    },

    // Header
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.lg,
    },
    headerText: {
      flex: 1,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      fontStyle: 'italic',
      color: theme.colors.text.muted,
      lineHeight: 22,
    },

    // Legend
    legendRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 5,
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.sm,
    },
    legendChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: 20,
      paddingVertical: 3,
      paddingHorizontal: 9,
      backgroundColor: theme.colors.card.background,
      borderWidth: 1,
      borderColor: theme.colors.border.secondary,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendLabel: {
      fontSize: 10,
      fontFamily: theme.typography.fontFamily.body,
    },

    // Stats
    statsRow: {
      flexDirection: 'row',
      marginHorizontal: theme.spacing.xl,
      marginTop: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.card.background,
      borderWidth: 1,
      borderColor: theme.colors.border.secondary,
      overflow: 'hidden',
    },
    statBlock: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
    },
    statBlockBorder: {
      borderLeftWidth: 1,
      borderLeftColor: theme.colors.border.secondary,
    },
    statVal: {
      fontSize: 22,
      fontFamily: theme.typography.fontFamily.headingRegular,
      fontWeight: '300',
    },
    statLabel: {
      fontSize: 9,
      fontFamily: theme.typography.fontFamily.body,
      marginTop: 1,
      letterSpacing: 0.3,
    },

    // Info link
    infoLink: {
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
      marginTop: theme.spacing.sm,
    },
    infoLinkText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.bodyMedium,
    },

    // Empty state
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing['4xl'],
      paddingTop: 80,
    },
    emptyTreeWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing['2xl'],
      minHeight: 140,
    },
    emptyTitle: {
      fontSize: theme.typography.fontSize['3xl'] + 2,
      fontWeight: '300',
      fontFamily: theme.typography.fontFamily.headingRegular,
      color: theme.colors.text.primary,
      textAlign: 'center',
      lineHeight: 34,
      marginBottom: theme.spacing.lg,
    },
    emptySubtitle: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.muted,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: theme.spacing['3xl'],
    },
    emptyCta: {
      borderRadius: theme.borderRadius.md + 2,
      paddingVertical: theme.spacing.md + 2,
      paddingHorizontal: theme.spacing['2xl'] + 4,
      borderWidth: 1,
    },
    emptyCtaText: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodyMedium,
    },
    emptyInfoLink: {
      marginTop: theme.spacing.xl,
    },
    emptyInfoLinkText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.bodyMedium,
    },
    devButton: {
      marginTop: theme.spacing['3xl'],
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 10,
      backgroundColor: theme.colors.card.background,
      borderWidth: 1,
      borderColor: theme.colors.border.secondary,
    },
    devButtonText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.text.muted,
    },
  });

export default ReflectionGardenScreen;
