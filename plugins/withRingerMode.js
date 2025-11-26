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
import android.media.AudioManager;
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

    androidManifest.manifest['uses-permission'] = permissions;
    
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
