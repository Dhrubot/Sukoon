// src/screens/Settings/modals/HijriAdjustmentModal.tsx
// Modal for adjusting hijri date offset with before/after preview.

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../../providers/ThemeProvider';
import { useThemedStyles } from '../../../hooks/useThemedStyles';
import { AppTheme } from '../../../theme';
import { getCachedHijriDate, getRawCachedHijriDate } from '../../../utils/ramadan';

interface HijriAdjustmentModalProps {
  visible: boolean;
  onClose: () => void;
  currentAdjustment: -1 | 0 | 1;
  onAdjustmentChange: (value: -1 | 0 | 1) => void;
}

export const HijriAdjustmentModal: React.FC<HijriAdjustmentModalProps> = ({
  visible,
  onClose,
  currentAdjustment,
  onAdjustmentChange,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const rawHijri = getRawCachedHijriDate();
  const adjustedHijri = getCachedHijriDate();

  const rawDateStr = rawHijri
    ? `${rawHijri.day} ${rawHijri.monthNameEn} ${rawHijri.year} AH`
    : 'Loading...';

  const adjustedDateStr = adjustedHijri
    ? `${adjustedHijri.day} ${adjustedHijri.monthNameEn} ${adjustedHijri.year} AH`
    : rawDateStr;

  const handleSelect = (val: -1 | 0 | 1) => {
    onAdjustmentChange(val);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Hijri Date Adjustment</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Raw calculation info */}
          <View style={styles.body}>
            <Text style={styles.label}>Our calculation shows:</Text>
            <Text style={styles.dateDisplay}>{rawDateStr}</Text>

            <Text style={styles.adjustLabel}>Adjust to match your local date:</Text>

            {/* Segmented buttons */}
            <View style={styles.segmentRow}>
              {([-1, 0, 1] as const).map((val) => {
                const isActive = currentAdjustment === val;
                const label = val === -1 ? '−1 Day' : val === 0 ? 'No Change' : '+1 Day';
                return (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.segmentButton,
                      isActive && styles.segmentButtonActive,
                    ]}
                    onPress={() => handleSelect(val)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        isActive && styles.segmentTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Result preview */}
            <Text style={styles.resultLabel}>Result:</Text>
            <Text style={styles.resultDate}>{adjustedDateStr}</Text>

            {/* Footer hint */}
            <Text style={styles.footer}>
              Moon sighting may differ by region. Adjust if your local date differs from the calculation.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.settings.modalOverlay,
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.settings.modalBg,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      paddingBottom: theme.spacing['3xl'],
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.settings.modalBorder,
    },
    modalTitle: {
      fontSize: theme.typography.fontSize.xl,
      fontFamily: theme.typography.fontFamily.bodyBold,
      color: theme.colors.settings.modalTitle,
    },
    modalClose: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.primary.DEFAULT,
    },
    body: {
      paddingHorizontal: theme.spacing['2xl'],
      paddingTop: theme.spacing['2xl'],
      alignItems: 'center',
    },
    label: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.muted,
      marginBottom: theme.spacing.xs + 2,
    },
    dateDisplay: {
      fontSize: theme.typography.fontSize['2xl'],
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing['2xl'],
    },
    adjustLabel: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.lg,
    },
    segmentRow: {
      flexDirection: 'row',
      gap: theme.spacing.md - 2,
      marginBottom: theme.spacing['2xl'],
    },
    segmentButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1.5,
      borderColor: theme.colors.border.primary,
      alignItems: 'center',
    },
    segmentButtonActive: {
      backgroundColor: theme.colors.primary.DEFAULT,
      borderColor: theme.colors.primary.DEFAULT,
    },
    segmentText: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.secondary,
    },
    segmentTextActive: {
      color: theme.colors.primary.contrast,
    },
    resultLabel: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.muted,
      marginBottom: theme.spacing.xs + 2,
    },
    resultDate: {
      fontSize: theme.typography.fontSize['2xl'] + 2,
      fontFamily: theme.typography.fontFamily.bodyBold,
      color: theme.colors.primary.DEFAULT,
      marginBottom: theme.spacing.xl,
    },
    footer: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.muted,
      textAlign: 'center',
      lineHeight: 18,
      paddingHorizontal: theme.spacing.sm,
    },
  });
