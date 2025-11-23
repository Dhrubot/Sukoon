// src/screens/Settings/SettingsScreen.tsx (ENHANCED)
import React from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LocationModal } from '../../components/LocationModal';

// Hooks
import { useSettingsManager } from './hooks';

// Section Components
import {
  NotificationSection,
  LocationSection,
  AppDataSection,
  AboutSection,
} from './components';

// Enhanced Components
import { PrayerSettingsSection } from './components/PrayerSettingsSection';

// Modal Components
import { CalculationMethodModal, NotificationModal } from './modals';

const SettingsScreen = ({ navigation }: any) => {
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

        <TouchableOpacity onPress={() => navigation.navigate('NotificationDebug')}>
          <Text>🔧 Notification Debugger</Text>
        </TouchableOpacity>

        {/* About */}
        <AboutSection
          onPrivacyPolicy={handlePrivacyPolicy}
          onShowDebugInfo={showDebugInfo}
        />

        {/* 🎯 NEW: Connection status indicator */}
        <View style={styles.statusSection}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1B5E3F',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6C757D',
  },

  // 🎯 NEW: Status section styles
  statusSection: {
    margin: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#6C757D',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  statusConnected: {
    color: '#28A745',
  },
  statusDisconnected: {
    color: '#DC3545',
  },
});

export default SettingsScreen;