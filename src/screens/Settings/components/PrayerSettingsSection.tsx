import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { format } from 'date-fns';
import { SettingSection } from '../../../components/settings/SettingSection';
import { SettingRow } from '../../../components/settings/SettingRow';
import NotificationService from '../../../services/NotificationService';
import { useStore } from '../../../store/useStore';
import logger from '../../../utils/logger';
import { UserSettings, CalculationMethodType, PrayerTime, PrayerName } from '../../../types';
import { isFriday } from '../../../utils/ramadan';
import { useTheme } from '../../../providers/ThemeProvider';
import { useThemedStyles } from '../../../hooks/useThemedStyles';
import { AppTheme } from '../../../theme';
import { NotificationToggleButton } from '../../../components/common/NotificationToggleButton';
import { SegmentedControl } from '../../../components/settings/SegmentedControl';

interface PrayerSettingsSectionProps {
  userSettings: UserSettings;
  setUserSettings: (settings: UserSettings) => void;
  onCalculationMethodPress: () => void;
  calculationMethods: CalculationMethodType[];
  
  // Enhanced props
  isUpdatingMethod?: boolean;
  todayPrayerTimes?: PrayerTime[];
  nextPrayer?: PrayerTime | null;
  prayerTimesLoading?: boolean;
  hasValidLocation?: boolean;
  onTestCalculations?: () => void;
  onPreviewMethod?: (method: CalculationMethodType) => void;
  onRefreshPrayerTimes?: () => Promise<void>; // 🆕 NEW: For immediate refresh
}

