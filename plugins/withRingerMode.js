const { 
  withAndroidManifest, 
  withMainApplication,
  withDangerousMod 
} = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');
const { registerAndroidPackageInMainApplication } = require('./withAndroidPackageRegistration');

// Java code for the RingerMode Module
const RINGER_MODE_MODULE_JAVA = `package com.talukders.sukoon;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioManager;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.os.Build;
import android.provider.Settings;
import com.facebook.react.bridge.*;

public class RingerModeModule extends ReactContextBaseJavaModule {
    private AudioManager audioManager;
    private static final String MODULE_NAME = "RingerModeModule";
    // Dedicated SharedPreferences file for cross-process mosque-mode state (Phase 2).
    // Distinct from sukoon_boot_prefs to keep concerns separated.
    static final String MOSQUE_PREFS_NAME = "sukoon_mosque_prefs";

    public RingerModeModule(ReactApplicationContext context) {
        super(context);
        audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void setRingerMode(String mode, Promise promise) {
        try {
            int ringerMode;
            switch (mode) {
                case "SILENT":
                    ringerMode = AudioManager.RINGER_MODE_SILENT;
                    break;
                case "VIBRATE":
                    ringerMode = AudioManager.RINGER_MODE_VIBRATE;
                    break;
                case "NORMAL":
                    ringerMode = AudioManager.RINGER_MODE_NORMAL;
                    break;
                default:
                    promise.reject("INVALID_MODE", "Invalid ringer mode: " + mode);
                    return;
            }

            audioManager.setRingerMode(ringerMode);
            promise.resolve(mode);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to set ringer mode: " + e.getMessage());
        }
    }

    @ReactMethod
    public void getRingerMode(Promise promise) {
        try {
            int mode = audioManager.getRingerMode();
            String modeString;
            switch (mode) {
                case AudioManager.RINGER_MODE_SILENT:
                    modeString = "SILENT";
                    break;
                case AudioManager.RINGER_MODE_VIBRATE:
                    modeString = "VIBRATE";
                    break;
                case AudioManager.RINGER_MODE_NORMAL:
                    modeString = "NORMAL";
                    break;
                default:
                    modeString = "UNKNOWN";
            }
            promise.resolve(modeString);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to get ringer mode: " + e.getMessage());
        }
    }

    @ReactMethod
    public void canModifyRingerMode(Promise promise) {
        try {
            // On Android 6.0+, we need to check if we can actually modify
            boolean canModify = true;
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                android.app.NotificationManager notificationManager =
                    (android.app.NotificationManager) getReactApplicationContext()
                        .getSystemService(Context.NOTIFICATION_SERVICE);
                canModify = notificationManager.isNotificationPolicyAccessGranted();
            }
            promise.resolve(canModify);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to check permission: " + e.getMessage());
        }
    }

    @ReactMethod
    public void openNotificationPolicyAccessSettings(Promise promise) {
        try {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
            android.app.Activity activity = getCurrentActivity();
            if (activity != null) {
                activity.startActivity(intent);
            } else {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getReactApplicationContext().startActivity(intent);
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("OPEN_SETTINGS_FAILED", "Failed to open DND settings: " + e.getMessage());
        }
    }

    // -----------------------------------------------------------------------
    // Phase 2 — SharedPreferences bridge methods for cross-process mosque state.
    // Uses commit() (synchronous) per the locked design decision so the boot
    // receiver always reads a consistent snapshot.
    // -----------------------------------------------------------------------

    /**
     * Write a string value to the mosque-mode SharedPreferences file.
     * Uses commit() (synchronous) to guarantee cross-process visibility.
     */
    @ReactMethod
    public void mosquePrefsSet(String key, String value, Promise promise) {
        try {
            SharedPreferences prefs = getReactApplicationContext()
                .getSharedPreferences(MOSQUE_PREFS_NAME, Context.MODE_PRIVATE);
            boolean committed = prefs.edit().putString(key, value).commit();
            promise.resolve(committed);
        } catch (Exception e) {
            promise.reject("ERROR", "mosquePrefsSet failed: " + e.getMessage());
        }
    }

    /**
     * Read a string value from the mosque-mode SharedPreferences file.
     * Returns null (JS null) if the key is absent.
     */
    @ReactMethod
    public void mosquePrefsGet(String key, Promise promise) {
        try {
            SharedPreferences prefs = getReactApplicationContext()
                .getSharedPreferences(MOSQUE_PREFS_NAME, Context.MODE_PRIVATE);
            String value = prefs.getString(key, null);
            promise.resolve(value);
        } catch (Exception e) {
            promise.reject("ERROR", "mosquePrefsGet failed: " + e.getMessage());
        }
    }

    /**
     * Remove a single key from the mosque-mode SharedPreferences file.
     * Uses commit() (synchronous).
     */
    @ReactMethod
    public void mosquePrefsClear(String key, Promise promise) {
        try {
            SharedPreferences prefs = getReactApplicationContext()
                .getSharedPreferences(MOSQUE_PREFS_NAME, Context.MODE_PRIVATE);
            boolean committed = prefs.edit().remove(key).commit();
            promise.resolve(committed);
        } catch (Exception e) {
            promise.reject("ERROR", "mosquePrefsClear failed: " + e.getMessage());
        }
    }

    private int toRingerMode(String mode) {
        if (mode == null) {
            return AudioManager.RINGER_MODE_NORMAL;
        }
        switch (mode) {
            case "SILENT":
                return AudioManager.RINGER_MODE_SILENT;
            case "VIBRATE":
                return AudioManager.RINGER_MODE_VIBRATE;
            case "NORMAL":
            default:
                return AudioManager.RINGER_MODE_NORMAL;
        }
    }

    @ReactMethod
    public void scheduleMosqueMode(double enableAtMs, double restoreAtMs, String enableMode, String restoreMode, double requestCodeBase, Promise promise) {
        try {
            Context context = getReactApplicationContext();
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                promise.resolve(false);
                return;
            }

            // Check exact alarm permission on Android 12+ (API 31+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (!alarmManager.canScheduleExactAlarms()) {
                    // Fall back to inexact alarm which may be delayed by up to ~10 min
                    android.util.Log.w(MODULE_NAME, "Exact alarm permission not granted, using inexact alarm");
                }
            }

            int base = (int) requestCodeBase;

            Intent enableIntent = new Intent(context, MosqueModeReceiver.class);
            enableIntent.setAction("com.talukders.sukoon.MOSQUE_MODE_ENABLE");
            enableIntent.putExtra("mode", enableMode);

            Intent restoreIntent = new Intent(context, MosqueModeReceiver.class);
            restoreIntent.setAction("com.talukders.sukoon.MOSQUE_MODE_RESTORE");
            restoreIntent.putExtra("mode", restoreMode);

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent enablePi = PendingIntent.getBroadcast(context, base, enableIntent, flags);
            PendingIntent restorePi = PendingIntent.getBroadcast(context, base + 1, restoreIntent, flags);

            long enableAt = (long) enableAtMs;
            long restoreAt = (long) restoreAtMs;

            boolean canExact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms();

            if (canExact && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, enableAt, enablePi);
                if (restoreAt > 0 && restoreAt > enableAt) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, restoreAt, restorePi);
                }
            } else if (canExact && Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, enableAt, enablePi);
                if (restoreAt > 0 && restoreAt > enableAt) {
                    alarmManager.setExact(AlarmManager.RTC_WAKEUP, restoreAt, restorePi);
                }
            } else {
                // Pre-KitKat fallback — setAndAllowWhileIdle requires API 23+
                alarmManager.set(AlarmManager.RTC_WAKEUP, enableAt, enablePi);
                if (restoreAt > 0 && restoreAt > enableAt) {
                    alarmManager.set(AlarmManager.RTC_WAKEUP, restoreAt, restorePi);
                }
            }

            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to schedule mosque mode: " + e.getMessage());
        }
    }

    @ReactMethod
    public void cancelMosqueMode(double requestCodeBase, Promise promise) {
        try {
            Context context = getReactApplicationContext();
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                promise.resolve(false);
                return;
            }

            int base = (int) requestCodeBase;
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            Intent enableIntent = new Intent(context, MosqueModeReceiver.class);
            enableIntent.setAction("com.talukders.sukoon.MOSQUE_MODE_ENABLE");
            PendingIntent enablePi = PendingIntent.getBroadcast(context, base, enableIntent, flags);

            Intent restoreIntent = new Intent(context, MosqueModeReceiver.class);
            restoreIntent.setAction("com.talukders.sukoon.MOSQUE_MODE_RESTORE");
            PendingIntent restorePi = PendingIntent.getBroadcast(context, base + 1, restoreIntent, flags);

            alarmManager.cancel(enablePi);
            alarmManager.cancel(restorePi);
            enablePi.cancel();
            restorePi.cancel();

            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to cancel mosque mode: " + e.getMessage());
        }
    }
}
`;

