// src/components/mosque/MosqueModeToggle.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';
import { useMosqueMode } from '../../hooks/useMosqueMode';
import IOSRingerControlService from '../../services/RingerControlService.ios';
import RingerControlService from '../../services/RingerControlService';
import MosqueModeService from '../../services/MosqueModeService';

export const MosqueModeToggle: React.FC = () => {
  const { theme } = useTheme();
  const { isEnabled, enableMosqueMode } = useMosqueMode();
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (value: boolean) => {
    if (isLoading) return;

    if (value) {
      // Enabling mosque mode
      if (Platform.OS === 'ios') {
        // Check if iOS setup is complete
        const hasSetup = IOSRingerControlService.hasCompletedSetup();
        if (!hasSetup) {
          // Guide user through setup
          Alert.alert(
            '🕌 Setup Required',
            'Mosque Mode on iPhone requires a one-time setup using the Shortcuts app.\n\nWould you like to set it up now?',
            [
              {
                text: 'Not Now',
                style: 'cancel',
              },
              {
                text: 'Setup Now',
                onPress: async () => {
                  setIsLoading(true);
                  const success = await IOSRingerControlService.guideShortcutSetup();
                  setIsLoading(false);
                  
                  if (success) {
                    await enableMosqueMode(true);
                  }
                },
              },
            ]
          );
          return;
        }
      }

      if (Platform.OS === 'android') {
        const canModify = await RingerControlService.canModify();
        if (!canModify) {
          Alert.alert(
            '🛑 Permission Required',
            'To auto-silence your phone at iqamah time, Sukoon needs Do Not Disturb access.\n\nGrant access and then enable Mosque Mode again.',
            [
              { text: 'Not Now', style: 'cancel' },
              {
                text: 'Grant Access',
                onPress: async () => {
                  await RingerControlService.openNotificationPolicyAccessSettings();
                },
              },
            ]
          );
          // Don't enable mosque mode without permission
          return;
        }
      }

      // Enable mosque mode
      await enableMosqueMode(true);

      // Show confirmation
      Alert.alert(
        '🕌 Mosque Mode Enabled',
        Platform.OS === 'android'
          ? 'Your phone will automatically go silent at iqamah time for each prayer.'
          : 'You will receive a reminder before each iqamah to silence your phone.',
        Platform.OS === 'android'
          ? [
              { text: 'Great!' },
              {
                text: 'Test Now',
                onPress: async () => {
                  await MosqueModeService.scheduleTestMosqueMode();
                },
              },
            ]
          : [{ text: 'Great!' }]
      );
    } else {
      // Disabling mosque mode
      Alert.alert(
        'Disable Mosque Mode?',
        'You will no longer receive silent mode reminders at iqamah time.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: () => enableMosqueMode(false),
          },
        ]
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card.background }]}>
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.colors.text.primary }]}>
            🕌 Mosque Mode
          </Text>
          <Text style={[styles.description, { color: theme.colors.text.secondary }]}>
            {Platform.OS === 'android'
              ? 'Automatically silence phone at iqamah time'
              : 'Get reminders to enable silent mode for prayers'}
          </Text>
        </View>
        <Switch
          value={isEnabled}
          onValueChange={handleToggle}
          trackColor={{
            false: theme.colors.border.primary,
            true: theme.colors.primary.DEFAULT,
          }}
          thumbColor={theme.colors.card.background}
          disabled={isLoading}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
});
