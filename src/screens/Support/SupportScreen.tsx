import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import { AppTheme } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';

const SupportScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const ambientColors = [theme.colors.ambient.top, theme.colors.ambient.bottom] as const;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={ambientColors} style={styles.gradient}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Support Paused</Text>
            <Text style={styles.title}>Support Sukoon</Text>
            <Text style={styles.subtitle}>
              Donation and premium purchase flows are temporarily unavailable while this area is being rebuilt.
            </Text>
          </View>

          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>Temporarily unavailable</Text>
            <Text style={styles.noteText}>
              Sukoon continues to work without any donation flow. This screen will return later with a simpler support model.
            </Text>
          </View>
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
    content: {
      padding: theme.spacing.xl,
      paddingBottom: theme.spacing['4xl'],
    },
    header: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xl,
    },
    eyebrow: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.muted,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    title: {
      fontSize: 24,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      lineHeight: 24,
    },
    noteCard: {
      backgroundColor: theme.colors.card.background,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border.secondary,
      padding: theme.spacing.xl,
      marginBottom: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    noteTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
    },
    noteText: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      lineHeight: 22,
    },
  });

export default SupportScreen;
