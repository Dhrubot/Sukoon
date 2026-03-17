// src/components/prayer/CatchUpCard.tsx
// Warm, non-judgmental card shown when ≥3 prayers need making up.
// Collapses individual "Make Up" cards into a single actionable entry point.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import PrayerTimeService from '../../services/PrayerTimeService';
import { PrayerTime } from '../../types';

interface CatchUpCardProps {
  missedPrayers: PrayerTime[];
  onCatchUp: (prayer: PrayerTime) => void;
}

const CatchUpCard: React.FC<CatchUpCardProps> = ({ missedPrayers, onCatchUp }) => {
  const styles = useThemedStyles(createStyles);

  if (missedPrayers.length < 3) return null;

  const earliest = missedPrayers[0];
  const earliestName = PrayerTimeService.getPrayerDisplayName(earliest.name);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        You have {missedPrayers.length} prayers to return to
      </Text>
      <Text style={styles.message}>
        Begin with {earliestName} — every step back is beloved.
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => onCatchUp(earliest)}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Make Up {earliestName}</Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.lg,
      marginTop: theme.spacing.lg,
      padding: theme.spacing.xl,
      backgroundColor: theme.colors.card.background,
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border.secondary,
      alignItems: 'center',
    },
    icon: {
      fontSize: 32,
      marginBottom: theme.spacing.sm,
    },
    title: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.primary,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
    },
    message: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: theme.spacing.lg,
    },
    button: {
      backgroundColor: 'transparent',
      borderRadius: theme.borderRadius.full,
      borderWidth: 1.5,
      borderColor: theme.colors.primary.DEFAULT,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing['2xl'],
      alignItems: 'center',
    },
    buttonText: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.primary.DEFAULT,
    },
  });

export default CatchUpCard;
