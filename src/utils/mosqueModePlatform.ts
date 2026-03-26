import { Platform } from 'react-native';

export const isMosqueModeAutoSilenceSupported = Platform.OS === 'android';

export const mosqueModePlatformUi = {
  allowsDeviceSilencing: isMosqueModeAutoSilenceSupported,
  showsSilentModeControls: isMosqueModeAutoSilenceSupported,
  showsRestoreWindow: isMosqueModeAutoSilenceSupported,
  headerSubtitle: isMosqueModeAutoSilenceSupported
    ? 'Guard the quiet of the masjid by entering a dedicated prayer mode before iqamah.'
    : 'Get a calm reminder before iqamah so you can silence your phone yourself before prayer begins.',
  footerText: isMosqueModeAutoSilenceSupported
    ? 'Sukoon handles the quiet around iqamah so the masjid stays calm and your attention stays on salah.'
    : 'Sukoon cannot change iPhone sound settings for you. It will remind you at the right time so you can silence your phone yourself.',
  optionsSectionLabel: isMosqueModeAutoSilenceSupported ? 'SILENT MODE OPTIONS' : 'REMINDER OPTIONS',
  toggleDescription: isMosqueModeAutoSilenceSupported
    ? 'Automatically protect masjid quiet at iqamah time'
    : 'Receive reminders before iqamah so you can silence your phone manually',
  enabledMessage: isMosqueModeAutoSilenceSupported
    ? 'Your phone will automatically go silent at iqamah time for each prayer.'
    : 'You will receive reminders before iqamah so you can silence your phone yourself.',
  disableConfirmMessage: isMosqueModeAutoSilenceSupported
    ? 'You will no longer receive silent mode reminders at iqamah time.'
    : 'You will no longer receive mosque reminders before iqamah.',
  disabledMessage: isMosqueModeAutoSilenceSupported
    ? 'You will no longer receive automatic silent mode at iqamah time. You can re-enable this anytime.'
    : 'You will no longer receive mosque reminders before iqamah. You can re-enable them anytime.',
  promptDescription: isMosqueModeAutoSilenceSupported
    ? 'Sukoon will move your phone into quiet at iqamah and bring it back after the selected duration.'
    : 'Sukoon will remind you before iqamah so you can silence your phone yourself.',
  promptConfirmText: isMosqueModeAutoSilenceSupported ? 'Start Mosque Mode' : 'Yes, Remind Me',
  iqamahSubtitleOffset: isMosqueModeAutoSilenceSupported
    ? 'Set the iqamah start time after adhan'
    : 'Set when Sukoon should remind you before your mosque begins the prayer',
  iqamahSubtitleExact: isMosqueModeAutoSilenceSupported
    ? 'Set the exact iqamah time for each prayer'
    : 'Set the exact prayer start time so Sukoon can remind you at the right moment',
  iqamahHelpText: isMosqueModeAutoSilenceSupported
    ? "These times tell the app when your mosque actually starts the prayer.\n\nFor example:\n• If Fajr adhan is 5:10 AM\n• And your mosque starts congregation (Salat al-Jama'ah) at 5:20 AM\n• Set the offset to 10 minutes\n\nYour phone will go silent at 5:20 AM when iqamah starts."
    : "These times tell Sukoon when your mosque actually starts the prayer.\n\nFor example:\n• If Fajr adhan is 5:10 AM\n• And your mosque starts congregation (Salat al-Jama'ah) at 5:20 AM\n• Set the offset to 10 minutes\n\nSukoon will remind you before iqamah so you can silence your phone yourself.",
  jummahSubtitle: isMosqueModeAutoSilenceSupported
    ? "Khutba + prayer — longer silent mode for Fridays"
    : "Friday mosque mode reminder before khutbah and prayer",
  jummahDurationLabel: isMosqueModeAutoSilenceSupported ? 'Silent Duration' : 'Reminder Timing',
  jummahDurationHint: isMosqueModeAutoSilenceSupported
    ? 'Includes khutba (~20 min) + prayer (~10 min)'
    : 'Choose how early Sukoon should start reminding you on Fridays',
  jummahOffsetHint: isMosqueModeAutoSilenceSupported
    ? "Minutes after Dhuhr adhan on Friday"
    : "Minutes after Dhuhr adhan when Jumu'ah begins",
  confirmBeforeValueEnabled: isMosqueModeAutoSilenceSupported
    ? "You'll be asked before your phone goes silent"
    : "Sukoon will ask before sending the final mosque reminder",
  confirmBeforeValueDisabled: isMosqueModeAutoSilenceSupported
    ? 'Phone silences automatically at iqamah time'
    : 'Sukoon reminds you automatically before iqamah',
  statusScheduledTitle: isMosqueModeAutoSilenceSupported ? 'Mosque Mode Scheduled' : 'Mosque Reminders On',
  statusActiveTitle: isMosqueModeAutoSilenceSupported ? 'Mosque Mode Active' : 'Mosque Reminders On',
  statusScheduledDescription: (prayerName: string, timeLabel: string) => isMosqueModeAutoSilenceSupported
    ? `${prayerName} • Iqamah at ${timeLabel}`
    : `${prayerName} • Reminder before iqamah at ${timeLabel}`,
  statusActiveDescription: (prayerName: string, timeLabel: string) => isMosqueModeAutoSilenceSupported
    ? `${prayerName} • Silent until ${timeLabel}`
    : `${prayerName} • Reminder scheduled for iqamah at ${timeLabel}`,
  homeTipText: isMosqueModeAutoSilenceSupported
    ? 'Prepare your phone for the masjid so iqamah begins in quiet.'
    : 'Get a calm reminder before iqamah so you can silence your phone yourself before entering the masjid.',
  promptNotificationBody: isMosqueModeAutoSilenceSupported
    ? 'Heading to the masjid? Tap to begin Mosque Mode.'
    : 'Heading to the mosque? Tap to set a reminder before iqamah.',
  autoReminderBody: isMosqueModeAutoSilenceSupported
    ? 'Mosque Mode will turn on at iqamah. Sukoon will quiet your phone automatically.'
    : 'Iqamah starts soon. Silence your phone before prayer begins.',
  iosReminderBody: 'Iqamah starts soon. Silence your phone before prayer begins.',
  iosIqamahBody: 'Iqamah is starting now. Please silence your phone for prayer.',
};
