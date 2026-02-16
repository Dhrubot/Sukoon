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
import { MosqueModeToggle } from '../../components/mosque/MosqueModeToggle';
import { MosqueModeStatus } from '../../components/mosque/MosqueModeStatus';
import { IqamahTimeConfig } from '../../components/mosque/IqamahTimeConfig';
import { MosqueModeOptions } from '../../components/mosque/MosqueModeOptions';
import { useMosqueMode } from '../../hooks/useMosqueMode';

const MosqueModeScreen: React.FC = () => {
  const { theme } = useTheme();
  const { isEnabled } = useMosqueMode();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background.primary }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          Mosque Mode
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.text.secondary }]}>
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
        </>
      )}

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.colors.text.muted }]}>
          Your phone will go silent at iqamah time and restore automatically after the prayer ends.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    marginTop: 12,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
});

export default MosqueModeScreen;
