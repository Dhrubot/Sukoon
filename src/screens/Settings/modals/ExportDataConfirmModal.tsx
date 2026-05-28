// src/screens/Settings/modals/ExportDataConfirmModal.tsx
//
// Consent-based export confirmation sheet. Before producing the JSON backup,
// this modal lists exactly what is included and what is redacted by default,
// and offers an opt-in checkbox to include precise location + display name.

import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useThemedStyles } from '../../../hooks/useThemedStyles';
import { AppTheme } from '../../../theme';

export interface ExportOptions {
  /** When true, lat/lng, city, and display name are included verbatim.
   *  When false (default), those fields are redacted and a marker is embedded
   *  so import knows to keep the device's current values. */
  includeLocation: boolean;
}

interface ExportDataConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called with the user's chosen options when they tap "Export". */
  onConfirm: (options: ExportOptions) => void;
}

const BulletRow: React.FC<{ label: string; detail?: string; redacted?: boolean }> = ({
  label,
  detail,
  redacted,
}) => {
  const styles = useThemedStyles(rowStyles);
  return (
    <View style={styles.row}>
      <Text style={[styles.bullet, redacted && styles.bulletMuted]}>{redacted ? '◎' : '●'}</Text>
      <View style={styles.rowContent}>
        <Text style={[styles.label, redacted && styles.labelMuted]}>{label}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        {redacted ? <Text style={styles.redactedBadge}>redacted by default</Text> : null}
      </View>
    </View>
  );
};

const rowStyles = (theme: AppTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    bullet: {
      fontSize: 10,
      lineHeight: 20,
      color: theme.colors.primary.DEFAULT,
    },
    bulletMuted: {
      color: theme.colors.settings.labelMuted,
    },
    rowContent: {
      flex: 1,
    },
    label: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.settings.labelPrimary,
    },
    labelMuted: {
      color: theme.colors.settings.labelMuted,
    },
    detail: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.settings.labelMuted,
      lineHeight: 18,
      marginTop: 2,
    },
    redactedBadge: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.settings.labelMuted,
      backgroundColor: theme.colors.settings.previewBg,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      alignSelf: 'flex-start',
      marginTop: 4,
      overflow: 'hidden',
    },
  });

export const ExportDataConfirmModal: React.FC<ExportDataConfirmModalProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  const styles = useThemedStyles(createStyles);
  const [includeLocation, setIncludeLocation] = useState(false);

  const handleExport = () => {
    onConfirm({ includeLocation });
    // Reset for next open
    setIncludeLocation(false);
    onClose();
  };

  const handleClose = () => {
    setIncludeLocation(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Export Prayer Data</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* What's included */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What's included</Text>
              <BulletRow
                label="Prayer records"
                detail="Last 90 days of pray/miss/delay status"
              />
              <BulletRow
                label="Daily stats"
                detail="Completion counts and focus scores"
              />
              <BulletRow
                label="Dawam streak"
                detail="Current and longest streak counters"
              />
              <BulletRow
                label="Calculation method"
                detail="E.g. MWL, ISNA — your current setting"
              />
              <BulletRow
                label="Country"
                detail="Used for regional method auto-selection"
              />
            </View>

            {/* What's redacted by default */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Redacted by default</Text>
              <BulletRow
                label="Precise location (lat / lng)"
                detail="Replaced with a placeholder in the export"
                redacted
              />
              <BulletRow
                label="City name"
                detail="Replaced with a placeholder in the export"
                redacted
              />
              <BulletRow
                label="Display name"
                detail="Your personal name, if you set one"
                redacted
              />
              <Text style={styles.redactNote}>
                When you import this backup, the app will keep your device's current location
                and name instead of overwriting them with empty values.
              </Text>
            </View>

            {/* Opt-in checkbox */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setIncludeLocation(v => !v)}
              activeOpacity={0.75}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: includeLocation }}
              accessibilityLabel="Include precise location and display name"
            >
              <View style={[styles.checkbox, includeLocation && styles.checkboxChecked]}>
                {includeLocation ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <View style={styles.checkboxLabel}>
                <Text style={styles.checkboxTitle}>
                  Include precise location and display name
                </Text>
                <Text style={styles.checkboxSubtitle}>
                  Only use for personal backups on devices you trust.
                </Text>
              </View>
            </TouchableOpacity>
          </ScrollView>

          {/* Action buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={handleExport}
              activeOpacity={0.85}
            >
              <Text style={styles.exportButtonText}>Export</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              activeOpacity={0.75}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.settings.modalOverlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.colors.settings.modalBg,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      maxHeight: '90%',
      paddingBottom: theme.spacing['3xl'],
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.settings.modalBorder,
    },
    title: {
      fontSize: 22,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.settings.modalTitle,
    },
    cancelText: {
      fontSize: 14,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.settings.modalClose,
    },
    scroll: {
      paddingHorizontal: theme.spacing.xl,
    },
    scrollContent: {
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
      gap: theme.spacing.lg,
    },
    section: {
      marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
      fontSize: 17,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.settings.labelPrimary,
      marginBottom: theme.spacing.md,
    },
    redactNote: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.settings.labelMuted,
      lineHeight: 18,
      fontStyle: 'italic',
      marginTop: theme.spacing.xs,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
      backgroundColor: theme.colors.settings.previewBg,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.settings.optionBorder,
      marginBottom: theme.spacing.md,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 5,
      borderWidth: 2,
      borderColor: theme.colors.settings.labelMuted,
      backgroundColor: theme.colors.settings.modalBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    checkboxChecked: {
      borderColor: theme.colors.primary.DEFAULT,
      backgroundColor: theme.colors.primary.DEFAULT,
    },
    checkmark: {
      fontSize: 13,
      color: '#fff',
      fontFamily: theme.typography.fontFamily.bodyBold,
    },
    checkboxLabel: {
      flex: 1,
    },
    checkboxTitle: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.settings.labelPrimary,
      lineHeight: 20,
    },
    checkboxSubtitle: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.settings.labelMuted,
      lineHeight: 18,
      marginTop: 2,
    },
    footer: {
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    exportButton: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.lg,
      backgroundColor: theme.colors.primary.DEFAULT,
    },
    exportButtonText: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: '#fff',
    },
    cancelButton: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.settings.optionBorder,
      backgroundColor: theme.colors.settings.optionBg,
    },
    cancelButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.settings.labelPrimary,
    },
  });
