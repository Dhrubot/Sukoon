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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        {/* <Text style={styles.headerTitle}>
          Mosque Mode
        </Text> */}
        <Text style={styles.headerSubtitle}>
          Automatically silence your phone when iqamah starts so you can focus entirely on your prayer.
        </Text>
      </View>

      <MosqueModeStatus />

      <View style={styles.section}>
        <MosqueModeToggle />
      </View>

      {isEnabled && (
        <>
          <View style={styles.section}>
            <IqamahTimeConfig />
          </View>

          <View style={styles.section}>
            <MosqueModeOptions />
          </View>

          <View style={styles.section}>
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
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  content: {
    paddingBottom: theme.spacing['4xl'],
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.heading,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  section: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
  },
  footer: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing['2xl'],
    alignItems: 'center',
  },
  footerText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.muted,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
});

export default MosqueModeScreen;
