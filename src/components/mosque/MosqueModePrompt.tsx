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
  const { getIqamahTime } = useMosqueMode();

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
              ? 'Your phone will automatically go silent at iqamah time and restore after 10 minutes.'
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  infoBox: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  prayerName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  iqamahText: {
    fontSize: 15,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 2,
  },
  confirmButton: {
    shadowColor: '#00C9A7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelText: {
    // Color comes from inline style
  },
  confirmText: {
    color: '#FFFFFF',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
