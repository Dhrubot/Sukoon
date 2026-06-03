// src/components/mosque/OEMBatteryGuidanceCard.tsx
//
// Mosque Mode Phase 5 — shown on aggressive-OEM Android devices to help users
// add Sukoon to the "Don't optimize" battery allowlist. Without this, the
// Mosque Mode foreground service can be killed mid-window on Samsung, Xiaomi,
// Oppo, Vivo, Huawei, etc.
//
// Renders nothing on iOS or on stock-Android OEMs (Pixel, Motorola, Nokia,
// Sony) where the system Doze allowlist is already enough. The card can be
// dismissed; the dismissal is per-install (StorageService key).

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import OEMOptimizationService from '../../services/OEMOptimizationService';
import StorageService from '../../services/StorageService';

const DISMISS_KEY = 'oem_battery_guidance_dismissed_v1';

export const OEMBatteryGuidanceCard: React.FC = () => {
  const styles = useThemedStyles(createStyles);

  const initiallyDismissed = useCallback(() => {
    try {
      return StorageService.getValue(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  }, []);

  const [dismissed, setDismissed] = useState<boolean>(() => initiallyDismissed());

  if (Platform.OS !== 'android') return null;
  if (!OEMOptimizationService.isAggressiveOEM()) return null;
  if (dismissed) return null;

  const manufacturer = OEMOptimizationService.manufacturerLabel() || 'your device';

  const handleOpenSettings = async () => {
    await OEMOptimizationService.openBatteryOptimizationSettings();
  };

  const handleDismiss = () => {
    try {
      StorageService.setValue(DISMISS_KEY, '1');
    } catch {
      // Best-effort dismiss; if storage fails we just hide for this session.
    }
    setDismissed(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Improve reliability on {manufacturer}</Text>
      <Text style={styles.body}>
        Many {manufacturer} phones close background apps to save battery. Add Sukoon to your
        battery allowlist so Mosque Mode and prayer notifications run on time.
      </Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleOpenSettings}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open battery optimization settings"
        >
          <Text style={styles.primaryButtonText}>Open Battery Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleDismiss}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Dismiss this guidance"
        >
          <Text style={styles.secondaryButtonText}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.xl,
    marginVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.mosqueMode.banner.bg,
    borderWidth: 1,
    borderColor: theme.colors.mosqueMode.banner.dot,
    gap: theme.spacing.sm,
  },
  heading: {
    fontSize: 15,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.mosqueMode.banner.text,
  },
  body: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.mosqueMode.banner.textMuted,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  primaryButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.mosqueMode.banner.button,
  },
  primaryButtonText: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.mosqueMode.banner.button,
  },
  secondaryButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.mosqueMode.banner.textMuted,
  },
});
