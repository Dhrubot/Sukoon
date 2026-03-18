const {
  withAndroidManifest,
  withMainApplication,
  withDangerousMod,
} = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

// ─── Java: AdhanService (Foreground Service) ───────────────────────────────
const ADHAN_SERVICE_JAVA = `package com.talukders.sukoon;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;

public class AdhanService extends Service {
    private static final String TAG = "AdhanService";
    private static final String CHANNEL_ID = "adhan-foreground-service";
    private static final int NOTIFICATION_ID = 9001;
    public static final String ACTION_STOP = "com.talukders.sukoon.STOP_ADHAN";
    public static final String EXTRA_PRAYER_NAME = "prayer_name";

    private MediaPlayer mediaPlayer;
    private PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            // Must call startForeground() before stopping if started via startForegroundService()
            try {
                Notification notification = buildNotification("Prayer");
                startForeground(NOTIFICATION_ID, notification);
            } catch (Exception e) {
                Log.w(TAG, "startForeground before stop: " + e.getMessage());
            }
            stopAdhan();
            return START_NOT_STICKY;
        }

        String prayerName = "Prayer";
        if (intent != null && intent.hasExtra(EXTRA_PRAYER_NAME)) {
            prayerName = intent.getStringExtra(EXTRA_PRAYER_NAME);
        }

        // Acquire wake lock to keep CPU active during playback
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "sukoon:adhan_playback"
            );
            wakeLock.acquire(5 * 60 * 1000L); // 5 min max
        }

        // Build and start foreground notification
        Notification notification = buildNotification(prayerName);
        startForeground(NOTIFICATION_ID, notification);

        // Play the full adhan
        playAdhan();

        return START_NOT_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Adhan Playback",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Shows while the full Adhan is playing");
            channel.setSound(null, null); // No sound — audio comes from MediaPlayer
            channel.setVibrationPattern(null);
            channel.enableVibration(false);

            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildNotification(String prayerName) {
        // "Stop" action → stops audio + opens app
        Intent stopIntent = new Intent(this, AdhanService.class);
        stopIntent.setAction(ACTION_STOP);
        int stopFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            stopFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent stopPi = PendingIntent.getService(this, 0, stopIntent, stopFlags);

        // Tap notification → open app
        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent launchPi = null;
        if (launchIntent != null) {
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int launchFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                launchFlags |= PendingIntent.FLAG_IMMUTABLE;
            }
            launchPi = PendingIntent.getActivity(this, 1, launchIntent, launchFlags);
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(prayerName + " Adhan")
            .setContentText("Playing the call to prayer...")
            .setSmallIcon(android.R.drawable.ic_lock_silent_mode_off)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .addAction(android.R.drawable.ic_media_pause, "Stop", stopPi);

        if (launchPi != null) {
            builder.setContentIntent(launchPi);
        }

        return builder.build();
    }

    private void playAdhan() {
        try {
            if (mediaPlayer != null) {
                mediaPlayer.release();
                mediaPlayer = null;
            }

            int resId = getResources().getIdentifier("adhan_full", "raw", getPackageName());
            if (resId == 0) {
                Log.e(TAG, "adhan_full resource not found in res/raw");
                stopAdhan();
                return;
            }

            mediaPlayer = MediaPlayer.create(this, resId);
            if (mediaPlayer == null) {
                Log.e(TAG, "MediaPlayer.create returned null");
                stopAdhan();
                return;
            }

            // Use STREAM_ALARM for reliable playback at alarm volume
            mediaPlayer.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()
            );

            mediaPlayer.setOnCompletionListener(mp -> {
                Log.d(TAG, "Adhan playback completed");
                stopAdhan();
            });

            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                Log.e(TAG, "MediaPlayer error: what=" + what + " extra=" + extra);
                stopAdhan();
                return true;
            });

            mediaPlayer.start();
            Log.d(TAG, "Full Adhan playback started");

        } catch (Exception e) {
            Log.e(TAG, "Failed to play adhan: " + e.getMessage());
            stopAdhan();
        }
    }

    private void launchApp() {
        try {
            Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                startActivity(launchIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to launch app: " + e.getMessage());
        }
    }

    private void stopAdhan() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.release();
            } catch (Exception e) {
                Log.w(TAG, "Error stopping MediaPlayer: " + e.getMessage());
            }
            mediaPlayer = null;
        }

        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
            } catch (Exception e) {
                Log.w(TAG, "Error releasing wake lock: " + e.getMessage());
            }
            wakeLock = null;
        }

        stopForeground(true);
        stopSelf();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        stopAdhan();
        super.onDestroy();
    }
}
`;

// ─── Java: AdhanAlarmReceiver (BroadcastReceiver) ──────────────────────────
const ADHAN_ALARM_RECEIVER_JAVA = `package com.talukders.sukoon;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

public class AdhanAlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AdhanAlarmReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;

        try {
            String prayerName = intent.getStringExtra(AdhanService.EXTRA_PRAYER_NAME);
            Log.d(TAG, "Adhan alarm fired for: " + prayerName);

            Intent serviceIntent = new Intent(context, AdhanService.class);
            serviceIntent.putExtra(AdhanService.EXTRA_PRAYER_NAME, prayerName != null ? prayerName : "Prayer");

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to start AdhanService: " + e.getMessage());
        }
    }
}
`;

