// src/services/RingerControlService.ios.ts
// iOS-specific implementation for mosque mode via Focus Mode/Do Not Disturb

import { Linking, Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import StorageService from './StorageService';

const IOS_STORAGE_KEYS = {
  SHORTCUT_SETUP_COMPLETE: 'ios_shortcut_setup_complete',
  SHORTCUT_TESTED: 'ios_shortcut_tested',
};

class IOSRingerControlService {
  /**
   * Check if user has completed shortcut setup
   */
  hasCompletedSetup(): boolean {
    const completed = StorageService.getValue(IOS_STORAGE_KEYS.SHORTCUT_SETUP_COMPLETE);
    return completed === 'true';
  }

  /**
   * Mark shortcut setup as complete
   */
  markSetupComplete(): void {
    StorageService.setValue(IOS_STORAGE_KEYS.SHORTCUT_SETUP_COMPLETE, 'true');
  }

  /**
   * Check if shortcut has been tested
   */
  hasTestedShortcut(): boolean {
    const tested = StorageService.getValue(IOS_STORAGE_KEYS.SHORTCUT_TESTED);
    return tested === 'true';
  }

  /**
   * Mark shortcut as tested
   */
  markShortcutTested(): void {
    StorageService.setValue(IOS_STORAGE_KEYS.SHORTCUT_TESTED, 'true');
  }

  /**
   * Guide user through setting up the Shortcuts automation
   * This is a one-time setup process
   */
  async guideShortcutSetup(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        '🕌 Mosque Mode Setup (iOS)',
        'To enable silent mode automatically on iPhone:\n\n' +
        '1. Open the Shortcuts app\n' +
        '2. Tap "+" to create a new shortcut\n' +
        '3. Name it: "MosqueSilent"\n' +
        '4. Add action: "Set Focus"\n' +
        '5. Choose: "Do Not Disturb"\n' +
        '6. Turn ON\n' +
        '7. Save the shortcut\n\n' +
        'This allows Sukoon to trigger silent mode when iqamah starts.',
        [
          {
            text: 'Open Shortcuts',
            onPress: async () => {
              try {
                const canOpen = await Linking.canOpenURL('shortcuts://');
                if (canOpen) {
                  await Linking.openURL('shortcuts://create-shortcut');
                  this.markSetupComplete();
                  resolve(true);
                } else {
                  Alert.alert(
                    'Cannot Open Shortcuts',
                    'Please open the Shortcuts app manually from your home screen.',
                    [{ text: 'OK' }]
                  );
                  resolve(false);
                }
              } catch (error) {
                console.error('Failed to open Shortcuts:', error);
                resolve(false);
              }
            },
          },
          {
            text: 'I\'ll Do It Later',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Already Done',
            onPress: () => {
              this.markSetupComplete();
              resolve(true);
            },
          },
        ]
      );
    });
  }

  /**
   * Trigger the Focus Mode shortcut
   * This is called when iqamah time arrives
   */
  async enableFocusMode(): Promise<boolean> {
    try {
      // Try to open the shortcut directly
      const shortcutURL = 'shortcuts://run-shortcut?name=MosqueSilent';
      const canOpen = await Linking.canOpenURL(shortcutURL);

      if (canOpen) {
        await Linking.openURL(shortcutURL);
        console.log('🔇 iOS: Focus Mode shortcut triggered');
        return true;
      } else {
        // Shortcut doesn't exist, guide user to set it up
        console.log('⚠️ iOS: Shortcut not found');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to trigger Focus Mode:', error);
      return false;
    }
  }

  /**
   * Test the shortcut to ensure it works
   */
  async testShortcut(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        'Test Shortcut',
        'This will trigger the "MosqueSilent" shortcut now. Your phone should enter Do Not Disturb mode.\n\nReady to test?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Test Now',
            onPress: async () => {
              const success = await this.enableFocusMode();
              if (success) {
                this.markShortcutTested();
                setTimeout(() => {
                  Alert.alert(
                    'Test Complete',
                    'Did your phone enter Do Not Disturb mode?',
                    [
                      {
                        text: 'No, It Failed',
                        style: 'cancel',
                        onPress: () => {
                          // Reset setup status
                          StorageService.setValue(IOS_STORAGE_KEYS.SHORTCUT_SETUP_COMPLETE, 'false');
                          Alert.alert(
                            'Setup Issue',
                            'Please make sure:\n\n' +
                            '1. The shortcut is named exactly "MosqueSilent"\n' +
                            '2. It has the "Set Focus" action\n' +
                            '3. Focus is set to "Do Not Disturb"\n\n' +
                            'Try creating it again from Settings.',
                            [{ text: 'OK' }]
                          );
                        },
                      },
                      {
                        text: 'Yes, It Worked! ✅',
                        onPress: () => {
                          Alert.alert(
                            'Perfect! 🎉',
                            'Mosque Mode is now ready to use. When iqamah time arrives, your phone will automatically enter silent mode.',
                            [{ text: 'Great!' }]
                          );
                        },
                      },
                    ]
                  );
                }, 2000); // Wait 2 seconds for user to see the result
              } else {
                Alert.alert(
                  'Shortcut Not Found',
                  'The "MosqueSilent" shortcut could not be found. Please create it first.',
                  [{ text: 'OK' }]
                );
              }
              resolve(success);
            },
          },
        ]
      );
    });
  }

  /**
   * Show a reminder notification to manually enable DND
   * Fallback if shortcut doesn't work
   */
  async scheduleManualReminder(
    prayerName: string,
    iqamahTime: Date
  ): Promise<void> {
    try {
      // Schedule a high-priority notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🕌 ${prayerName} Iqamah`,
          body: 'Swipe down from top-right to enable Do Not Disturb',
          data: {
            type: 'ios_manual_dnd_reminder',
            prayer: prayerName,
          },
          sound: 'default',
          priority: 'high',
        },
        trigger: {
          type: 'date',
          date: iqamahTime,
        } as Notifications.NotificationTriggerInput,
        identifier: `ios-dnd-reminder-${prayerName}`,
      });

      console.log('📱 iOS: Manual DND reminder scheduled');
    } catch (error) {
      console.error('❌ Failed to schedule iOS reminder:', error);
    }
  }

  /**
   * Show setup instructions in a user-friendly format
   */
  getSetupInstructions(): {
    title: string;
    steps: string[];
    tips: string[];
  } {
    return {
      title: 'How to Setup Mosque Mode on iPhone',
      steps: [
        'Open the "Shortcuts" app on your iPhone',
        'Tap the "+" button to create a new shortcut',
        'Tap "Add Action"',
        'Search for "Set Focus"',
        'Select "Set Focus" action',
        'Tap "Focus" and choose "Do Not Disturb"',
        'Tap "Turn" and select "On"',
        'Tap "Next" at the top',
        'Name it exactly: "MosqueSilent"',
        'Tap "Done" to save',
      ],
      tips: [
        'The shortcut name must be exactly "MosqueSilent" (no spaces)',
        'Make sure "Do Not Disturb" is selected, not other Focus modes',
        'Test the shortcut before using it for prayers',
        'You can edit the shortcut anytime from the Shortcuts app',
      ],
    };
  }

  /**
   * Check if Shortcuts app is available
   */
  async isShortcutsAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }

    try {
      return await Linking.canOpenURL('shortcuts://');
    } catch {
      return false;
    }
  }

  /**
   * Reset setup status (for debugging or if user wants to redo setup)
   */
  resetSetup(): void {
    StorageService.setValue(IOS_STORAGE_KEYS.SHORTCUT_SETUP_COMPLETE, 'false');
    StorageService.setValue(IOS_STORAGE_KEYS.SHORTCUT_TESTED, 'false');
    console.log('🔄 iOS Shortcut setup reset');
  }
}

export default new IOSRingerControlService();
