// src/screens/Settings/SettingsScreen.tsx (ENHANCED)
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { LocationModal } from '../../components/LocationModal';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { useTheme } from '../../providers/ThemeProvider';

// Hooks
import { useSettingsManager } from './hooks';

// Section Components
import {
  NotificationSection,
  LocationSection,
  AppDataSection,
  AboutSection,
} from './components';
import { SettingSection } from '../../components/settings/SettingSection';
import { SettingRow } from '../../components/settings/SettingRow';

// Enhanced Components
import { PrayerSettingsSection } from './components/PrayerSettingsSection';

// Mosque Mode now has its own dedicated screen via MenuStack

// Modal Components
import { CalculationMethodModal, NotificationModal, HijriAdjustmentModal, ExportDataConfirmModal } from './modals';

// Services
import NotificationService from '../../services/NotificationService';
import JummahNotificationService from '../../services/JummahNotificationService';
import { getCachedHijriDate } from '../../utils/ramadan';
import { NotificationDebugScreen } from '../Debug/NotificationDebugScreen';
import { resolveCalculationMethodForCountry } from '../../utils/calculationMethodByRegion';

type SettingsModalKey = 'calculation' | 'hijri' | 'notification' | 'location' | null;
// Manual JSON export/import is the v1 backup story (no cloud sync).
// NOTE: the JSON currently includes unredacted location coordinates + display name —
// blocker #8 (export-data redaction) must ship before users export in volume.
const SHOW_APP_DATA_SECTION = true;
const SHOW_SUPPORT_SUKOON = false;

