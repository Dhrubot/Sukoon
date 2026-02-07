const { 
  withAndroidManifest, 
  withMainApplication,
  AndroidConfig,
  withDangerousMod 
} = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

// Java code for the RingerMode Module
const RINGER_MODE_MODULE_JAVA = `package com.talukders.sukoon;

import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.os.Build;
import android.provider.Settings;
import com.facebook.react.bridge.*;

public class RingerModeModule extends ReactContextBaseJavaModule {
    private AudioManager audioManager;
    private static final String MODULE_NAME = "RingerModeModule";
    
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
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getReactApplicationContext().startActivity(intent);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to open notification policy settings: " + e.getMessage());
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
                // Inexact fallback — may be batched by system but still fires
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, enableAt, enablePi);
                if (restoreAt > 0 && restoreAt > enableAt) {
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, restoreAt, restorePi);
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

    // Add USE_EXACT_ALARM permission for Android 13+ (API 33+)
    const hasUseExactAlarmPermission = permissions.some(
      (permission) =>
        permission.$['android:name'] === 'android.permission.USE_EXACT_ALARM'
    );

    if (!hasUseExactAlarmPermission) {
      permissions.push({
        $: {
          'android:name': 'android.permission.USE_EXACT_ALARM',
        },
      });
    }

    androidManifest.manifest['uses-permission'] = permissions;

    const mainApplication = androidManifest.manifest.application?.[0];
    if (mainApplication) {
      const receivers = mainApplication.receiver || [];
      const hasReceiver = receivers.some((r) => r?.$?.['android:name'] === '.MosqueModeReceiver');
      if (!hasReceiver) {
        receivers.push({
          $: {
            'android:name': '.MosqueModeReceiver',
            'android:exported': 'false',
          },
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

      return config;
    },
  ]);
};

// Register the package in MainApplication.java
const withRingerModePackage = (config) => {
  return withMainApplication(config, (config) => {
    const { modResults } = config;
    let contents = modResults.contents;

    // Add import for RingerModePackage
    const importStatement = 'import com.talukders.sukoon.RingerModePackage;';
    if (!contents.includes(importStatement)) {
      // Add import after other imports
      contents = contents.replace(
        /(import com\.facebook\.react\.defaults\.DefaultReactNativeHost;)/,
        `$1\n${importStatement}`
      );
    }

    // Add package to getPackages()
    const packageAddition = 'packages.add(new RingerModePackage());';
    if (!contents.includes(packageAddition)) {
      // Add to getPackages() method
      contents = contents.replace(
        /(protected List<ReactPackage> getPackages\(\) {[\s\S]*?return packages;)/,
        (match) => {
          // Add before the return statement
          return match.replace(
            'return packages;',
            `          ${packageAddition}\n          return packages;`
          );
        }
      );
    }

    modResults.contents = contents;
    console.log('✅ Registered RingerModePackage in MainApplication.java');
    
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
