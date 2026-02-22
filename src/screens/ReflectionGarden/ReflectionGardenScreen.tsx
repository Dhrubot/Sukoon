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
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '300',
    fontStyle: 'italic',
    color: theme.colors.text.muted,
    lineHeight: 22,
    flex: 1,
  },
  timeIcon: {
    fontSize: 28,
    marginLeft: 12,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyEmoji: {
    fontSize: 72,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '300',
    fontFamily: theme.typography.fontFamily.headingRegular,
    color: theme.colors.text.primary,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    color: theme.colors.text.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyCta: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderWidth: 1,
  },
  emptyCtaText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ReflectionGardenScreen;