const MOSQUE_MODE_RECEIVER_JAVA = `package com.talukders.sukoon;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.os.Build;
import android.util.Log;

public class MosqueModeReceiver extends BroadcastReceiver {
    private static final String TAG = "MosqueModeReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;

        try {
            // Check DND permission on Android 6+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                NotificationManager nm = (NotificationManager)
                    context.getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null && !nm.isNotificationPolicyAccessGranted()) {
                    Log.w(TAG, "DND policy access not granted, cannot change ringer mode");
                    return;
                }
            }

            String mode = intent.getStringExtra("mode");
            String action = intent.getAction();
            Log.d(TAG, "Received action=" + action + " mode=" + mode);

            int ringerMode = AudioManager.RINGER_MODE_NORMAL;
            if (mode != null) {
                switch (mode) {
                    case "SILENT":
                        ringerMode = AudioManager.RINGER_MODE_SILENT;
                        break;
                    case "VIBRATE":
                        ringerMode = AudioManager.RINGER_MODE_VIBRATE;
                        break;
                    case "NORMAL":
                    default:
                        ringerMode = AudioManager.RINGER_MODE_NORMAL;
                        break;
                }
            }

            AudioManager audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                audioManager.setRingerMode(ringerMode);
                Log.d(TAG, "Ringer mode set to " + mode);
            }
        } catch (SecurityException se) {
            Log.e(TAG, "SecurityException - missing DND permission: " + se.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "Failed to set ringer mode: " + e.getMessage());
        }
    }
}
`;

