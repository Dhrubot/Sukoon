// src/components/mosque/MosqueModePrompt.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { format } from 'date-fns';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { useMosqueMode } from '../../hooks/useMosqueMode';
import { PrayerTime } from '../../types';

interface MosqueModePromptProps {
  visible: boolean;
  prayer: PrayerTime;
  onConfirm: () => void;
  onCancel: () => void;
}

export const MosqueModePrompt: React.FC<MosqueModePromptProps> = ({
  visible,
  prayer,
  onConfirm,
  onCancel,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { getIqamahTime, settings } = useMosqueMode();

  const iqamahTime = getIqamahTime(prayer);

  if (!iqamahTime) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.colors.card.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emoji}>🕌</Text>
            <Text style={[styles.title, { color: theme.colors.text.primary }]}>
              Heading to the mosque?
            </Text>
          </View>

          {/* Prayer Info */}
          <View style={[styles.infoBox, { backgroundColor: theme.colors.card.hover }]}>
            <Text style={[styles.prayerName, { color: theme.colors.primary.DEFAULT }]}>
              {prayer.name} Prayer
            </Text>
            <Text style={[styles.iqamahText, { color: theme.colors.text.secondary }]}>
              Iqamah at {format(iqamahTime, 'h:mm a')}
            </Text>
          </View>

          {/* Description */}
          <Text style={[styles.description, { color: theme.colors.text.secondary }]}>
            {Platform.OS === 'android'
              ? `Your phone will automatically go silent at iqamah time and restore after ${settings?.silentDuration ?? 10} minutes.`
              : 'You will receive a reminder to enable Do Not Disturb at iqamah time.'}
          </Text>

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: theme.colors.border.primary }]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, styles.cancelText, { color: theme.colors.text.secondary }]}>
                Not Today
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton, { backgroundColor: theme.colors.primary.DEFAULT }]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, styles.confirmText]}>
                Yes, Enable
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer tip */}
          <Text style={[styles.footerText, { color: theme.colors.text.muted }]}>
            You can disable this prompt in Settings
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing['2xl'],
    shadowColor: theme.colors.achievement.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  emoji: {
    fontSize: theme.typography.fontSize['5xl'] + 16,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.fontSize['3xl'] - 2,
    fontWeight: theme.typography.fontWeight.bold,
    fontFamily: theme.typography.fontFamily.headingRegular,
    textAlign: 'center',
  },
  infoBox: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  prayerName: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.xs,
  },
  iqamahText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
  },
  description: {
    fontSize: theme.typography.fontSize.md,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: theme.spacing['2xl'],
  },
  buttons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: theme.spacing.md + 2,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 2,
  },
  confirmButton: {
    shadowColor: theme.colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  cancelText: {
    // Color comes from inline style
  },
  confirmText: {
    color: theme.colors.primary.contrast,
  },
  footerText: {
    fontSize: theme.typography.fontSize.xs,
    textAlign: 'center',
  },
});
