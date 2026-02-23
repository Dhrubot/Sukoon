// src/screens/ReflectionGarden/ReflectionGardenScreen.tsx
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { useReflectionGarden } from '../../hooks/useReflectionGarden';
import GardenCanvas from '../../components/garden/GardenCanvas';
import WeekTimeline from '../../components/garden/WeekTimeline';
import ReflectionJournal from '../../components/garden/ReflectionJournal';

const ReflectionGardenScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation();
  const {
    plants,
    weekSummary,
    recentReflections,
    isEmpty,
    isLoading,
  } = useReflectionGarden(28);

  // Time-of-day icon
  const getTimeIcon = () => {
    const hour = new Date().getHours();
    if (hour < 5 || hour >= 21) return '🌙';
    if (hour < 7) return '🌅';
    if (hour < 17) return '☀️';
    if (hour < 19) return '🌇';
    return '🌙';
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>Growing your garden...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state for new users
  if (isEmpty) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🌱</Text>
          <Text style={styles.emptyTitle}>Every garden begins{'\n'}with a single seed</Text>
          <Text style={styles.emptySubtitle}>
            Complete your next prayer with a reflection,{'\n'}and watch your garden grow
          </Text>
          <TouchableOpacity
            style={[styles.emptyCta, { borderColor: theme.colors.primary.DEFAULT }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.emptyCtaText, { color: theme.colors.primary.DEFAULT }]}>
              Return to prayers 🤲
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.subtitle}>
            Your garden grows with{'\n'}every moment of reflection
          </Text>
          <Text style={styles.timeIcon}>{getTimeIcon()}</Text>
        </View>

        {/* Main garden canvas */}
        <GardenCanvas plants={plants} />

        {/* Week timeline */}
        <WeekTimeline weekSummary={weekSummary} />

        {/* Recent reflections journal */}
        <ReflectionJournal reflections={recentReflections} />

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.body,
    fontStyle: 'italic',
    color: theme.colors.text.muted,
    lineHeight: 22,
    flex: 1,
  },
  timeIcon: {
    fontSize: theme.typography.fontSize['4xl'],
    marginLeft: theme.spacing.md,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing['4xl'],
    paddingTop: 80,
  },
  emptyEmoji: {
    fontSize: 72,
    marginBottom: theme.spacing['2xl'],
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
});

export default ReflectionGardenScreen;