// ---------------------------------------------------------------------------
// Phase 2: Boot receiver that re-arms mosque-mode AlarmManager alarms after
// a device reboot. Reads state from sukoon_mosque_prefs SharedPreferences
// (written by RingerModeModule.mosquePrefsSet from JS side).
// ---------------------------------------------------------------------------
const RINGER_MODE_BOOT_RECEIVER_JAVA = `package com.talukders.sukoon;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioManager;
import android.os.Build;
import android.util.Log;

/**
 * Fires on BOOT_COMPLETED and re-arms mosque-mode AlarmManager alarms
 * that were wiped by the reboot.
 *
 * State is read from sukoon_mosque_prefs SharedPreferences (Phase 2),
 * written by JS-side MosqueModeService via RingerModeModule.mosquePrefsSet().
 */
public class RingerModeBootReceiver extends BroadcastReceiver {
    private static final String TAG = "RingerModeBootReceiver";

    // SharedPreferences key names — must match JS SP_KEYS constants.
    private static final String KEY_STATE             = "mosque_state";
    private static final String KEY_PRAYER            = "mosque_prayer";
    private static final String KEY_IQAMAH_MS         = "mosque_iqamah_ms";
    private static final String KEY_RESTORE_MS        = "mosque_restore_ms";
    private static final String KEY_RESTORE_MODE      = "mosque_restore_mode";
    private static final String KEY_MANAGED_BY_SUKOON = "mosque_managed_by_sukoon";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;
        if (!Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) &&
            !"android.intent.action.QUICKBOOT_POWERON".equals(intent.getAction())) {
            return;
        }

        Log.d(TAG, "BOOT_COMPLETED received — checking mosque mode state");

        SharedPreferences prefs = context.getSharedPreferences(
            RingerModeModule.MOSQUE_PREFS_NAME, Context.MODE_PRIVATE);

        String state = prefs.getString(KEY_STATE, null);
        if (state == null || state.equals("idle")) {
            Log.d(TAG, "No active mosque mode in prefs — nothing to re-arm");
            return;
        }

        String iqamahMsStr  = prefs.getString(KEY_IQAMAH_MS, null);
        String restoreMsStr = prefs.getString(KEY_RESTORE_MS, null);
        String restoreMode  = prefs.getString(KEY_RESTORE_MODE, "NORMAL");
        boolean managedBySukoon = "1".equals(prefs.getString(KEY_MANAGED_BY_SUKOON, "0"));

        if (iqamahMsStr == null || restoreMsStr == null) {
            Log.w(TAG, "Incomplete mosque prefs — clearing state");
            prefs.edit().clear().commit();
            return;
        }

        long iqamahMs;
        long restoreMs;
        try {
            iqamahMs  = Long.parseLong(iqamahMsStr);
            restoreMs = Long.parseLong(restoreMsStr);
        } catch (NumberFormatException e) {
            Log.e(TAG, "Failed to parse mosque pref timestamps: " + e.getMessage());
            prefs.edit().clear().commit();
            return;
        }

        long now = System.currentTimeMillis();

        // Case 1: window has passed — restore ringer immediately if we managed it.
        if (now >= restoreMs) {
            Log.d(TAG, "Boot after restore window — restoring ringer immediately");
            if (managedBySukoon) {
                applyRingerMode(context, restoreMode);
            }
            prefs.edit().clear().commit();
            return;
        }

        // Case 2: in active silence window — re-apply SILENT and re-arm only RESTORE alarm.
        if (now >= iqamahMs && now < restoreMs && managedBySukoon) {
            Log.d(TAG, "Boot during active silence window — re-applying SILENT and re-arming RESTORE alarm");
            applyRingerMode(context, "SILENT");
            scheduleRestoreAlarm(context, restoreMs, restoreMode, (int)(iqamahMs % Integer.MAX_VALUE));
            return;
        }

        // Case 3: before iqamah — re-arm both ENABLE and RESTORE alarms.
        if (now < iqamahMs) {
            String prayer = prefs.getString(KEY_PRAYER, "Prayer");
            Log.d(TAG, "Boot before iqamah for " + prayer + " — re-arming both alarms");
            scheduleEnableAlarm(context, iqamahMs, "SILENT", (int)(iqamahMs % Integer.MAX_VALUE));
            if (restoreMs > iqamahMs) {
                scheduleRestoreAlarm(context, restoreMs, restoreMode, (int)(iqamahMs % Integer.MAX_VALUE));
            }
        }
    }

    private void applyRingerMode(Context context, String mode) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                NotificationManager nm = (NotificationManager)
                    context.getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null && !nm.isNotificationPolicyAccessGranted()) {
                    Log.w(TAG, "DND permission not granted — cannot apply ringer mode");
                    return;
                }
            }
            AudioManager am = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            if (am == null) return;
            switch (mode) {
                case "SILENT":  am.setRingerMode(AudioManager.RINGER_MODE_SILENT);  break;
                case "VIBRATE": am.setRingerMode(AudioManager.RINGER_MODE_VIBRATE); break;
                default:        am.setRingerMode(AudioManager.RINGER_MODE_NORMAL);  break;
            }
            Log.d(TAG, "Ringer mode set to " + mode + " after boot");
        } catch (Exception e) {
            Log.e(TAG, "Failed to apply ringer mode after boot: " + e.getMessage());
        }
    }

    private void scheduleEnableAlarm(Context context, long triggerAtMs, String mode, int requestCode) {
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;

            Intent enableIntent = new Intent(context, MosqueModeReceiver.class);
            enableIntent.setAction("com.talukders.sukoon.MOSQUE_MODE_ENABLE");
            enableIntent.putExtra("mode", mode);

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pi = PendingIntent.getBroadcast(context, requestCode, enableIntent, flags);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pi);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                am.setExact(AlarmManager.RTC_WAKEUP, triggerAtMs, pi);
            } else {
                am.set(AlarmManager.RTC_WAKEUP, triggerAtMs, pi);
            }
            Log.d(TAG, "ENABLE alarm re-armed for " + triggerAtMs);
        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule enable alarm: " + e.getMessage());
        }
    }

    private void scheduleRestoreAlarm(Context context, long triggerAtMs, String restoreMode, int requestCodeBase) {
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;

            Intent restoreIntent = new Intent(context, MosqueModeReceiver.class);
            restoreIntent.setAction("com.talukders.sukoon.MOSQUE_MODE_RESTORE");
            restoreIntent.putExtra("mode", restoreMode);

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pi = PendingIntent.getBroadcast(context, requestCodeBase + 1, restoreIntent, flags);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pi);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                am.setExact(AlarmManager.RTC_WAKEUP, triggerAtMs, pi);
            } else {
                am.set(AlarmManager.RTC_WAKEUP, triggerAtMs, pi);
            }
            Log.d(TAG, "RESTORE alarm re-armed for " + triggerAtMs + " mode=" + restoreMode);
        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule restore alarm: " + e.getMessage());
        }
    }
}
`;

