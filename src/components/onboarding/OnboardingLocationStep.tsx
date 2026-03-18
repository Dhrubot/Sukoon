import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { OnboardingActions } from './OnboardingActions';
import { OnboardingScaffold } from './OnboardingScaffold';

type LocationFailureReason = 'none' | 'permission_denied' | 'permission_blocked' | 'gps_failed';

interface OnboardingLocationStepProps {
  progress: number;
  isLocating: boolean;
  locationFailed: boolean;
  locationFailureReason: LocationFailureReason;
  onAllowLocation: () => void;
  onOpenSettings: () => void;
  onChooseManual: () => void;
  onSkip: () => void;
}

const getLocationHelpText = (reason: LocationFailureReason) => {
  switch (reason) {
    case 'permission_blocked':
      return 'Location access is blocked in system settings. Open settings or choose your nearest major city manually.';
    case 'permission_denied':
      return 'Location access is still off. Try again or choose your nearest major city manually.';
    case 'gps_failed':
      return 'We could not detect your location automatically. Try again or choose your nearest major city manually.';
    default:
      return '';
  }
};

export const OnboardingLocationStep: React.FC<OnboardingLocationStepProps> = ({
  progress,
  isLocating,
  locationFailed,
  locationFailureReason,
  onAllowLocation,
  onOpenSettings,
  onChooseManual,
  onSkip,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <OnboardingScaffold
      progress={progress}
      title="Set your prayer times"
      subtitle="Use your current location or choose your city manually for accurate prayer times."
      description="You can continue without it, but Sukoon will need a location before it can show real prayer times."
      footer={
        <OnboardingActions
          primaryLabel={
            isLocating
              ? 'Finding your location...'
              : locationFailureReason === 'permission_blocked'
                ? 'Open App Settings'
                : 'Allow Location Access'
          }
          onPrimaryPress={locationFailureReason === 'permission_blocked' ? onOpenSettings : onAllowLocation}
          primaryDisabled={isLocating}
          secondaryLabel="Choose City Manually"
          onSecondaryPress={onChooseManual}
          tertiaryLabel="Skip for now"
          onTertiaryPress={onSkip}
        />
      }
    >
      <View style={styles.previewCard}>
        <Text style={styles.cardLabel}>WHY IT MATTERS</Text>
        <Text style={styles.cardTitle}>Prayer times change by city</Text>
        <Text style={styles.cardBody}>
          Fajr, Maghrib, and even your next-prayer countdown depend on your location. Sukoon uses it only to calculate prayer times on your device.
        </Text>
      </View>

      <View style={styles.previewCard}>
        <Text style={styles.cardLabel}>WITH LOCATION</Text>
        <View style={styles.previewRow}>
          <Text style={styles.previewPrayer}>Fajr</Text>
          <Text style={styles.previewMeta}>Accurate for your city</Text>
        </View>
        <View style={styles.previewDivider} />
        <View style={styles.previewRow}>
          <Text style={styles.previewPrayer}>Maghrib</Text>
          <Text style={styles.previewMeta}>Adjusts when you travel</Text>
        </View>
      </View>

      {isLocating ? (
        <View style={styles.statusCard}>
          <ActivityIndicator size="small" color={theme.colors.primary.DEFAULT} />
          <Text style={styles.statusText}>Finding your location...</Text>
        </View>
      ) : null}

      {locationFailed ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Location needs a little help</Text>
          <Text style={styles.statusText}>{getLocationHelpText(locationFailureReason)}</Text>
        </View>
      ) : null}
    </OnboardingScaffold>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    previewCard: {
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      backgroundColor: theme.colors.onboarding.optionBg,
      borderWidth: 1,
      borderColor: theme.colors.onboarding.optionBorder,
      gap: theme.spacing.sm,
    },
    cardLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.onboarding.textHint,
      letterSpacing: 1.2,
    },
    cardTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
    },
    cardBody: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.onboarding.textMuted,
      lineHeight: 22,
    },
    previewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.lg,
    },
    previewPrayer: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
    },
    previewMeta: {
      flex: 1,
      textAlign: 'right',
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
    },
    previewDivider: {
      height: 1,
      backgroundColor: theme.colors.onboarding.optionBorder,
    },
    statusCard: {
      gap: theme.spacing.sm,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.card.background,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    statusTitle: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
    },
    statusText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      lineHeight: 20,
    },
  });
