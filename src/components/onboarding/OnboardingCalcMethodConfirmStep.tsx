// src/components/onboarding/OnboardingCalcMethodConfirmStep.tsx
//
// Onboarding step that shows the auto-detected calculation method and a live
// preview of today's prayer times so the user can confirm or change it before
// entering the app for the first time.

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { format } from 'date-fns';
import { CALCULATION_METHODS, CalculationMethod, CalculationMethodType, Location, PrayerTime } from '../../types';
import { resolveCalculationMethodForCountry } from '../../utils/calculationMethodByRegion';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { OnboardingActions } from './OnboardingActions';
import { OnboardingScaffold } from './OnboardingScaffold';
import { CalculationMethodModal } from '../../screens/Settings/modals/CalculationMethodModal';

interface OnboardingCalcMethodConfirmStepProps {
  progress: number;
  locationData: Location | null;
  asrJuristic: 'Standard' | 'Hanafi';
  /** Called with the confirmed method when user taps "Use this method" */
  onConfirm: (method: CalculationMethod) => void;
}

const getMethodDescription = (method: CalculationMethod): string => {
  const descriptions: Record<CalculationMethod, string> = {
    MWL: 'Used worldwide — conservative approach',
    ISNA: 'Common in North America',
    Egypt: 'Egyptian General Authority method',
    Makkah: 'Umm al-Qura — used in Saudi Arabia',
    Karachi: 'University of Islamic Sciences, Pakistan',
    Tehran: 'Institute of Geophysics, Tehran',
    Jafari: 'Shia Ithna Ashari method',
  };
  return descriptions[method] || 'Standard calculation method';
};

