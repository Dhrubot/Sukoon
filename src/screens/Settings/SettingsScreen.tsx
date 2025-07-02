import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Hooks
import { useSettingsManager } from './hooks';

// Section Components
import {
  PrayerSettingsSection,
  NotificationSection,
  LocationSection,
  AppDataSection,
  AboutSection,
} from './components';

// Modal Components
import {
  CalculationMethodModal,
  NotificationModal,
} from './modals';

const SettingsScreen = ({ navigation }: any) => {
  const {
    // State
    userSettings,
    showCalculationPicker,
    showNotificationModal,
    isUpdatingLocation,
    calculationMethods,

    // Setters
    setUserSettings,
    setShowCalculationPicker,
    setShowNotificationModal,

    // Actions
    handleCalculationMethodChange,
    updateLocation,
    handleResetApp,
    handleExportData,
    handlePrivacyPolicy,
  } = useSettingsManager();

  if (!userSettings) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading settings...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        <PrayerSettingsSection
          userSettings={userSettings}
          setUserSettings={setUserSettings}
          onCalculationMethodPress={() => setShowCalculationPicker(true)}
          calculationMethods={calculationMethods}
        />

        <NotificationSection
          userSettings={userSettings}
          onNotificationPress={() => setShowNotificationModal(true)}
        />

        <LocationSection
          userSettings={userSettings}
          isUpdatingLocation={isUpdatingLocation}
          onUpdateLocation={updateLocation}
        />

        <AppDataSection
          onExportData={handleExportData}
          onResetApp={handleResetApp}
        />

        <AboutSection
          onPrivacyPolicyPress={handlePrivacyPolicy}
        />
      </ScrollView>

      {/* Modals */}
      <CalculationMethodModal
        visible={showCalculationPicker}
        onClose={() => setShowCalculationPicker(false)}
        calculationMethods={calculationMethods}
        selectedMethod={userSettings.calculationMethod}
        onMethodSelect={handleCalculationMethodChange}
      />

      <NotificationModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  loadingText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginTop: 50,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#212121',
  },
});

export default SettingsScreen;