interface SettingsScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const ambientColors = [theme.colors.ambient.top, theme.colors.ambient.bottom] as const;
  const [showHijriModal, setShowHijriModal] = useState(false);
  const [activeModal, setActiveModal] = useState<SettingsModalKey>(null);

  const {
    // Existing state
    userSettings,
    showCalculationPicker,
    showNotificationModal,
    isUpdatingLocation,
    calculationMethods,
    showManualLocationModal,

    // 🎯 NEW: Enhanced state
    isUpdatingMethod,
    previewPrayerTimes,
    prayerTimesLoading,
    hasValidLocation,
    todayPrayerTimes,
    nextPrayer,

    // Existing setters
    setUserSettings,
    setShowCalculationPicker,
    setShowNotificationModal,
    setShowManualLocationModal,

    // Enhanced actions
    handleCalculationMethodChange,
    updateLocation,
    handleResetApp,
    handleExportData,
    handleExportDataWithOptions,
    handleImportData,
    handlePrivacyPolicy,

    // Export consent modal state
    showExportConfirmModal,
    setShowExportConfirmModal,

    // 🎯 NEW: Enhanced actions
    previewCalculationMethod,
    handleAutomaticCalculationMethod,
    testPrayerCalculations,
    showDebugInfo,
    refreshPrayerTimes,
  } = useSettingsManager();

  const regionalMethod = useMemo(
    () => resolveCalculationMethodForCountry(
      userSettings?.location?.country,
      userSettings?.location?.countryCode,
    ),
    [userSettings?.location?.country, userSettings?.location?.countryCode]
  );
  const regionalMethodLabel = useMemo(
    () => calculationMethods.find((method) => method.value === regionalMethod)?.label || regionalMethod,
    [calculationMethods, regionalMethod]
  );

  if (!userSettings) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={ambientColors} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading settings...</Text>
            <Text style={styles.loadingSubtext}>Please wait while we prepare your settings</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const closeAllModals = () => {
    setActiveModal(null);
    setShowCalculationPicker(false);
    setShowHijriModal(false);
    setShowNotificationModal(false);
    setShowManualLocationModal(false);
  };

  const openCalculationModal = () => {
    closeAllModals();
    setActiveModal('calculation');
    setShowCalculationPicker(true);
  };

  const openHijriModal = () => {
    closeAllModals();
    setActiveModal('hijri');
    setShowHijriModal(true);
  };

  const openNotificationModal = () => {
    closeAllModals();
    setActiveModal('notification');
    setShowNotificationModal(true);
  };

  const openLocationModal = () => {
    closeAllModals();
    setActiveModal('location');
    setShowManualLocationModal(true);
  };

  // Tahajjud toggle handler
  const handleToggleTahajjud = async () => {
    const isEnabled = userSettings.tahajjudReminders?.enabled ?? false;
    const updated = {
      ...userSettings,
      tahajjudReminders: {
        enabled: !isEnabled,
        frequency: userSettings.tahajjudReminders?.frequency || 'twice_weekly' as const,
      },
    };
    setUserSettings(updated);
    if (!isEnabled) {
      await NotificationService.scheduleTahajjudEncouragement();
    } else {
      await NotificationService.cancelTahajjudNotifications();
    }
  };

  // Jumu'ah toggle handler
  const handleToggleJummah = async () => {
    const isEnabled = userSettings.jummahReminders?.enabled !== false;
    const updated = {
      ...userSettings,
      jummahReminders: { enabled: !isEnabled },
    };
    setUserSettings(updated);

    if (isEnabled) {
      await JummahNotificationService.cancelExisting();
    } else {
      await JummahNotificationService.scheduleJummahNotifications(todayPrayerTimes);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={ambientColors} style={styles.gradient}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Settings</Text>
            {/* <Text style={styles.title}>Prayer Preferences</Text> */}
            <Text style={styles.subtitle}>Reminders, calculations, location, and quiet adjustments</Text>
          </View>

        {/* 1. Prayer Settings — Hero Card + Calculation */}
        <PrayerSettingsSection
          userSettings={userSettings}
          setUserSettings={setUserSettings}
          onCalculationMethodPress={openCalculationModal}
          calculationMethods={calculationMethods}
          isUpdatingMethod={isUpdatingMethod}
          todayPrayerTimes={todayPrayerTimes}
          nextPrayer={nextPrayer}
          prayerTimesLoading={prayerTimesLoading}
          hasValidLocation={hasValidLocation}
          onTestCalculations={testPrayerCalculations}
          onPreviewMethod={previewCalculationMethod}
          onRefreshPrayerTimes={refreshPrayerTimes}
        />

        {/* 2. Notifications — consolidated with Tahajjud & Jumu'ah */}
        <NotificationSection
          userSettings={userSettings}
          onNotificationPress={openNotificationModal}
          onToggleTahajjud={handleToggleTahajjud}
          onToggleJummah={handleToggleJummah}
        />

        {/* 3. Hijri Calendar */}
        <SettingSection title="Hijri Calendar">
          <SettingRow
            label="Hijri Date Adjustment"
            subtitle={(() => {
              const hijri = getCachedHijriDate();
              return hijri
                ? `Current: ${hijri.day} ${hijri.monthNameEn} ${hijri.year} AH`
                : 'Adjust if your local date differs';
            })()}
            value={(() => {
              const adj = userSettings.hijriAdjustment ?? 0;
              return adj === 0 ? 'Default' : adj === -1 ? '−1 Day' : '+1 Day';
            })()}
            onPress={openHijriModal}
          />
        </SettingSection>

        {/* 4. Location */}
        <LocationSection
          userSettings={userSettings}
          isUpdatingLocation={isUpdatingLocation}
          onUpdateLocation={updateLocation}
          onSelectManually={openLocationModal}
          hasValidLocation={hasValidLocation}
        />

        <LocationModal
          visible={showManualLocationModal && activeModal === 'location'}
          onClose={closeAllModals}
        />

        {SHOW_APP_DATA_SECTION && (
          <AppDataSection
            onExportData={handleExportData}
            onImportData={handleImportData}
            onResetApp={handleResetApp}
          />
        )}

        {/* 7. About */}
        <AboutSection
          onPrivacyPolicy={() => handlePrivacyPolicy(navigation)}
          onShowDebugInfo={__DEV__ ? showDebugInfo : undefined}
          showSupport={SHOW_SUPPORT_SUKOON}
        />

          {/* Dev only debugger screen */}
          {__DEV__ && (
            <NotificationDebugScreen />
          )}

          {/* Dev-only: Connection status */}
          {__DEV__ && (
            <View style={styles.statusSection}>
              <Text style={styles.statusTitle}>Connection Status</Text>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Prayer Times:</Text>
                <Text style={[
                  styles.statusValue,
                  hasValidLocation ? styles.statusConnected : styles.statusDisconnected
                ]}>
                  {hasValidLocation ? 'Connected' : 'No Location'}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Today's Prayers:</Text>
                <Text style={styles.statusValue}>
                  {prayerTimesLoading ? 'Loading...' : `${todayPrayerTimes.length} loaded`}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Next Prayer:</Text>
                <Text style={styles.statusValue}>
                  {nextPrayer ? `${nextPrayer.name}` : 'None'}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </LinearGradient>

      {/* 🎯 ENHANCED: Calculation Method Modal with previews */}
      <CalculationMethodModal
        visible={showCalculationPicker && activeModal === 'calculation'}
        onClose={closeAllModals}
        calculationMethods={calculationMethods}
        selectedMethod={userSettings.calculationMethod}
        onMethodSelect={handleCalculationMethodChange}
        regionalMethod={regionalMethod}
        regionalMethodLabel={regionalMethodLabel}
        regionalCountry={userSettings.location?.country}
        isAutomaticSelected={!userSettings.calculationMethodManuallySelected}
        onAutomaticSelect={handleAutomaticCalculationMethod}

        // Enhanced props
        previewPrayerTimes={previewPrayerTimes}
        onPreviewMethod={previewCalculationMethod}
        isUpdatingMethod={isUpdatingMethod}
      />

      {/* Hijri Adjustment Modal */}
      <HijriAdjustmentModal
        visible={showHijriModal && activeModal === 'hijri'}
        onClose={closeAllModals}
        currentAdjustment={(userSettings.hijriAdjustment ?? 0) as -1 | 0 | 1}
        onAdjustmentChange={(val) => {
          setUserSettings({ ...userSettings, hijriAdjustment: val });
        }}
      />

      {/* Notification Modal */}
      <NotificationModal
        visible={showNotificationModal && activeModal === 'notification'}
        onClose={closeAllModals}
        userSettings={userSettings}
        onUpdateSettings={setUserSettings}
      />

      {/* Export data consent sheet */}
      <ExportDataConfirmModal
        visible={showExportConfirmModal}
        onClose={() => setShowExportConfirmModal(false)}
        onConfirm={handleExportDataWithOptions}
      />
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.lg,
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
  },
  loadingSubtext: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.muted,
    textAlign: 'center',
  },
  header: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
  },
  eyebrow: {
    fontSize: theme.typography.fontSize.xs - 1,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.text.muted,
    letterSpacing: 1.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
    lineHeight: 20,
  },

  // 🎯 NEW: Status section styles
  statusSection: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.card.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border.secondary,
  },
  statusTitle: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  statusLabel: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
  },
  statusValue: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
  },
  statusValueGood: {
    color: theme.colors.primary.DEFAULT,
  },
  statusConnected: {
    color: theme.colors.status.success,
  },
  statusDisconnected: {
    color: theme.colors.status.error,
  },
  debugButton: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.card.hover,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  debugButtonText: {
    color: theme.colors.primary.DEFAULT,
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodySemibold,
  },
});

export default SettingsScreen;