// ─── Java: AdhanModule (React Native Bridge) ──────────────────────────────
const ADHAN_MODULE_JAVA = `package com.talukders.sukoon;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class AdhanModule extends ReactContextBaseJavaModule {
    private static final String TAG = "AdhanModule";
    private static final String MODULE_NAME = "AdhanModule";

    public AdhanModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void getExactAlarmStatus(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                promise.resolve("unavailable");
                return;
            }

            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
                promise.resolve("granted");
                return;
            }

            promise.resolve(alarmManager.canScheduleExactAlarms() ? "granted" : "fallback");
        } catch (Exception e) {
            promise.reject("EXACT_ALARM_STATUS_ERROR", "Failed to read exact alarm status: " + e.getMessage());
        }
    }

    /**
     * Schedule an alarm that will trigger the full Adhan foreground service.
     * @param timeMs    Epoch milliseconds for when to fire
     * @param prayerName Display name of the prayer (e.g., "Fajr")
     * @param requestCode Unique request code for this alarm
     */
    @ReactMethod
    public void scheduleAdhan(double timeMs, String prayerName, double requestCode, Promise promise) {
        try {
            Context context = getReactApplicationContext();
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                promise.reject("NO_ALARM_MANAGER", "AlarmManager not available");
                return;
            }

            Intent intent = new Intent(context, AdhanAlarmReceiver.class);
            intent.setAction("com.talukders.sukoon.FULL_ADHAN_" + (int) requestCode);
            intent.putExtra(AdhanService.EXTRA_PRAYER_NAME, prayerName);

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pi = PendingIntent.getBroadcast(context, (int) requestCode, intent, flags);
            long triggerAt = (long) timeMs;

            // Use exact alarm for precise prayer time delivery
            boolean canExact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S;
            if (!canExact && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                canExact = alarmManager.canScheduleExactAlarms();
            }

            if (canExact && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
            } else if (canExact) {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
            } else {
                // Fallback: inexact, may be delayed up to ~10 min
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                Log.w(TAG, "Exact alarm not permitted, using inexact for " + prayerName);
            }

            Log.d(TAG, "Scheduled full adhan for " + prayerName + " at " + triggerAt + " (rc=" + (int) requestCode + ")");
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SCHEDULE_ERROR", "Failed to schedule adhan: " + e.getMessage());
        }
    }

    /**
     * Cancel a previously scheduled adhan alarm by request code.
     */
    @ReactMethod
    public void cancelAdhan(double requestCode, Promise promise) {
        try {
            Context context = getReactApplicationContext();
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                promise.resolve(false);
                return;
            }

            Intent intent = new Intent(context, AdhanAlarmReceiver.class);
            intent.setAction("com.talukders.sukoon.FULL_ADHAN_" + (int) requestCode);

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pi = PendingIntent.getBroadcast(context, (int) requestCode, intent, flags);
            alarmManager.cancel(pi);
            pi.cancel();

            Log.d(TAG, "Cancelled adhan alarm rc=" + (int) requestCode);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("CANCEL_ERROR", "Failed to cancel adhan: " + e.getMessage());
        }
    }

    /**
     * Cancel all scheduled adhan alarms.
     * Uses the known request code range: base 5000, up to 5000 + (maxDays * 5) + 4.
     */
    @ReactMethod
    public void cancelAllAdhans(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                promise.resolve(false);
                return;
            }

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            // Cancel codes 5000..5000 + (7 days * 5 prayers) = 5000..5034
            int cancelled = 0;
            for (int rc = 5000; rc < 5035; rc++) {
                Intent intent = new Intent(context, AdhanAlarmReceiver.class);
                intent.setAction("com.talukders.sukoon.FULL_ADHAN_" + rc);
                PendingIntent pi = PendingIntent.getBroadcast(context, rc, intent,
                    flags | PendingIntent.FLAG_NO_CREATE);
                if (pi != null) {
                    alarmManager.cancel(pi);
                    pi.cancel();
                    cancelled++;
                }
            }

            Log.d(TAG, "Cancelled " + cancelled + " adhan alarms");
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("CANCEL_ALL_ERROR", "Failed to cancel all adhans: " + e.getMessage());
        }
    }

    /**
     * Immediately stop any currently playing adhan service.
     */
    @ReactMethod
    public void stopAdhan(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            // Simply stop the service — if running, onDestroy() cleans up media/wakelock.
            // Avoids startForegroundService() crash when service is not already running.
            context.stopService(new Intent(context, AdhanService.class));
            promise.resolve(true);
        } catch (Exception e) {
            // Service not running is not an error
            promise.resolve(true);
        }
    }
}
`;

// ─── Java: AdhanPackage (ReactPackage) ─────────────────────────────────────
const ADHAN_PACKAGE_JAVA = `package com.talukders.sukoon;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class AdhanPackage implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new AdhanModule(reactContext));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
`;

