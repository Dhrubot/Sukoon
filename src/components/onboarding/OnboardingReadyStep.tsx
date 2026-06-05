import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { CALCULATION_METHODS, Location } from '../../types';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { OnboardingActions } from './OnboardingActions';
import { OnboardingScaffold } from './OnboardingScaffold';
import { resolveCalculationMethodForCountry } from '../../utils/calculationMethodByRegion';
import { SegmentedControl } from '../settings/SegmentedControl';

interface OnboardingReadyStepProps {
  progress: number;
  locationData: Location | null;
  notificationsEnabled: boolean;
  asrJuristic: 'Standard' | 'Hanafi';
  displayName: string;
  onAsrJuristicChange: (value: 'Standard' | 'Hanafi') => void;
  onDisplayNameChange: (value: string) => void;
  onContinue: () => void;
}

const SummaryRow: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
};

export const OnboardingReadyStep: React.FC<OnboardingReadyStepProps> = ({
  progress,
  locationData,
  notificationsEnabled,
  asrJuristic,
  displayName,
  onAsrJuristicChange,
  onDisplayNameChange,
  onContinue,
}) => {
  const styles = useThemedStyles(createStyles);
  const regionalMethod = resolveCalculationMethodForCountry(
    locationData?.country,
    locationData?.countryCode,
  );
  const methodLabel =
    CALCULATION_METHODS.find((method) => method.value === regionalMethod)?.label || regionalMethod;
  const methodSummary = locationData?.country
    ? `Using ${methodLabel} for ${locationData.country}`
    : `Using ${methodLabel} as the default method`;
  const asrOptions = [
    {
      value: 'Standard',
      label: 'Standard',
      description: 'Most global timetables',
    },
    {
      value: 'Hanafi',
      label: 'Hanafi',
      description: 'Later Asr time',
    },
  ];

  return (
    <OnboardingScaffold
      progress={progress}
      titleVariant="hero"
      align="center"
      title="You're ready"
      subtitle="Sukoon is set up. You can refine details later without slowing down the first prayer."
      footer={<OnboardingActions primaryLabel="Enter Sukoon" onPrimaryPress={onContinue} />}
    >
      <View style={styles.nameCard}>
        <Text style={styles.nameLabel}>OPTIONAL</Text>
        <Text style={styles.nameTitle}>What should Sukoon call you?</Text>
        <TextInput
          value={displayName}
          onChangeText={onDisplayNameChange}
          placeholder="Your name"
          placeholderTextColor={styles.nameInputPlaceholder.color}
          style={styles.nameInput}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
        />
      </View>

      <View style={styles.asrCard}>
        <Text style={styles.summaryLabel}>ASR TIMING</Text>
        <Text style={styles.asrTitle}>Choose your Asr juristic method</Text>
        <Text style={styles.asrBody}>
          Choose Hanafi if your mosque or local timetable follows it. You can change this later in Settings.
        </Text>
        <SegmentedControl
          options={asrOptions}
          selectedValue={asrJuristic}
          onValueChange={(value) => onAsrJuristicChange(value as 'Standard' | 'Hanafi')}
          style={styles.asrControl}
        />
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>SETUP SUMMARY</Text>
        <SummaryRow
          label="Location"
          value={locationData ? `${locationData.city || 'Your city'}, ${locationData.country || ''}`.replace(/, $/, '') : 'Set later'}
        />
        <View style={styles.divider} />
        <SummaryRow
          label="Reminders"
          value={notificationsEnabled ? 'Enabled' : 'Not now'}
        />
        <View style={styles.divider} />
        <SummaryRow
          label="Prayer method"
          value={methodSummary}
        />
        <View style={styles.divider} />
        <SummaryRow
          label="Asr timing"
          value={asrJuristic}
        />
      </View>

      <Text style={styles.note}>
        You can change prayer method, sounds, reminders, and Mosque Mode later in Settings.
      </Text>
    </OnboardingScaffold>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    summaryCard: {
      width: '100%',
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      backgroundColor: theme.colors.onboarding.optionBg,
      borderWidth: 1,
      borderColor: theme.colors.onboarding.optionBorder,
      gap: theme.spacing.md,
    },
    asrCard: {
      width: '100%',
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      backgroundColor: theme.colors.onboarding.optionBg,
      borderWidth: 1,
      borderColor: theme.colors.onboarding.optionBorder,
      gap: theme.spacing.sm,
    },
    nameCard: {
      width: '100%',
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      backgroundColor: theme.colors.onboarding.optionBg,
      borderWidth: 1,
      borderColor: theme.colors.onboarding.optionBorder,
      gap: theme.spacing.sm,
    },
    nameLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.onboarding.textHint,
      letterSpacing: 1.2,
      textAlign: 'left',
    },
    nameTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
    },
    nameInput: {
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.onboarding.inputBorder,
      backgroundColor: theme.colors.onboarding.inputBg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.primary,
    },
    nameInputPlaceholder: {
      color: theme.colors.onboarding.placeholder,
    },
    summaryLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.onboarding.textHint,
      letterSpacing: 1.2,
      textAlign: 'left',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: theme.spacing.lg,
    },
    rowLabel: {
      flex: 1,
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
    },
    rowValue: {
      flex: 1,
      textAlign: 'right',
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
    },
    asrTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
    },
    asrBody: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.onboarding.textMuted,
      lineHeight: 20,
    },
    asrControl: {
      marginTop: theme.spacing.xs,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.onboarding.optionBorder,
    },
    note: {
      width: '100%',
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.onboarding.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
  });
