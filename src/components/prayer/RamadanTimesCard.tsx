// src/components/prayer/RamadanTimesCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';

interface RamadanTimesCardProps {
  fajrTime: Date;
  maghribTime: Date;
}

const fmt = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const RamadanTimesCard: React.FC<RamadanTimesCardProps> = ({ fajrTime, maghribTime }) => {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.ramadanCard}>
      <Text style={styles.ramadanTitle}>🌙 Ramadan Times</Text>
      <View style={styles.ramadanRow}>
        <View style={styles.ramadanItem}>
          <Text style={styles.ramadanLabel}>Suhoor ends</Text>
          <Text style={styles.ramadanTime}>{fmt(fajrTime)}</Text>
        </View>
        <View style={styles.ramadanDivider} />
        <View style={styles.ramadanItem}>
          <Text style={styles.ramadanLabel}>Iftar</Text>
          <Text style={styles.ramadanTime}>{fmt(maghribTime)}</Text>
        </View>
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  ramadanCard: {
    marginHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.card.background,
    borderRadius: 16,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  ramadanTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
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
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  ramadanTime: {
    fontSize: 22,
    fontWeight: '600',
    color: theme.colors.primary.DEFAULT,
  },
  ramadanDivider: {
    width: 1,
    height: 36,
    backgroundColor: theme.colors.border.primary,
  },
});

export default React.memo(RamadanTimesCard);