// Java code for the RingerMode Package
const RINGER_MODE_PACKAGE_JAVA = `package com.talukders.sukoon;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class RingerModePackage implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new RingerModeModule(reactContext));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
`;

// Add permission to AndroidManifest
const withRingerModePermission = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const permissions = androidManifest.manifest['uses-permission'] || [];

    // Add MODIFY_AUDIO_SETTINGS permission
    const hasPermission = permissions.some(
      (permission) => 
        permission.$['android:name'] === 'android.permission.MODIFY_AUDIO_SETTINGS'
    );

    if (!hasPermission) {
      permissions.push({
        $: {
          'android:name': 'android.permission.MODIFY_AUDIO_SETTINGS',
        },
      });
    }

    // Add ACCESS_NOTIFICATION_POLICY permission for Android 6.0+
    const hasNotificationPolicyPermission = permissions.some(
      (permission) => 
        permission.$['android:name'] === 'android.permission.ACCESS_NOTIFICATION_POLICY'
    );

    if (!hasNotificationPolicyPermission) {
      permissions.push({
        $: {
          'android:name': 'android.permission.ACCESS_NOTIFICATION_POLICY',
        },
      });
    }

    // Add SCHEDULE_EXACT_ALARM permission for Android 12+ (API 31+)
    const hasExactAlarmPermission = permissions.some(
      (permission) =>
        permission.$['android:name'] === 'android.permission.SCHEDULE_EXACT_ALARM'
    );

    if (!hasExactAlarmPermission) {
      permissions.push({
        $: {
          'android:name': 'android.permission.SCHEDULE_EXACT_ALARM',
        },
      });
    }

    // Note: USE_EXACT_ALARM is reserved by Google Play for alarm/clock apps and
    // can trigger Play Console rejection for prayer apps. We use
    // SCHEDULE_EXACT_ALARM (declared above), which is the correct permission for
    // user-scheduled prayer time alarms. USE_EXACT_ALARM is explicitly listed in
    // app.config.js blockedPermissions; do not add it back here.

    androidManifest.manifest['uses-permission'] = permissions;

    const mainApplication = androidManifest.manifest.application?.[0];
    if (mainApplication) {
      const receivers = mainApplication.receiver || [];

      // MosqueModeReceiver — handles AlarmManager ENABLE / RESTORE intents
      const hasMosqueModeReceiver = receivers.some((r) => r?.$?.['android:name'] === '.MosqueModeReceiver');
      if (!hasMosqueModeReceiver) {
        receivers.push({
          $: {
            'android:name': '.MosqueModeReceiver',
            'android:exported': 'false',
          },
        });
      }

      // RingerModeBootReceiver — Phase 2: re-arms mosque mode alarms after reboot
      const hasBootReceiver = receivers.some((r) => r?.$?.['android:name'] === '.RingerModeBootReceiver');
      if (!hasBootReceiver) {
        receivers.push({
          $: {
            'android:name': '.RingerModeBootReceiver',
            'android:exported': 'false',
          },
          'intent-filter': [
            {
              action: [
                { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
                { $: { 'android:name': 'android.intent.action.QUICKBOOT_POWERON' } },
              ],
            },
          ],
        });
      }

      mainApplication.receiver = receivers;
    }

    return config;
  });
};