export const PrayerSettingsSection: React.FC<PrayerSettingsSectionProps> = ({
  userSettings,
  setUserSettings,
  onCalculationMethodPress,
  calculationMethods,
  
  // Enhanced props
  isUpdatingMethod = false,
  todayPrayerTimes = [],
  nextPrayer = null,
  prayerTimesLoading = false,
  hasValidLocation = false,
  onTestCalculations,
  onPreviewMethod,
  onRefreshPrayerTimes, // 🆕 NEW
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const juristicOptions = [
    {
      value: 'Standard',
      label: 'Standard',
      description: 'Shafi, Maliki, Hanbali',
    },
    {
      value: 'Hanafi',
      label: 'Hanafi',
      description: 'Later Asr time',
    },
  ];

  // 🔧 FIXED: Immediate refresh when Asr method changes
  // Handle notification toggle for individual prayers
  const updateUserSettings = useStore((s) => s.updateUserSettings);

  const handleNotificationToggle = async (prayerName: PrayerName, newState: boolean) => {
    updateUserSettings({ prayerNotifications: { [prayerName]: newState } as UserSettings['prayerNotifications'] });

    if (!userSettings.notifications.enabled) {
      logger.log(`${prayerName} notifications ${newState ? 'enabled' : 'disabled'}`);
      return;
    }

    if (newState) {
      await NotificationService.reconcileScheduling('settings_change');
    } else {
      await NotificationService.cancelPrayerNotifications(prayerName);
    }

    logger.log(`${prayerName} notifications ${newState ? 'enabled' : 'disabled'}`);
  };

  const handleJuristicChange = async (value: string) => {
    updateUserSettings({ asrJuristic: value as 'Standard' | 'Hanafi' });
    
    // 🔧 FIX: Immediately refresh prayer times
    if (onRefreshPrayerTimes && hasValidLocation) {
      setIsRefreshing(true);
      try {
        await onRefreshPrayerTimes();
        
        // Read fresh Asr time from store (props are stale in this closure)
        const freshTimes = useStore.getState().todayPrayerTimes;
        const asrPrayer = freshTimes.find(p => p.name === 'Asr');
        const timeStr = asrPrayer ? format(asrPrayer.time, 'h:mm a') : '';
        
        Alert.alert(
          'Asr Method Updated ✅',
          `Prayer times updated using ${value} juristic method.\n\n` +
          (timeStr ? `New Asr time: ${timeStr}` : 'Prayer times have been recalculated.'),
          [{ text: 'OK' }]
        );
      } catch (error) {
        logger.error('Failed to refresh prayer times:', error);
        Alert.alert(
          'Update Complete',
          'Asr method changed. Prayer times will update on next refresh.',
          [{ text: 'OK' }]
        );
      } finally {
        setIsRefreshing(false);
      }
    } else if (!hasValidLocation) {
      Alert.alert(
        'Location Required',
        'Please set your location to see updated prayer times.',
        [{ text: 'OK' }]
      );
    }
  };

  const getCurrentMethodLabel = () => {
    const method = calculationMethods.find(m => m.value === userSettings.calculationMethod);
    return method?.label || 'Unknown';
  };

  const friday = isFriday();

  // Render prayer times hero list — always shows all 5 prayers
  const renderPrayerHero = () => {
    if (!hasValidLocation) {
      return (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>Location required to show prayer times</Text>
        </View>
      );
    }

    if (prayerTimesLoading) {
      return (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>Loading prayer times...</Text>
        </View>
      );
    }

    if (todayPrayerTimes.length === 0) {
      return (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>No prayer times available</Text>
        </View>
      );
    }

    return (
      <View style={styles.prayerList}>
        {todayPrayerTimes.map((prayer) => {
          const isNext = prayer.name === nextPrayer?.name;
          const displayName = prayer.name === 'Dhuhr' && friday
            ? 'Jumu\'ah'
            : prayer.name;
          return (
            <View
              key={prayer.name}
              style={[
                styles.prayerItem,
                isNext && styles.prayerItemActive,
              ]}
            >
              <View style={styles.prayerNameRow}>
                <View style={[
                  styles.prayerDot,
                  isNext && styles.prayerDotActive,
                ]} />
                <Text style={[
                  styles.prayerName,
                  isNext && styles.prayerNameActive,
                ]}>
                  {displayName}
                </Text>
              </View>
              <View style={styles.prayerRight}>
                {isNext && (
                  <View style={styles.nextBadge}>
                    <Text style={styles.nextBadgeText}>Next</Text>
                  </View>
                )}
                <Text style={[
                  styles.prayerTime,
                  isNext && styles.prayerTimeActive,
                ]}>
                  {format(prayer.time, 'h:mm a')}
                </Text>
                <NotificationToggleButton
                  prayerName={prayer.name}
                  enabled={userSettings.prayerNotifications?.[prayer.name] ?? true}
                  onToggle={handleNotificationToggle}
                  disabled={!userSettings.notifications?.enabled}
                  size={18}
                />
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <>
      {/* Hero Card — prayer times at a glance */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Prayer Settings</Text>
        <TouchableOpacity onPress={onCalculationMethodPress} disabled={isUpdatingMethod}>
          <Text style={styles.heroMethod}>
            {isUpdatingMethod ? 'Updating...' : getCurrentMethodLabel()}
          </Text>
        </TouchableOpacity>

        {renderPrayerHero()}
      </View>

      {/* Calculation & Juristic — separate card */}
      <SettingSection title="Calculation">
        <SettingRow
          label="Calculation Method"
          subtitle="Affects Fajr & Isha angles"
          value={isUpdatingMethod ? 'Updating...' : getCurrentMethodLabel()}
          onPress={onCalculationMethodPress}
          disabled={isUpdatingMethod}
        />

        {/* Juristic Method inline */}
        <View style={styles.juristicMethodWrapper}>
          <Text style={styles.juristicLabel}>
            Juristic Method <Text style={styles.juristicLabelSub}>· Asr timing</Text>
          </Text>
          
          <View style={{ position: 'relative' }}>
            <SegmentedControl
              options={juristicOptions}
              selectedValue={userSettings.asrJuristic === 'Hanafi' ? 'Hanafi' : 'Standard'}
              onValueChange={handleJuristicChange}
              style={styles.juristicControl}
            />
            {isRefreshing && (
              <View style={styles.refreshingOverlay}>
                <ActivityIndicator size="small" color={theme.colors.primary.DEFAULT} />
                <Text style={styles.refreshingText}>Updating times...</Text>
              </View>
            )}
          </View>
          
          <View style={styles.juristicExplanation}>
            <Text style={styles.explanationText}>
              {userSettings.asrJuristic === 'Hanafi' 
                ? 'Shadow equals 2× object length — Asr begins later under Hanafi method'
                : 'Shadow equals 1× object length — Asr begins earlier under Standard method'
              }
            </Text>
          </View>
        </View>

        {/* Test calculations button */}
        {onTestCalculations && hasValidLocation && (
          <TouchableOpacity 
            style={styles.testButton} 
            onPress={onTestCalculations}
            disabled={prayerTimesLoading}
          >
            <Text style={styles.testButtonText}>
              {prayerTimesLoading ? 'Loading...' : 'Test Prayer Calculations'}
            </Text>
          </TouchableOpacity>
        )}
      </SettingSection>
    </>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  // ─── Hero Card ─────────────────────────────────────
  heroCard: {
    backgroundColor: theme.colors.card.background,
    borderWidth: 1,
    borderColor: theme.colors.border.secondary,
    borderRadius: 14,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  heroLabel: {
    fontSize: theme.typography.fontSize.xs,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: theme.colors.primary.DEFAULT,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    marginBottom: theme.spacing.sm,
  },
  heroMethod: {
    fontSize: theme.typography.fontSize['2xl'],
    fontFamily: theme.typography.fontFamily.headingRegular,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },

  // ─── Prayer List ───────────────────────────────────
  prayerList: {
    gap: 2,
  },
  prayerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
  },
  prayerItemActive: {
    backgroundColor: theme.colors.primary.DEFAULT + '14',
    borderWidth: 1,
    borderColor: theme.colors.primary.DEFAULT + '26',
  },
  prayerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  prayerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.text.muted,
  },
  prayerDotActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  prayerName: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
  },
  prayerNameActive: {
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.bodyMedium,
  },
  prayerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  nextBadge: {
    backgroundColor: theme.colors.primary.DEFAULT + '26',
    borderWidth: 1,
    borderColor: theme.colors.primary.DEFAULT + '4D',
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  nextBadgeText: {
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: theme.colors.primary.DEFAULT,
    fontFamily: theme.typography.fontFamily.bodySemibold,
  },
  prayerTime: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.secondary,
  },
  prayerTimeActive: {
    color: theme.colors.primary.light,
  },

  // ─── Status ────────────────────────────────────────
  statusContainer: {
    backgroundColor: theme.colors.settings.previewBg,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  statusText: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.settings.labelMuted,
    textAlign: 'center',
  },

  // ─── Juristic ──────────────────────────────────────
  juristicMethodWrapper: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.primary,
  },
  juristicLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  juristicLabelSub: {
    color: theme.colors.text.muted,
    fontSize: theme.typography.fontSize.xs,
  },
  juristicControl: {
    marginTop: theme.spacing.xxs,
  },
  juristicExplanation: {
    backgroundColor: theme.colors.primary.DEFAULT + '0D',
    borderWidth: 1,
    borderColor: theme.colors.primary.DEFAULT + '1A',
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  explanationText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    lineHeight: 18,
  },

  // ─── Test Button ───────────────────────────────────
  testButton: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.primary.DEFAULT + '4D',
    alignItems: 'center',
  },
  testButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary.DEFAULT,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    letterSpacing: 0.2,
  },
  refreshingOverlay: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingTop: 10,
  },
  refreshingText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.body,
  },
});
