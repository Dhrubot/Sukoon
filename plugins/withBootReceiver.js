// plugins/withBootReceiver.js
// Expo config plugin: adds a BOOT_COMPLETED BroadcastReceiver on Android.
// When the device reboots, all scheduled notifications are cleared by the OS.
// This receiver triggers a WorkManager one-time task to reschedule them.

const {
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
} = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');
const { registerAndroidPackageInMainApplication } = require('./withAndroidPackageRegistration');

const PKG = 'com.talukders.sukoon';
const JAVA_PATH_SEGMENTS = ['android', 'app', 'src', 'main', 'java', 'com', 'talukders', 'sukoon'];
const HEADLESS_BOOT_TASK_NAME = 'BOOT_NOTIFICATION_RESCHEDULE_TASK';

// ─────────────────────────────────────────────
// JAVA: BootReceiver — triggers WorkManager on BOOT_COMPLETED
// ─────────────────────────────────────────────

const BOOT_RECEIVER_JAVA = `package ${PKG};

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;

/**
 * Receives BOOT_COMPLETED broadcast and enqueues notification rescheduling.
 * Android clears all scheduled notifications on reboot, so we must reschedule.
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "SukoonBootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            Log.i(TAG, "Device rebooted — enqueuing notification reschedule");
            try {
                OneTimeWorkRequest rescheduleWork =
                    new OneTimeWorkRequest.Builder(NotificationRescheduleWorker.class)
                        .build();
                WorkManager.getInstance(context).enqueue(rescheduleWork);
            } catch (Exception e) {
                Log.e(TAG, "Failed to enqueue reschedule work", e);
            }
        }
    }
}
`;

// ─────────────────────────────────────────────
// JAVA: WorkManager Worker — sets a flag that the JS layer picks up on next launch
// ─────────────────────────────────────────────

const WORKER_JAVA = `package ${PKG};

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

import com.facebook.react.HeadlessJsTaskService;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

/**
 * WorkManager Worker that flags notifications as needing reschedule.
 * The JS layer (useNotificationRescheduler) checks this flag on app launch
 * and triggers a full reschedule via NotificationService.
 */
public class NotificationRescheduleWorker extends Worker {
    private static final String TAG = "SukoonRescheduleWorker";
    private static final String PREFS_NAME = "sukoon_boot_prefs";
    private static final String KEY_NEEDS_RESCHEDULE = "needs_notification_reschedule";

    public NotificationRescheduleWorker(
        @NonNull Context context,
        @NonNull WorkerParameters params
    ) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Log.i(TAG, "Setting reschedule flag and starting headless boot reschedule");
        try {
            SharedPreferences prefs = getApplicationContext()
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putBoolean(KEY_NEEDS_RESCHEDULE, true).apply();

            Intent serviceIntent = new Intent(getApplicationContext(), BootNotificationRescheduleTaskService.class);
            serviceIntent.putExtra("trigger", "boot_completed");
            HeadlessJsTaskService.acquireWakeLockNow(getApplicationContext());
            getApplicationContext().startService(serviceIntent);

            return Result.success();
        } catch (Exception e) {
            Log.e(TAG, "Failed to set reschedule flag", e);
            return Result.failure();
        }
    }
}
`;

// ─────────────────────────────────────────────
// JAVA: BootPrefsModule — NativeModule bridge to read/clear the reschedule flag from JS
// ─────────────────────────────────────────────

