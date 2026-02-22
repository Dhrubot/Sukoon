// src/screens/Settings/SettingsScreen.tsx (ENHANCED)
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LocationModal } from '../../components/LocationModal';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import { AppTheme } from '../../theme';

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
import { CalculationMethodModal, NotificationModal, HijriAdjustmentModal } from './modals';

// Services
import NotificationService from '../../services/NotificationService';
import { getCachedHijriDate, getRawCachedHijriDate } from '../../utils/ramadan';

const SettingsScreen = ({ navigation }: any) => {
  const styles = useThemedStyles(createStyles);
  const { theme, themeMode, toggleTheme } = useTheme();
  const [showHijriModal, setShowHijriModal] = useState(false);

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
    handlePrivacyPolicy,

    // 🎯 NEW: Enhanced actions
    previewCalculationMethod,
    selectLocationManually,
    testPrayerCalculations,
    showDebugInfo,
    refreshPrayerTimes,
  } = useSettingsManager();

  if (!userSettings) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading settings...</Text>
          <Text style={styles.loadingSubtext}>Please wait while we prepare your settings</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Customize your prayer experience</Text>
        </View>

        {/* 🎯 ENHANCED: Prayer Settings with real-time previews */}
        <PrayerSettingsSection
          userSettings={userSettings}
          setUserSettings={setUserSettings}
          onCalculationMethodPress={() => setShowCalculationPicker(true)}
          calculationMethods={calculationMethods}

          // Enhanced props
          isUpdatingMethod={isUpdatingMethod}
          todayPrayerTimes={todayPrayerTimes}
          nextPrayer={nextPrayer}
          prayerTimesLoading={prayerTimesLoading}
          hasValidLocation={hasValidLocation}
          onTestCalculations={testPrayerCalculations}
          onPreviewMethod={previewCalculationMethod}
          onRefreshPrayerTimes={refreshPrayerTimes}
        />

        {/* Notification Settings */}
        <NotificationSection
          userSettings={userSettings}
          onNotificationPress={() => setShowNotificationModal(true)}
        />

        {/* 🌌 Optional Prayer Settings */}
        <SettingSection title="">
          <SettingRow
            label="Tahajjud Reminders"
            subtitle="Gentle encouragement to pray the night prayer"
            value={userSettings.tahajjudReminders?.enabled ? 'On' : 'Off'}
            onPress={async () => {
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
            }}
          />
          <SettingRow
            label="Jumu'ah Reminders"
            subtitle="Friday Sunnah reminders: Surah Al-Kahf, ghusl, dua hour"
            value={userSettings.jummahReminders?.enabled !== false ? 'On' : 'Off'}
            onPress={() => {
              const isEnabled = userSettings.jummahReminders?.enabled !== false;
              const updated = {
                ...userSettings,
                jummahReminders: {
                  enabled: !isEnabled,
                },
              };
              setUserSettings(updated);
            }}
          />
        </SettingSection>

        {/* 🌙 Hijri Date Adjustment (Moon Sighting) */}
        <SettingSection title="HIJRI CALENDAR">
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
            onPress={() => setShowHijriModal(true)}
          />
        </SettingSection>

        {/* Mosque Mode moved to dedicated screen via Menu > Mosque Mode */}

        {/* 🎯 ENHANCED: Location Section with manual selection */}
        <LocationSection
          userSettings={userSettings}
          isUpdatingLocation={isUpdatingLocation}
          onUpdateLocation={updateLocation}
          onSelectManually={selectLocationManually}
          hasValidLocation={hasValidLocation}
        />

        {/* Location modal for manual update */}
        <LocationModal
          visible={showManualLocationModal}
          onClose={() => setShowManualLocationModal(false)}
        />

        {/* App Data */}
        <AppDataSection
          onExportData={handleExportData}
          onResetApp={handleResetApp}
        />

        {__DEV__ && <TouchableOpacity onPress={() => navigation.navigate('NotificationDebug')}>
          <Text>🔧 Notification Debugger</Text>
        </TouchableOpacity>}

        {/* Appearance Settings */}
        <SettingSection title="APPEARANCE">
          <SettingRow
            label="App Theme"
            subtitle="Switch between dark and light mode"
            value={themeMode === 'dark' ? '🌙 Dark' : '☀️ Light'}
            onPress={toggleTheme}
          />
        </SettingSection>

        {/* About */}
        <AboutSection
          onPrivacyPolicy={() => handlePrivacyPolicy(navigation)}
          onShowDebugInfo={__DEV__ ? showDebugInfo : undefined}
        />

        {/* 🎯 NEW: Connection status indicator */}
       { __DEV__ && <View style={styles.statusSection}>
          <Text style={styles.statusTitle}>🔗 Connection Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Prayer Times:</Text>
            <Text style={[
              styles.statusValue,
              hasValidLocation ? styles.statusConnected : styles.statusDisconnected
            ]}>
              {hasValidLocation ? '✅ Connected' : '❌ No Location'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Today's Prayers:</Text>
            <Text style={styles.statusValue}>
              {prayerTimesLoading ? '⏳ Loading...' : `${todayPrayerTimes.length} loaded`}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Next Prayer:</Text>
            <Text style={styles.statusValue}>
              {nextPrayer ? `${nextPrayer.name}` : 'None'}
            </Text>
          </View>
        </View>
        }
      </ScrollView>

      {/* 🎯 ENHANCED: Calculation Method Modal with previews */}
      <CalculationMethodModal
        visible={showCalculationPicker}
        onClose={() => setShowCalculationPicker(false)}
        calculationMethods={calculationMethods}
        selectedMethod={userSettings.calculationMethod}
        onMethodSelect={handleCalculationMethodChange}

        // Enhanced props
        previewPrayerTimes={previewPrayerTimes}
        onPreviewMethod={previewCalculationMethod}
        isUpdatingMethod={isUpdatingMethod}
      />

      {/* Hijri Adjustment Modal */}
      <HijriAdjustmentModal
        visible={showHijriModal}
        onClose={() => setShowHijriModal(false)}
        currentAdjustment={(userSettings.hijriAdjustment ?? 0) as -1 | 0 | 1}
        onAdjustmentChange={(val) => {
          setUserSettings({ ...userSettings, hijriAdjustment: val });
        }}
      />

      {/* Notification Modal */}
      <NotificationModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        userSettings={userSettings}
        onUpdateSettings={setUserSettings}
      />
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
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
    color: theme.colors.text.secondary,
  },
  loadingSubtext: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.muted,
    textAlign: 'center',
  },
  header: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.secondary,
  },
  title: {
    fontSize: 32,  // 5xl
    fontWeight: '700',  // bold
    fontFamily: theme.typography.fontFamily.heading,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.text.secondary,
  },

  // 🎯 NEW: Status section styles
  statusSection: {
    margin: theme.spacing.xl,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.card.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  statusTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: '600',
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
    color: theme.colors.text.secondary,
  },
  statusValue: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: '600',
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
    fontWeight: '600',
  },
});

export default SettingsScreen;