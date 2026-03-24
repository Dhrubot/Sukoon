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
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import { useMosqueMode } from '../../hooks/useMosqueMode';
import RingerControlService from '../../services/RingerControlService';
import MosqueModeService from '../../services/MosqueModeService';
import { mosqueModePlatformUi } from '../../utils/mosqueModePlatform';

export const MosqueModeToggle: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
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
              'Permission Required',
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
          mosqueModePlatformUi.enabledMessage,
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
          mosqueModePlatformUi.disableConfirmMessage,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Disable',
              style: 'destructive',
              onPress: async () => {
                await enableMosqueMode(false);
                Alert.alert(
                  'Mosque Mode Disabled',
                  mosqueModePlatformUi.disabledMessage,
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
    : mosqueModePlatformUi.toggleDescription;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Mosque Mode</Text>
          <Text style={[
            styles.description,
            !nativeAvailable && { color: theme.colors.status.error },
          ]}>
            {description}
          </Text>
        </View>
        <Switch
          value={isEnabled}
          onValueChange={handleToggle}
          trackColor={{
            false: theme.colors.switch.trackFalse,
            true: theme.colors.switch.trackTrue,
          }}
          thumbColor={theme.colors.switch.thumb}
          disabled={isLoading || !nativeAvailable}
        />
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.mosqueMode.card.bg,
    borderWidth: 1,
    borderColor: theme.colors.mosqueMode.card.border,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  title: {
    fontSize: 17,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  description: {
    fontSize: 14,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
});