// Create Java files in android/app/src/main/java
const withRingerModeFiles = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidPath = path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'java',
        'com',
        'talukders',
        'sukoon'
      );

      // Ensure directory exists
      if (!fs.existsSync(androidPath)) {
        fs.mkdirSync(androidPath, { recursive: true });
      }

      // Write RingerModeModule.java
      const modulePath = path.join(androidPath, 'RingerModeModule.java');
      fs.writeFileSync(modulePath, RINGER_MODE_MODULE_JAVA, 'utf-8');
      console.log('✅ Created RingerModeModule.java');

      // Write RingerModePackage.java
      const packagePath = path.join(androidPath, 'RingerModePackage.java');
      fs.writeFileSync(packagePath, RINGER_MODE_PACKAGE_JAVA, 'utf-8');
      console.log('✅ Created RingerModePackage.java');

      const receiverPath = path.join(androidPath, 'MosqueModeReceiver.java');
      fs.writeFileSync(receiverPath, MOSQUE_MODE_RECEIVER_JAVA, 'utf-8');
      console.log('✅ Created MosqueModeReceiver.java');

      // Phase 2: write RingerModeBootReceiver.java
      const bootReceiverPath = path.join(androidPath, 'RingerModeBootReceiver.java');
      fs.writeFileSync(bootReceiverPath, RINGER_MODE_BOOT_RECEIVER_JAVA, 'utf-8');
      console.log('✅ Created RingerModeBootReceiver.java');

      return config;
    },
  ]);
};

// Register the package in MainApplication (supports both Kotlin and Java)
const withRingerModePackage = (config) => {
  return withMainApplication(config, (config) => {
    config.modResults.contents = registerAndroidPackageInMainApplication(
      config.modResults.contents,
      'RingerModePackage'
    );
    console.log('✅ Registered RingerModePackage in MainApplication');
    return config;
  });
};

// Main plugin export
module.exports = function withRingerMode(config) {
  config = withRingerModePermission(config);
  config = withRingerModeFiles(config);
  config = withRingerModePackage(config);
  return config;
};