// ─── Plugin: Add permissions + service + receiver to AndroidManifest ───────
const withFullAdhanManifest = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const permissions = androidManifest.manifest['uses-permission'] || [];

    // Add FOREGROUND_SERVICE permission
    const addPermission = (name) => {
      const has = permissions.some((p) => p.$['android:name'] === name);
      if (!has) {
        permissions.push({ $: { 'android:name': name } });
      }
    };

    addPermission('android.permission.FOREGROUND_SERVICE');
    addPermission('android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK');
    addPermission('android.permission.WAKE_LOCK');

    androidManifest.manifest['uses-permission'] = permissions;

    // Add service and receiver to <application>
    const mainApplication = androidManifest.manifest.application?.[0];
    if (mainApplication) {
      // AdhanService
      const services = mainApplication.service || [];
      const hasService = services.some(
        (s) => s?.$?.['android:name'] === '.AdhanService'
      );
      if (!hasService) {
        const serviceEntry = {
          $: {
            'android:name': '.AdhanService',
            'android:exported': 'false',
          },
        };
        // Add foregroundServiceType for Android 10+ (API 29+)
        serviceEntry.$['android:foregroundServiceType'] = 'mediaPlayback';
        services.push(serviceEntry);
      }
      mainApplication.service = services;

      // AdhanAlarmReceiver
      const receivers = mainApplication.receiver || [];
      const hasReceiver = receivers.some(
        (r) => r?.$?.['android:name'] === '.AdhanAlarmReceiver'
      );
      if (!hasReceiver) {
        receivers.push({
          $: {
            'android:name': '.AdhanAlarmReceiver',
            'android:exported': 'false',
          },
        });
      }
      mainApplication.receiver = receivers;
    }

    return config;
  });
};

// ─── Plugin: Write Java files ──────────────────────────────────────────────
const withFullAdhanFiles = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const javaPath = path.join(
        projectRoot,
        'android', 'app', 'src', 'main', 'java',
        'com', 'talukders', 'sukoon'
      );

      if (!fs.existsSync(javaPath)) {
        fs.mkdirSync(javaPath, { recursive: true });
      }

      fs.writeFileSync(path.join(javaPath, 'AdhanService.java'), ADHAN_SERVICE_JAVA, 'utf-8');
      console.log('✅ Created AdhanService.java');

      fs.writeFileSync(path.join(javaPath, 'AdhanAlarmReceiver.java'), ADHAN_ALARM_RECEIVER_JAVA, 'utf-8');
      console.log('✅ Created AdhanAlarmReceiver.java');

      fs.writeFileSync(path.join(javaPath, 'AdhanModule.java'), ADHAN_MODULE_JAVA, 'utf-8');
      console.log('✅ Created AdhanModule.java');

      fs.writeFileSync(path.join(javaPath, 'AdhanPackage.java'), ADHAN_PACKAGE_JAVA, 'utf-8');
      console.log('✅ Created AdhanPackage.java');

      return config;
    },
  ]);
};

// ─── Plugin: Register AdhanPackage in MainApplication ──────────────────────
const withFullAdhanPackage = (config) => {
  return withMainApplication(config, (config) => {
    const { modResults } = config;
    let contents = modResults.contents;

    const isKotlin = contents.includes('fun getPackages()');

    if (isKotlin) {
      const ktImport = 'import com.talukders.sukoon.AdhanPackage';
      if (!contents.includes(ktImport)) {
        contents = contents.replace(
          /(import expo\.modules\.ReactNativeHostWrapper)/,
          `$1\n${ktImport}`
        );
      }

      const ktPackageAdd = 'packages.add(AdhanPackage())';
      if (!contents.includes(ktPackageAdd)) {
        contents = contents.replace(
          /(val packages = PackageList\(this\)\.packages)/,
          `$1\n            ${ktPackageAdd}`
        );
      }

      console.log('✅ Registered AdhanPackage in MainApplication.kt');
    } else {
      const javaImport = 'import com.talukders.sukoon.AdhanPackage;';
      if (!contents.includes(javaImport)) {
        contents = contents.replace(
          /(import com\.facebook\.react\.defaults\.DefaultReactNativeHost;)/,
          `$1\n${javaImport}`
        );
      }

      const javaPackageAdd = 'packages.add(new AdhanPackage());';
      if (!contents.includes(javaPackageAdd)) {
        contents = contents.replace(
          /(protected List<ReactPackage> getPackages\(\) {[\s\S]*?return packages;)/,
          (match) => match.replace(
            'return packages;',
            `          ${javaPackageAdd}\n          return packages;`
          )
        );
      }

      console.log('✅ Registered AdhanPackage in MainApplication.java');
    }

    modResults.contents = contents;
    return config;
  });
};

// ─── Main export ───────────────────────────────────────────────────────────
module.exports = function withFullAdhan(config) {
  config = withFullAdhanManifest(config);
  config = withFullAdhanFiles(config);
  config = withFullAdhanPackage(config);
  return config;
};
