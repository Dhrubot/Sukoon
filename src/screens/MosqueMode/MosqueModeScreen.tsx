// src/screens/MosqueMode/MosqueModeScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { MosqueModeToggle } from '../../components/mosque/MosqueModeToggle';
import { MosqueModeStatus } from '../../components/mosque/MosqueModeStatus';
import { IqamahTimeConfig } from '../../components/mosque/IqamahTimeConfig';
import { MosqueModeOptions } from '../../components/mosque/MosqueModeOptions';
import JummahMosqueConfig from '../../components/mosque/JummahMosqueConfig';
import { OEMBatteryGuidanceCard } from '../../components/mosque/OEMBatteryGuidanceCard';
import { useMosqueMode } from '../../hooks/useMosqueMode';
import { mosqueModePlatformUi } from '../../utils/mosqueModePlatform';

const MosqueModeScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { isEnabled } = useMosqueMode();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[theme.colors.ambient.top, theme.colors.ambient.bottom]}
        style={styles.gradient}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Mosque Mode</Text>
            <Text style={styles.headerSubtitle}>
              {mosqueModePlatformUi.headerSubtitle}
            </Text>
          </View>

          {!isEnabled && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>JOURNEY</Text>
              <View style={styles.journeyCard}>
                <Text style={styles.journeyTitle}>Built for the Masjid</Text>
                <Text style={styles.journeyText}>
                  Use Mosque Mode when you are heading out, settling before iqamah, and staying present through salah.
                </Text>
                <View style={styles.journeySteps}>
                  <Text style={styles.journeyStep}>1. Set your mosque's iqamah times once.</Text>
                  <Text style={styles.journeyStep}>2. Let Sukoon guard the quiet before prayer begins.</Text>
                  <Text style={styles.journeyStep}>3. Leave Jumu'ah on a longer silence time.</Text>
                </View>
              </View>
            </View>
          )}

          <MosqueModeStatus />

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>MOSQUE MODE</Text>
            <MosqueModeToggle />
          </View>

          {isEnabled && (
            <>
              <OEMBatteryGuidanceCard />

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>IQAMAH TIMES</Text>
                <IqamahTimeConfig />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>{"JUMU'AH SETTINGS"}</Text>
                <Text style={styles.sectionHelper}>
                  Seperate settings for silence during khutbah and salah
                </Text>
                <JummahMosqueConfig />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>{mosqueModePlatformUi.optionsSectionLabel}</Text>
                <MosqueModeOptions />
              </View>
            </>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {mosqueModePlatformUi.footerText}
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: theme.spacing['4xl'],
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing['2xl'],
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: theme.typography.fontSize.xs - 1,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.mosqueMode.sectionLabel,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
  },
  section: {
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl,
  },
  sectionHelper: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.muted,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  journeyCard: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.mosqueMode.card.bg,
    borderWidth: 1,
    borderColor: theme.colors.mosqueMode.card.border,
    gap: theme.spacing.md,
  },
  journeyTitle: {
    fontSize: 17,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.text.primary,
  },
  journeyText: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  journeySteps: {
    gap: theme.spacing.sm,
  },
  journeyStep: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.text.primary,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing['2xl'],
    paddingBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.mosqueMode.footer,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
  },
});

export default MosqueModeScreen;
