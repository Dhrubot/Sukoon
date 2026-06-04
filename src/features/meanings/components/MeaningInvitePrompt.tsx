// MeaningInvitePrompt — dismissible invite card for the daily reflection feature.
//
// Self-gating: returns null when the eligibility hook says shouldShow is false.
// Calls markShown() exactly once on mount (guarded by useRef) so the prompt
// counter isn't burned on re-renders.

import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useThemedStyles } from '../../../hooks/useThemedStyles';
import { AppTheme } from '../../../theme';
import { useMeaningPromptEligibility } from '../hooks/useMeaningPromptEligibility';

// ─── Props ─────────────────────────────────────────────────────────────────
// Currently empty — reserved for future variants (banner vs card).
export interface MeaningInvitePromptProps {}

// ─── Component ─────────────────────────────────────────────────────────────
export const MeaningInvitePrompt: React.FC<MeaningInvitePromptProps> = () => {
  const styles = useThemedStyles(createStyles);
  const { shouldShow, markShown, onAnswer, onDismiss } = useMeaningPromptEligibility();

  const hasMarkedShown = useRef(false);

  useEffect(() => {
    if (shouldShow && !hasMarkedShown.current) {
      hasMarkedShown.current = true;
      markShown();
    }
  }, [shouldShow, markShown]);

  if (!shouldShow) {
    return null;
  }

  return (
    <View style={styles.card}>
      {/* Dismiss button */}
      <TouchableOpacity
        style={styles.dismissButton}
        onPress={onDismiss}
        accessibilityLabel="Dismiss"
        accessibilityRole="button"
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <Text style={styles.dismissText}>✕</Text>
      </TouchableOpacity>

      {/* Heading */}
      <Text style={styles.heading}>
        Some of the most familiar words become new again when we sit with their meanings.
      </Text>

      {/* Body */}
      <Text style={styles.body}>
        Would you like a brief reflection on what you say in prayer, in your Garden each day?
      </Text>

      {/* Actions */}
      <View style={styles.actions}>
        {/* Primary */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => onAnswer('yes')}
          accessibilityRole="button"
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Yes, I'd like that</Text>
        </TouchableOpacity>

        {/* Secondary (outline) */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => onAnswer('later')}
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>Not right now</Text>
        </TouchableOpacity>

        {/* Tertiary (text-only) */}
        <TouchableOpacity
          onPress={() => onAnswer('know')}
          accessibilityRole="button"
          activeOpacity={0.6}
        >
          <Text style={styles.tertiaryButtonText}>
            I'm comfortable with the meanings
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────
const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.meanings.cardBg,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.meanings.cardBorder,
      padding: theme.spacing.xl,
      marginHorizontal: theme.spacing.xl,
      marginVertical: theme.spacing.md,
    },
    dismissButton: {
      position: 'absolute',
      top: theme.spacing.sm,
      right: theme.spacing.sm,
      zIndex: 1,
      padding: theme.spacing.xs,
    },
    dismissText: {
      fontSize: 14,
      color: theme.colors.text.muted,
      fontFamily: theme.typography.fontFamily.body,
    },
    heading: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.meanings.arabicAccent,
      lineHeight: 22,
      marginBottom: theme.spacing.md,
      marginRight: theme.spacing.lg,
    },
    body: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.meanings.reflectionText,
      lineHeight: 22,
      marginBottom: theme.spacing.lg,
    },
    actions: {
      gap: theme.spacing.sm,
    },
    primaryButton: {
      backgroundColor: theme.colors.meanings.chipActiveBg,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
    },
    primaryButtonText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.meanings.chipActiveText,
    },
    secondaryButton: {
      borderWidth: 1,
      borderColor: theme.colors.meanings.chipBg,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
    },
    secondaryButtonText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.meanings.chipText,
    },
    tertiaryButtonText: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.muted,
      textAlign: 'center',
      paddingVertical: theme.spacing.xs,
    },
  });

export default MeaningInvitePrompt;
