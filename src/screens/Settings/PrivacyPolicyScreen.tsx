import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';

const PrivacyPolicyScreen = () => {
  const styles = useThemedStyles(createStyles);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.lastUpdated}>Last Updated: March 2026</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>A Privacy-First Approach</Text>
          <Text style={styles.paragraph}>
            Sukoon is designed so your worship data stays primarily on your device and under your control.
            We do not require an account to use the app.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Stored on Your Device</Text>
          <Text style={styles.paragraph}>
            Sukoon stores app data locally using on-device MMKV storage. Some data is stored in encrypted
            storage and some non-sensitive operational data is stored in unencrypted local storage.
          </Text>
          <Text style={styles.bulletPoint}>• Prayer records and reminder state</Text>
          <Text style={styles.bulletPoint}>• Mindfulness sessions, reflections, and Tuba Tree entries</Text>
          <Text style={styles.bulletPoint}>• Settings and notification preferences</Text>
          <Text style={styles.bulletPoint}>• Saved location details used for prayer times</Text>
          <Text style={styles.paragraph}>
            Sukoon does not send your prayer history, reflections, streaks, or Tuba Tree content to Firebase
            services. If you choose to export data, that export happens only when you explicitly trigger it.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>No Account Required</Text>
          <Text style={styles.paragraph}>
            Sukoon does not require you to create an account, provide an email address, or sign in.
            You can use the app completely anonymously.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location and Prayer Times</Text>
          <Text style={styles.paragraph}>
            Location is used to calculate prayer times and support location-based features such as Mosque Mode
            and Qibla finding.
          </Text>
          <Text style={styles.bulletPoint}>• You can allow GPS access or choose a city manually</Text>
          <Text style={styles.bulletPoint}>• Coordinates and selected calculation method may be sent to prayer-time providers when prayer times are fetched</Text>
          <Text style={styles.bulletPoint}>• Coordinates may be sent to geocoding providers or platform geocoding services to resolve place names</Text>
          <Text style={styles.bulletPoint}>• City, country, coordinates, and timezone are then stored locally for app use</Text>
          <Text style={styles.paragraph}>
            Mosque Mode may also use your location on-device to support mosque-related reminders and timing.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <Text style={styles.paragraph}>
            Prayer reminders and related notification schedules are created locally on your device using iOS
            and Android notification APIs. Sukoon does not rely on a remote push-notification backend for
            routine prayer reminders.
          </Text>
          <Text style={styles.paragraph}>
            If you enable Mosque Mode, Sukoon may also use system-level notification and sound settings where
            the platform supports them.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Firebase Services</Text>
          <Text style={styles.paragraph}>
            Sukoon includes Firebase services for product quality and improvement:
          </Text>
          <Text style={styles.bulletPoint}>
            • <Text style={styles.bold}>Firebase Analytics:</Text> Used for anonymous interaction events such as screen
            opens and feature taps
          </Text>
          <Text style={styles.bulletPoint}>
            • <Text style={styles.bold}>Firebase Crashlytics:</Text> Used to collect crash reports, device details, and stack traces
          </Text>
          <Text style={styles.bulletPoint}>
            • <Text style={styles.bold}>Firebase Performance Monitoring:</Text> Used for app startup and performance metrics
          </Text>
          <Text style={styles.paragraph}>
            These services help us improve stability and performance. They are not used to send your prayer
            history, reflections, or Tuba Tree content.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>
          <Text style={styles.paragraph}>
            Sukoon may request the following permissions depending on the features you use:
          </Text>
          <Text style={styles.bulletPoint}>• Location, for prayer times, Qibla, and mosque-related features</Text>
          <Text style={styles.bulletPoint}>• Notifications, for prayer reminders and related alerts</Text>
          <Text style={styles.bulletPoint}>• Sensor access, where supported, for Qibla/compass functionality</Text>
          <Text style={styles.paragraph}>
            You can decline optional permissions, although some features will be limited.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Controls</Text>
          <Text style={styles.paragraph}>
            You can adjust reminder behavior, calculation method, Hijri date adjustment, and location choices
            from within the app.
          </Text>
          <Text style={styles.bulletPoint}>• You can change or remove location access in your device settings</Text>
          <Text style={styles.bulletPoint}>• You can export data if that option is available in your build</Text>
          <Text style={styles.bulletPoint}>• Uninstalling the app removes its locally stored data from your device subject to platform behavior</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Changes to This Policy</Text>
          <Text style={styles.paragraph}>
            We may update this policy as the app changes. When we do, we will update the date at the top of
            this screen.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <Text style={styles.paragraph}>
            If you have privacy questions about Sukoon, contact us through the project’s support or repository
            channels.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Built with care for privacy, worship, and clarity
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing['4xl'],
  },
  header: {
    marginBottom: theme.spacing['2xl'],
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.secondary,
  },
  title: {
    fontSize: 22,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  lastUpdated: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: theme.spacing['2xl'],
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  paragraph: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.body,
    lineHeight: 20,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
  },
  bold: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
  },
  bulletPoint: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.body,
    lineHeight: 20,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  footer: {
    marginTop: theme.spacing['3xl'],
    paddingTop: theme.spacing['2xl'],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.secondary,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
});

export default PrivacyPolicyScreen;
