// src/components/monetization/PremiumGate.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';

interface PremiumGateProps {
  children: React.ReactNode;
  isUnlocked: boolean;
  featureName: string;
  onUpgrade: () => void;
}

const PremiumGate: React.FC<PremiumGateProps> = ({
  children,
  isUnlocked,
  featureName,
  onUpgrade,
}) => {
  const styles = useThemedStyles(createStyles);

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.overlay}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.title}>Premium Feature</Text>
        <Text style={styles.description}>
          {featureName} is available with Sukoon Premium
        </Text>
        <TouchableOpacity style={styles.upgradeButton} onPress={onUpgrade}>
          <Text style={styles.upgradeText}>Upgrade</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginHorizontal: 20,
    marginVertical: 8,
  },
  overlay: {
    backgroundColor: theme.colors.card.background,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    borderRadius: theme.borderRadius.md,
    padding: 24,
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  description: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  upgradeButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.sm,
  },
  upgradeText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: '600',
    color: theme.colors.primary.contrast,
  },
});

export default React.memo(PremiumGate);
