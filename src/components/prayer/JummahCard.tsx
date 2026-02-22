// src/components/prayer/JummahCard.tsx
// First-class Jummah card — displayed prominently on Fridays above the prayer list.
// Jummah is fard al-'ayn (obligatory), not optional. It deserves reverence.

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';

interface JummahCardProps {
  dhuhrTime: Date;
  onPrepare: () => void;
}

const JummahCard: React.FC<JummahCardProps> = ({ dhuhrTime, onPrepare }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const gradients = theme.colors.prayerGradients;
  const gradient = (gradients as any).Jumah || gradients.default;

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={gradient}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.label}>JUMU'AH</Text>
          <Text style={styles.arabicLabel}>صلاة الجمعة</Text>
        </View>

        {/* Time & info */}
        <View style={styles.body}>
          <Text style={styles.timeText}>{format(dhuhrTime, 'h:mm a')}</Text>
          <Text style={styles.subtitle}>
            "The best day on which the sun rises is Friday" — Prophet ﷺ
          </Text>
        </View>

        {/* Sunnah reminders */}
        <View style={styles.sunnahRow}>
          <View style={styles.sunnahChip}>
            <Text style={styles.sunnahText}>Surah Al-Kahf</Text>
          </View>
          <View style={styles.sunnahChip}>
            <Text style={styles.sunnahText}>Ghusl</Text>
          </View>
          <View style={styles.sunnahChip}>
            <Text style={styles.sunnahText}>Salawat</Text>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.prepareButton}
          onPress={onPrepare}
          activeOpacity={0.7}
        >
          <Text style={styles.prepareText}>Prepare for Jumu'ah</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    wrapper: {
      paddingHorizontal: theme.spacing.xl,
      marginBottom: theme.spacing.lg,
    },
    container: {
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    label: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      letterSpacing: 2,
      color: '#D4AF37',
    },
    arabicLabel: {
      fontSize: theme.typography.fontSize.lg,
      color: 'rgba(212, 175, 55, 0.8)',
      fontWeight: theme.typography.fontWeight.medium,
      fontFamily: theme.typography.fontFamily.arabic,
    },
    body: {
      marginBottom: theme.spacing.lg,
    },
    timeText: {
      fontSize: theme.typography.fontSize['5xl'],
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs + 2,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      fontStyle: 'italic',
      lineHeight: 18,
    },
    sunnahRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    sunnahChip: {
      backgroundColor: 'rgba(212, 175, 55, 0.15)',
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.md - 2,
      paddingVertical: theme.spacing.xs + 1,
      borderWidth: 1,
      borderColor: 'rgba(212, 175, 55, 0.25)',
    },
    sunnahText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    prepareButton: {
      backgroundColor: 'rgba(212, 175, 55, 0.2)',
      borderWidth: 1,
      borderColor: 'rgba(212, 175, 55, 0.4)',
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
    },
    prepareText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: '#D4AF37',
      letterSpacing: 0.3,
    },
  });

export default JummahCard;