export const OnboardingCalcMethodConfirmStep: React.FC<OnboardingCalcMethodConfirmStepProps> = ({
  progress,
  locationData,
  asrJuristic,
  onConfirm,
}) => {
  const styles = useThemedStyles(createStyles);

  const autoMethod = resolveCalculationMethodForCountry(
    locationData?.country,
    locationData?.countryCode,
  );
  const [selectedMethod, setSelectedMethod] = useState<CalculationMethod>(autoMethod);
  const [previewTimes, setPreviewTimes] = useState<PrayerTime[] | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [previewPrayerTimes, setPreviewPrayerTimes] = useState<{ method: string; times: PrayerTime[] } | null>(null);
  const [isPreviewingMethod, setIsPreviewingMethod] = useState(false);

  const methodLabel = CALCULATION_METHODS.find(m => m.value === selectedMethod)?.label ?? selectedMethod;

  // Load a live preview of today's times whenever selectedMethod changes
  useEffect(() => {
    let cancelled = false;
    if (!locationData) return;

    setIsLoadingPreview(true);
    setPreviewTimes(null);

    const load = async () => {
      try {
        const PrayerTimeService = (await import('../../services/PrayerTimeService')).default;
        const { prayerTimes } = await PrayerTimeService.getPrayerTimesList(
          locationData,
          new Date(),
          selectedMethod,
          undefined,
          asrJuristic
        );
        if (!cancelled) setPreviewTimes(prayerTimes);
      } catch {
        // Preview is best-effort; if it fails, we just don't show times
        if (!cancelled) setPreviewTimes([]);
      } finally {
        if (!cancelled) setIsLoadingPreview(false);
      }
    };
    void load();

    return () => { cancelled = true; };
  }, [selectedMethod, locationData, asrJuristic]);

  const handlePreviewMethod = async (method: CalculationMethodType) => {
    if (!locationData) return;
    setIsPreviewingMethod(true);
    try {
      const PrayerTimeService = (await import('../../services/PrayerTimeService')).default;
      const { prayerTimes } = await PrayerTimeService.getPrayerTimesList(
        locationData,
        new Date(),
        method.value,
        undefined,
        asrJuristic
      );
      setPreviewPrayerTimes({ method: method.label, times: prayerTimes });
    } catch {
      setPreviewPrayerTimes(null);
    } finally {
      setIsPreviewingMethod(false);
    }
  };

  const handleMethodSelect = (method: CalculationMethodType) => {
    setSelectedMethod(method.value);
    setPreviewPrayerTimes(null);
    setShowMethodPicker(false);
  };

  const FARD_NAMES: Array<'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha'> = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

  return (
    <>
      <OnboardingScaffold
        progress={progress}
        eyebrow="PRAYER TIMES"
        title="Confirm your calculation method"
        subtitle="We auto-detected the method used in your region. Review the times below and change if needed."
        footer={
          <OnboardingActions
            primaryLabel="Use this method"
            onPrimaryPress={() => onConfirm(selectedMethod)}
            secondaryLabel="Change method..."
            onSecondaryPress={() => setShowMethodPicker(true)}
          />
        }
      >
        {/* Method Card */}
        <View style={styles.methodCard}>
          <Text style={styles.methodCardLabel}>AUTO-DETECTED METHOD</Text>
          <Text style={styles.methodCardName}>{methodLabel}</Text>
          <Text style={styles.methodCardDesc}>{getMethodDescription(selectedMethod)}</Text>
          {locationData?.country ? (
            <Text style={styles.methodCardCountry}>
              Based on: {locationData.country}
            </Text>
          ) : null}
        </View>

        {/* Asr note */}
        <View style={styles.asrNote}>
          <Text style={styles.asrNoteText}>
            Asr timing: <Text style={styles.asrNoteValue}>{asrJuristic}</Text>
            {asrJuristic === 'Hanafi' ? ' (later Asr)' : ' (Shafi\'i / most global timetables)'}
          </Text>
        </View>

        {/* Live preview */}
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>TODAY'S TIMES</Text>

          {isLoadingPreview ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" />
              <Text style={styles.loadingText}>Calculating...</Text>
            </View>
          ) : !locationData ? (
            <Text style={styles.noLocationText}>
              Set your location to see a preview.
            </Text>
          ) : (previewTimes && previewTimes.length > 0) ? (
            <View style={styles.previewGrid}>
              {FARD_NAMES.map(name => {
                const prayer = previewTimes.find(p => p.name === name);
                return (
                  <View key={name} style={styles.previewRow}>
                    <Text style={styles.previewPrayerName}>{name}</Text>
                    <Text style={styles.previewPrayerTime}>
                      {prayer ? format(prayer.time, 'h:mm a') : '—'}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.noLocationText}>
              Connect to Wi-Fi to see a live preview.
            </Text>
          )}
        </View>

        {/* Change button inline */}
        <TouchableOpacity
          style={styles.changeInline}
          onPress={() => setShowMethodPicker(true)}
          accessibilityRole="button"
          accessibilityLabel="Change calculation method"
        >
          <Text style={styles.changeInlineText}>
            Not right for your region? Change method
          </Text>
        </TouchableOpacity>
      </OnboardingScaffold>

      {/* Reuse the existing CalculationMethodModal */}
      <CalculationMethodModal
        visible={showMethodPicker}
        onClose={() => { setShowMethodPicker(false); setPreviewPrayerTimes(null); }}
        calculationMethods={CALCULATION_METHODS}
        selectedMethod={selectedMethod}
        onMethodSelect={handleMethodSelect}
        previewPrayerTimes={previewPrayerTimes}
        onPreviewMethod={handlePreviewMethod}
        isUpdatingMethod={isPreviewingMethod}
      />
    </>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    methodCard: {
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      backgroundColor: theme.colors.onboarding.optionBg,
      borderWidth: 1,
      borderColor: theme.colors.primary.DEFAULT,
      gap: theme.spacing.xs,
    },
    methodCardLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.onboarding.textHint,
      letterSpacing: 1.2,
    },
    methodCardName: {
      fontSize: theme.typography.fontSize.xl,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
    },
    methodCardDesc: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.onboarding.textMuted,
      lineHeight: 18,
    },
    methodCardCountry: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.primary.DEFAULT,
      marginTop: theme.spacing.xs,
    },
    asrNote: {
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.onboarding.optionBg,
      borderWidth: 1,
      borderColor: theme.colors.onboarding.optionBorder,
    },
    asrNoteText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.onboarding.textMuted,
    },
    asrNoteValue: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
    },
    previewCard: {
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      backgroundColor: theme.colors.onboarding.optionBg,
      borderWidth: 1,
      borderColor: theme.colors.onboarding.optionBorder,
      gap: theme.spacing.md,
    },
    previewLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.onboarding.textHint,
      letterSpacing: 1.2,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
    loadingText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.onboarding.textMuted,
    },
    noLocationText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.onboarding.textMuted,
      fontStyle: 'italic',
    },
    previewGrid: {
      gap: theme.spacing.sm,
    },
    previewRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    previewPrayerName: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.text.secondary,
    },
    previewPrayerTime: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
    },
    changeInline: {
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
    },
    changeInlineText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.primary.DEFAULT,
    },
  });
