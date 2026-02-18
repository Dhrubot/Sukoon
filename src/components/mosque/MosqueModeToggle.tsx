// src/components/mosque/MosqueModeToggle.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  Platform,
  Alert,
  AppState,
} from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';
import { useMosqueMode } from '../../hooks/useMosqueMode';
import RingerControlService from '../../services/RingerControlService';
import MosqueModeService from '../../services/MosqueModeService';

export const MosqueModeToggle: React.FC = () => {
  const { theme } = useTheme();
  const { isEnabled, enableMosqueMode } = useMosqueMode();
  const [isLoading, setIsLoading] = useState(false);
  const pendingEnable = useRef(false);

  // On Android, check if native module is available at all
  const nativeAvailable = Platform.OS !== 'android' || RingerControlService.isAvailable();

  // When user returns from Android DND settings, re-check and auto-enable
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active' && pendingEnable.current) {
        pendingEnable.current = false;
        setIsLoading(true);
        try {
          const canModify = await RingerControlService.canModify();
          if (canModify) {
            await enableMosqueMode(true);
            Alert.alert(
              'Mosque Mode Enabled',
              'Your phone will automatically go silent at iqamah time for each prayer.',
              [
                { text: 'Great!' },
                {
                  text: 'Test Now',
                  onPress: async () => {
                    await MosqueModeService.scheduleTestMosqueMode();
                  },
                },
              ]
            );
          } else {
            Alert.alert(
              'Permission Not Granted',
              'Do Not Disturb access was not granted. Mosque Mode needs this permission to silence your phone automatically.',
              [{ text: 'OK' }]
            );
          }
        } finally {
          setIsLoading(false);
        }
      }
    });

    return () => subscription.remove();
  }, [enableMosqueMode]);

  const requestDndAccess = async () => {
    pendingEnable.current = true;
    try {
      await RingerControlService.openNotificationPolicyAccessSettings();
    } catch (error) {
      pendingEnable.current = false;
      // openNotificationPolicyAccessSettings throws if ALL methods fail
      Alert.alert(
        'Could Not Open Settings',
        'Please open Android Settings > Apps > Sukoon > Notifications and enable Do Not Disturb access manually.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleToggle = async (value: boolean) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      if (value) {
        // Enabling mosque mode
        if (Platform.OS === 'android') {
          if (!nativeAvailable) {
            Alert.alert(
              'Feature Unavailable',
              'The native ringer module is not loaded. Please rebuild the app with "expo prebuild --clean" and reinstall.',
              [{ text: 'OK' }]
            );
            return;
          }

          const canModify = await RingerControlService.canModify();
          if (!canModify) {
            Alert.alert(
              '🛑 Permission Required',
              'To auto-silence your phone at iqamah time, Sukoon needs Do Not Disturb access.\n\nYou will be taken to Android settings. Find "Sukoon" and toggle it ON, then come back.',
              [
                { text: 'Not Now', style: 'cancel' },
                { text: 'Grant Access', onPress: requestDndAccess },
              ]
            );
            return;
          }
        }

        await enableMosqueMode(true);

        Alert.alert(
          'Mosque Mode Enabled',
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
        Alert.alert(
          'Disable Mosque Mode?',
          'You will no longer receive silent mode reminders at iqamah time.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Disable',
              style: 'destructive',
              onPress: async () => {
                await enableMosqueMode(false);
                Alert.alert(
                  'Mosque Mode Disabled',
                  'You will no longer receive automatic silent mode at iqamah time. You can re-enable this anytime.',
                  [{ text: 'OK' }]
                );
              },
            },
          ]
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const description = !nativeAvailable
    ? 'Unavailable — rebuild required (expo prebuild --clean)'
    : Platform.OS === 'android'
      ? 'Automatically silence phone at iqamah time'
      : 'Get reminders to enable silent mode for prayers';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card.background }]}>
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.colors.text.primary }]}>
            Mosque Mode
          </Text>
          <Text style={[
            styles.description,
            { color: nativeAvailable ? theme.colors.text.secondary : theme.colors.status.error },
          ]}>
            {description}
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
          disabled={isLoading || !nativeAvailable}
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
