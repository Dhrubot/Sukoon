import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { OnboardingActions } from './OnboardingActions';
import { OnboardingScaffold } from './OnboardingScaffold';

interface OnboardingNotificationStepProps {
  progress: number;
  onEnable: () => void;
  onSkip: () => void;
}

export const OnboardingNotificationStep: React.FC<OnboardingNotificationStepProps> = ({
  progress,
  onEnable,
  onSkip,
}) => {
  const styles = useThemedStyles(createStyles);

  return (
    <OnboardingScaffold
      progress={progress}
      title="Prayer reminders"
      subtitle="Turn on reminders so Sukoon can gently bring you back when it is time to pray."
      description="You can adjust sound, adhan, and reminder style later in Settings."
      footer={
        <OnboardingActions
          primaryLabel="Enable Reminders"
          onPrimaryPress={onEnable}
          tertiaryLabel="Not now"
          onTertiaryPress={onSkip}
        />
      }
    >
      <View style={styles.card}>
        <Text style={styles.cardLabel}>WHAT YOU GET</Text>
        {/* <View style={styles.benefitRow}>
          <Text style={styles.benefitTitle}>Before prayer</Text>
          <Text style={styles.benefitText}>A gentle nudge so you can prepare with less rush.</Text>
        </View>
        <View style={styles.divider} /> */}
        <View style={styles.benefitRow}>
          <Text style={styles.benefitTitle}>At prayer time</Text>
          <Text style={styles.benefitText}>A calm reminder anchored to your local prayer schedule.</Text>
        </View>
      </View>
    </OnboardingScaffold>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      backgroundColor: theme.colors.onboarding.optionBg,
      borderWidth: 1,
      borderColor: theme.colors.onboarding.optionBorder,
      gap: theme.spacing.lg,
    },
    cardLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.onboarding.textHint,
      letterSpacing: 1.2,
    },
    benefitRow: {
      gap: theme.spacing.xs,
    },
    benefitTitle: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
    },
    benefitText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      lineHeight: 20,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.onboarding.optionBorder,
    },
  });
