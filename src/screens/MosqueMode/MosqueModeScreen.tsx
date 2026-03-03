// src/screens/MosqueMode/MosqueModeScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { MosqueModeToggle } from '../../components/mosque/MosqueModeToggle';
import { MosqueModeStatus } from '../../components/mosque/MosqueModeStatus';
import { IqamahTimeConfig } from '../../components/mosque/IqamahTimeConfig';
import { MosqueModeOptions } from '../../components/mosque/MosqueModeOptions';
import JummahMosqueConfig from '../../components/mosque/JummahMosqueConfig';
import { useMosqueMode } from '../../hooks/useMosqueMode';

const MosqueModeScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { isEnabled } = useMosqueMode();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mosque Mode</Text>
        <Text style={styles.headerSubtitle}>
          Automatically silence your phone when iqamah starts so you can focus entirely on your prayer.
        </Text>
      </View>

      <MosqueModeStatus />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>MODE</Text>
        <MosqueModeToggle />
      </View>

      {isEnabled && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>IQAMAH TIMES</Text>
            <IqamahTimeConfig />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SILENT MODE OPTIONS</Text>
            <MosqueModeOptions />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>JUMU'AH SETTINGS</Text>
            <JummahMosqueConfig />
          </View>
        </>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Your phone will go silent at iqamah time and restore automatically after the prayer ends.
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
  content: {
    paddingBottom: theme.spacing['4xl'],
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: theme.typography.fontFamily.headingRegular,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.mosqueMode.sectionLabel,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
  },
  section: {
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl,
  },
  footer: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing['2xl'],
    paddingBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.mosqueMode.footer,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
});

export default MosqueModeScreen;