const BOOT_PREFS_MODULE_JAVA = `package ${PKG};

import android.content.Context;
import android.content.SharedPreferences;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

/**
 * NativeModule that lets JS read (and clear) the boot-reschedule flag
 * set by NotificationRescheduleWorker after BOOT_COMPLETED.
 *
 * Also provides a cross-process scheduling lock backed by SharedPreferences,
 * which is safe across Android processes (unlike MMKV which is process-local).
 */
public class BootPrefsModule extends ReactContextBaseJavaModule {
    private static final String PREFS_NAME = "sukoon_boot_prefs";
    private static final String KEY_NEEDS_RESCHEDULE = "needs_notification_reschedule";

    // Lock stored in a separate SharedPreferences file for cleanliness
    private static final String LOCK_PREFS_NAME = "sukoon_lock_prefs";
    private static final String KEY_SCHEDULE_LOCK = "notification_schedule_lock_until_ms";

    public BootPrefsModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "BootPrefsModule";
    }

    @ReactMethod
    public void getAndClearBootRescheduleFlag(Promise promise) {
        try {
            SharedPreferences prefs = getReactApplicationContext()
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            boolean needsReschedule = prefs.getBoolean(KEY_NEEDS_RESCHEDULE, false);
            if (needsReschedule) {
                prefs.edit().putBoolean(KEY_NEEDS_RESCHEDULE, false).apply();
            }
            promise.resolve(needsReschedule);
        } catch (Exception e) {
            promise.reject("BOOT_PREFS_ERROR", e.getMessage(), e);
        }
    }

    @ReactMethod
    public void clearBootRescheduleFlag(Promise promise) {
        try {
            SharedPreferences prefs = getReactApplicationContext()
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putBoolean(KEY_NEEDS_RESCHEDULE, false).apply();
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("BOOT_PREFS_ERROR", e.getMessage(), e);
        }
    }

    /**
     * Atomically acquire a cross-process scheduling lock.
     *
     * Stores the lock expiry timestamp (epoch ms = now + timeoutMs) in
     * SharedPreferences using commit() for synchronous, cross-process-safe writes.
     *
     * @param timeoutMs  Lock duration in milliseconds (passed from JS as Double).
     * @param promise    Resolves true if newly acquired; false if a non-expired
     *                   lock is already held by another process/caller.
     */
    @ReactMethod
    public void acquireScheduleLock(double timeoutMs, Promise promise) {
        try {
            SharedPreferences prefs = getReactApplicationContext()
                .getSharedPreferences(LOCK_PREFS_NAME, Context.MODE_PRIVATE);
            long now = System.currentTimeMillis();
            long existingExpiry = prefs.getLong(KEY_SCHEDULE_LOCK, 0L);
            if (existingExpiry > 0 && now < existingExpiry) {
                // A non-expired lock is held — cannot acquire
                promise.resolve(false);
                return;
            }
            // Lock is absent or stale — write new expiry with commit() (synchronous)
            long newExpiry = now + (long) timeoutMs;
            prefs.edit().putLong(KEY_SCHEDULE_LOCK, newExpiry).commit();
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("SCHEDULE_LOCK_ERROR", e.getMessage(), e);
        }
    }

    /**
     * Release the cross-process scheduling lock.
     * Uses commit() to ensure the release is immediately visible to other processes.
     *
     * @param promise  Resolves when the lock key has been removed.
     */
    @ReactMethod
    public void releaseScheduleLock(Promise promise) {
        try {
            getReactApplicationContext()
                .getSharedPreferences(LOCK_PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .remove(KEY_SCHEDULE_LOCK)
                .commit();
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("SCHEDULE_LOCK_ERROR", e.getMessage(), e);
        }
    }
}
`;

const BOOT_HEADLESS_TASK_SERVICE_JAVA = `package ${PKG};

import android.content.Intent;
import android.os.Bundle;

import androidx.annotation.Nullable;

import com.facebook.react.HeadlessJsTaskService;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.jstasks.HeadlessJsTaskConfig;

public class BootNotificationRescheduleTaskService extends HeadlessJsTaskService {
    @Override
    protected @Nullable HeadlessJsTaskConfig getTaskConfig(Intent intent) {
        Bundle extras = intent != null && intent.getExtras() != null
            ? intent.getExtras()
            : new Bundle();

        return new HeadlessJsTaskConfig(
            "${HEADLESS_BOOT_TASK_NAME}",
            Arguments.fromBundle(extras),
            60000,
            true
        );
    }
}
`;

const BOOT_PREFS_PACKAGE_JAVA = `package ${PKG};

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class BootPrefsPackage implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new BootPrefsModule(reactContext));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
`;

