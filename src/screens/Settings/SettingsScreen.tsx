// src/screens/Settings/SettingsScreen.tsx (ENHANCED)
import React from 'react';
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
import { CalculationMethodModal, NotificationModal } from './modals';

// Services
import NotificationService from '../../services/NotificationService';
import { getCachedHijriDate, getRawCachedHijriDate } from '../../utils/ramadan';

const SettingsScreen = ({ navigation }: any) => {
  const styles = useThemedStyles(createStyles);
  const { theme, themeMode, toggleTheme } = useTheme();
  
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
          <View style={styles.hijriAdjustRow}>
            <View style={styles.hijriAdjustLabel}>
              <Text style={[styles.hijriAdjustTitle, { color: theme.colors.text.primary }]}>
                Hijri Date Adjustment
              </Text>
              <Text style={[styles.hijriAdjustSubtitle, { color: theme.colors.text.muted }]}>
                Adjust if your local moon sighting differs from the calculated date
              </Text>
            </View>
            <View style={[styles.segmentedControl, { borderColor: theme.colors.border.primary }]}>
              {([-1, 0, 1] as const).map((val) => {
                const isActive = (userSettings.hijriAdjustment ?? 0) === val;
                const label = val === -1 ? '−1' : val === 0 ? '0' : '+1';
                return (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.segmentButton,
                      isActive && { backgroundColor: theme.colors.primary.DEFAULT },
                    ]}
                    onPress={() => {
                      setUserSettings({ ...userSettings, hijriAdjustment: val });
                    }}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { color: isActive ? theme.colors.primary.contrast : theme.colors.text.secondary },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          {(() => {
            const hijri = getCachedHijriDate();
            if (!hijri) return null;
            return (
              <Text style={[styles.hijriPreview, { color: theme.colors.text.secondary }]}>
                Current: {hijri.day} {hijri.monthNameEn} {hijri.year} AH
              </Text>
            );
          })()}
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
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,  // lg
    color: theme.colors.text.secondary,
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,  // md
    color: theme.colors.text.muted,
    textAlign: 'center',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.secondary,
  },
  title: {
    fontSize: 32,  // 5xl
    fontWeight: '700',  // bold
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,  // lg
    color: theme.colors.text.secondary,
  },

  // 🎯 NEW: Status section styles
  statusSection: {
    margin: 20,
    padding: 16,
    backgroundColor: theme.colors.card.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  statusTitle: {
    fontSize: 14,  // md
    fontWeight: '600',  // semibold
    color: theme.colors.text.secondary,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,  // md
    color: theme.colors.text.secondary,
  },
  statusValue: {
    fontSize: 14,  // md
    fontWeight: '600',  // semibold
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
    marginTop: 12,
    backgroundColor: theme.colors.card.hover,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  debugButtonText: {
    color: theme.colors.primary.DEFAULT,
    fontSize: 14,  // md
    fontWeight: '600',  // semibold
  },
  hijriAdjustRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  hijriAdjustLabel: {
    flex: 1,
    marginRight: 12,
  },
  hijriAdjustTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  hijriAdjustSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  segmentButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  hijriPreview: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingBottom: 8,
  },
});

export default SettingsScreen;