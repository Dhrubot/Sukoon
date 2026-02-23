// src/components/prayer/RamadanTimesCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';

interface RamadanTimesCardProps {
  fajrTime: Date;
  maghribTime: Date;
}

const fmt = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const RamadanTimesCard: React.FC<RamadanTimesCardProps> = ({ fajrTime, maghribTime }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <LinearGradient
      colors={['#0f1c2e', '#0a1820'] as const}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.ramadanCard}
    >
      <Text style={styles.ramadanTitle}>Ramadan Times</Text>
      <View style={styles.ramadanRow}>
        <View style={styles.ramadanItem}>
          <Text style={styles.ramadanLabel}>Suhoor ends</Text>
          <Text style={[styles.ramadanTime, { color: theme.colors.interactive.active }]}>{fmt(fajrTime)}</Text>
        </View>
        <View style={styles.ramadanDivider} />
        <View style={styles.ramadanItem}>
          <Text style={styles.ramadanLabel}>Iftar</Text>
          <Text style={[styles.ramadanTime, { color: theme.colors.goldLight }]}>{fmt(maghribTime)}</Text>
        </View>
      </View>
    </LinearGradient>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  ramadanCard: {
    marginHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.card.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  ramadanTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontFamily: theme.typography.fontFamily.headingRegular,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  ramadanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  ramadanItem: {
    alignItems: 'center',
    flex: 1,
  },
  ramadanLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  ramadanTime: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary
  },
  ramadanDivider: {
    width: 1,
    height: 36,
    backgroundColor: theme.colors.border.primary,
  },
});

export default React.memo(RamadanTimesCard);