// ─────────────────────────────────────────────
// Plugin: write Java files + update AndroidManifest
// ─────────────────────────────────────────────

function withBootReceiverJava(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const javaDir = path.join(cfg.modRequest.platformProjectRoot, ...JAVA_PATH_SEGMENTS.slice(1));
      fs.mkdirSync(javaDir, { recursive: true });

      fs.writeFileSync(path.join(javaDir, 'BootReceiver.java'), BOOT_RECEIVER_JAVA.trim());
      fs.writeFileSync(path.join(javaDir, 'NotificationRescheduleWorker.java'), WORKER_JAVA.trim());
      fs.writeFileSync(path.join(javaDir, 'BootPrefsModule.java'), BOOT_PREFS_MODULE_JAVA.trim());
      fs.writeFileSync(path.join(javaDir, 'BootPrefsPackage.java'), BOOT_PREFS_PACKAGE_JAVA.trim());
      fs.writeFileSync(path.join(javaDir, 'BootNotificationRescheduleTaskService.java'), BOOT_HEADLESS_TASK_SERVICE_JAVA.trim());

      return cfg;
    },
  ]);
}

function withBootPrefsPackage(config) {
  return withMainApplication(config, (cfg) => {
    cfg.modResults.contents = registerAndroidPackageInMainApplication(
      cfg.modResults.contents,
      'BootPrefsPackage'
    );
    console.log('✅ Registered BootPrefsPackage in MainApplication');
    return cfg;
  });
}

function withBootReceiverManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const application = manifest.manifest.application?.[0];
    if (!application) return cfg;

    // Add RECEIVE_BOOT_COMPLETED permission
    if (!manifest.manifest['uses-permission']) {
      manifest.manifest['uses-permission'] = [];
    }
    const hasBootPerm = manifest.manifest['uses-permission'].some(
      (p) => p.$?.['android:name'] === 'android.permission.RECEIVE_BOOT_COMPLETED'
    );
    if (!hasBootPerm) {
      manifest.manifest['uses-permission'].push({
        $: { 'android:name': 'android.permission.RECEIVE_BOOT_COMPLETED' },
      });
    }

    // Add the BroadcastReceiver
    if (!application.receiver) {
      application.receiver = [];
    }
    const hasReceiver = application.receiver.some(
      (r) => r.$?.['android:name'] === `.BootReceiver`
    );
    if (!hasReceiver) {
      application.receiver.push({
        $: {
          'android:name': '.BootReceiver',
          'android:exported': 'true',
          'android:enabled': 'true',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } }],
          },
        ],
      });
    }

    if (!application.service) {
      application.service = [];
    }
    const hasHeadlessService = application.service.some(
      (service) => service.$?.['android:name'] === '.BootNotificationRescheduleTaskService'
    );
    if (!hasHeadlessService) {
      application.service.push({
        $: {
          'android:name': '.BootNotificationRescheduleTaskService',
          'android:exported': 'false',
        },
      });
    }

    return cfg;
  });
}

function withWorkManagerDependency(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const buildGradlePath = path.join(
        cfg.modRequest.platformProjectRoot, 'app', 'build.gradle'
      );
      if (fs.existsSync(buildGradlePath)) {
        let buildGradle = fs.readFileSync(buildGradlePath, 'utf-8');
        if (!buildGradle.includes('androidx.work:work-runtime')) {
          buildGradle = buildGradle.replace(
            /dependencies\s*\{/,
            'dependencies {\n    implementation "androidx.work:work-runtime:2.9.1"\n    // Guava needed on compile classpath for WorkManager\'s ListenableFuture\n    implementation "com.google.guava:guava:33.0.0-android"'
          );
        }
        fs.writeFileSync(buildGradlePath, buildGradle);
      }
      return cfg;
    },
  ]);
}

module.exports = function withBootReceiver(config) {
  config = withBootReceiverJava(config);
  config = withBootReceiverManifest(config);
  config = withWorkManagerDependency(config);
  config = withBootPrefsPackage(config);
  return config;
};
