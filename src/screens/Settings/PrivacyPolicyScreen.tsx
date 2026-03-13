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
          <Text style={styles.lastUpdated}>Last Updated: February 2026</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Commitment to Your Privacy</Text>
          <Text style={styles.paragraph}>
            Sukoon is built with privacy as a core principle. Your spiritual journey is deeply personal, 
            and we believe your data should remain private and under your control.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Storage</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>100% Local Storage:</Text> All your data is stored locally on your device 
            using encrypted storage (MMKV). This includes:
          </Text>
          <Text style={styles.bulletPoint}>• Prayer times and records</Text>
          <Text style={styles.bulletPoint}>• Mindfulness sessions and reflections</Text>
          <Text style={styles.bulletPoint}>• Tuba Tree entries</Text>
          <Text style={styles.bulletPoint}>• Achievement progress</Text>
          <Text style={styles.bulletPoint}>• App settings and preferences</Text>
          <Text style={styles.bulletPoint}>• Location data (city, country, coordinates)</Text>
          <Text style={styles.paragraph}>
            Your prayer data, reflections, and spiritual practice data never leave your device 
            unless you explicitly choose to export it.
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
          <Text style={styles.sectionTitle}>Location Data</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Why we need it:</Text> Location data is used solely to calculate 
            accurate prayer times for your area.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>How we use it:</Text>
          </Text>
          <Text style={styles.bulletPoint}>• GPS coordinates are used to determine your timezone and calculate prayer times</Text>
          <Text style={styles.bulletPoint}>• City and country names are stored locally for display purposes</Text>
          <Text style={styles.bulletPoint}>• Location data is never transmitted to our servers</Text>
          <Text style={styles.bulletPoint}>• You can manually enter your location instead of using GPS</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Mosque Mode:</Text> If you enable Mosque Mode, your location may be 
            checked periodically to determine if you're near a saved mosque location. This happens entirely 
            on your device.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <Text style={styles.paragraph}>
            Prayer time notifications are scheduled locally on your device. We do not send push notifications 
            from external servers. All notification scheduling happens on your device using iOS/Android 
            notification APIs.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Third-Party Services</Text>
          <Text style={styles.paragraph}>
            Sukoon uses the following third-party services:
          </Text>
          <Text style={styles.bulletPoint}>
            • <Text style={styles.bold}>Aladhan API:</Text> Used to calculate prayer times. Only your 
            coordinates and selected calculation method are sent. No personal information is transmitted.
          </Text>
          <Text style={styles.bulletPoint}>
            • <Text style={styles.bold}>Geocoding Services:</Text> When you use GPS location, we may use 
            platform geocoding services (Apple/Google) to convert coordinates to city names. This is handled 
            by your device's operating system.
          </Text>
          <Text style={styles.bulletPoint}>
            • <Text style={styles.bold}>Firebase Analytics:</Text> We collect anonymous, non-religious 
            interaction events (e.g., app opened, feature tapped) to improve the experience. No prayer 
            times, streaks, reflections, or spiritual practice data are ever transmitted.
          </Text>
          <Text style={styles.bulletPoint}>
            • <Text style={styles.bold}>Firebase Crashlytics:</Text> Automatic crash reports are sent to 
            help us fix bugs. These contain device model, OS version, and stack traces — never your 
            personal or spiritual data.
          </Text>
          <Text style={styles.bulletPoint}>
            • <Text style={styles.bold}>Firebase Performance:</Text> Anonymous app performance metrics 
            (startup time, network latency) help us keep Sukoon fast and responsive.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Analytics & Tracking</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>We do not track your worship.</Text> Sukoon never sends your prayer 
            history, reflections, streaks, or spiritual practice data to any server. Your worship 
            patterns remain completely private on your device.
          </Text>
          <Text style={styles.paragraph}>
            Sukoon uses Firebase Analytics, Crashlytics, and Performance Monitoring to collect anonymous, 
            non-religious interaction events (e.g., app opened, feature tapped), crash reports, and 
            performance metrics. These services never receive your prayer data or personal information.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>
          <Text style={styles.paragraph}>
            Sukoon requests the following permissions:
          </Text>
          <Text style={styles.bulletPoint}>
            • <Text style={styles.bold}>Location (Optional):</Text> To calculate prayer times for your area
          </Text>
          <Text style={styles.bulletPoint}>
            • <Text style={styles.bold}>Notifications:</Text> To remind you of prayer times
          </Text>
          <Text style={styles.bulletPoint}>
            • <Text style={styles.bold}>Compass/Sensors (Optional):</Text> For Qibla direction finder
          </Text>
          <Text style={styles.paragraph}>
            All permissions are optional. You can use the app with manual location entry if you prefer 
            not to grant location access.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Export & Deletion</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Your data, your control:</Text>
          </Text>
          <Text style={styles.bulletPoint}>
            • <Text style={styles.bold}>Export:</Text> You can export your prayer history and reflections 
            at any time from Settings
          </Text>
          <Text style={styles.bulletPoint}>
            • <Text style={styles.bold}>Delete:</Text> You can reset the app and delete all data from 
            Settings → App Data → Reset App
          </Text>
          <Text style={styles.bulletPoint}>
            • <Text style={styles.bold}>Uninstall:</Text> Uninstalling the app removes all data from your device
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Children's Privacy</Text>
          <Text style={styles.paragraph}>
            Sukoon is designed for Muslims of all ages. Since we don't collect any personal information 
            or require accounts, the app is safe for children to use under parental guidance.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Changes to This Policy</Text>
          <Text style={styles.paragraph}>
            If we make changes to this privacy policy, we will update the "Last Updated" date at the top 
            of this page. Significant changes will be announced in the app. Continued use of the app after 
            changes constitutes acceptance of the updated policy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Open Source</Text>
          <Text style={styles.paragraph}>
            Sukoon is open source. You can review our code to verify our privacy practices at any time. 
            We believe in transparency and welcome community audits of our privacy implementation.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <Text style={styles.paragraph}>
            If you have questions about this privacy policy or how your data is handled, please contact us 
            through our GitHub repository or support channels.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Built with privacy and respect for the Muslim community
          </Text>
          <Text style={styles.footerEmoji}>🔒 🕌</Text>
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
    fontSize: theme.typography.fontSize['5xl'],
    fontWeight: theme.typography.fontWeight.bold,
    fontFamily: theme.typography.fontFamily.heading,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  lastUpdated: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: theme.spacing['2xl'],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  paragraph: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.body,
    lineHeight: 24,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
  },
  bold: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
  },
  bulletPoint: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.body,
    lineHeight: 24,
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
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  footerEmoji: {
    fontSize: theme.typography.fontSize['3xl'],
  },
});

export default PrivacyPolicyScreen;
