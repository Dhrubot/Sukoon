// app.config.js
const edgeApiBaseUrl = process.env.EXPO_PUBLIC_EDGE_API_BASE_URL ?? null;
const edgeApiEnabled =
  edgeApiBaseUrl !== null &&
  edgeApiBaseUrl !== "" &&
  process.env.EXPO_PUBLIC_EDGE_API_ENABLED !== "false";
const perfValidationEnabled = process.env.EXPO_PUBLIC_PERF_VALIDATION_ENABLED === "true";
const notificationTraceEnabled = process.env.EXPO_PUBLIC_NOTIFICATION_TRACE_ENABLED === "true";

export default {
  expo: {
    name: "Sukoon",
    slug: "sukoon",
    scheme: "sukoon",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/icon.png",
      resizeMode: "contain",
      backgroundColor: "#00102a",
    },
    assetBundlePatterns: ["assets/**"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.talukders.sukoon",
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "Sukoon needs your location to calculate accurate prayer times for your area.",
        NSUserNotificationsUsageDescription:
          "Sukoon needs notification permission to remind you of prayer times.",
        UIBackgroundModes: ["audio"],
      },
      config: {
        googleMobileAds: {
          app_id: "ca-app-pub-5474984690525462~1671116769",
        },
      },
      jsEngine: "hermes",
      googleServicesFile: "./GoogleService-Info.plist",
    },
    android: {
      appBundles: true,
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#1A1F3A",  // Dark theme background
      },
      enableProguardInReleaseBuilds: true,
      enableShrinkResources: true,
      package: "com.talukders.sukoon",
      jsEngine: "hermes",
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "POST_NOTIFICATIONS",
        "VIBRATE",
        "RECEIVE_BOOT_COMPLETED",
        "SCHEDULE_EXACT_ALARM",
        "WAKE_LOCK",
        "ACCESS_NOTIFICATION_POLICY",
        "MODIFY_AUDIO_SETTINGS",
      ],
      blockedPermissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.USE_EXACT_ALARM",
      ],
      config: {
        googleMobileAds: {
          app_id: "ca-app-pub-5474984690525462~6816196886",
        },
      },
      googleServicesFile: "./google-services.json",
    },
    plugins: [
      "@react-native-firebase/app",
      "@react-native-firebase/crashlytics",
      "@react-native-firebase/perf",

      "./plugins/withModularHeaders.js",
      "./plugins/withNodePath.js",
      "./plugins/withAndroidImmersiveMode.js",
      "./plugins/withRingerMode.js",
      "./plugins/withFullAdhan.js",
      "./plugins/withWidget.js",
      "./plugins/withAndroidWidget.js",
      "./plugins/withLiveActivity.js",
      "./plugins/withBootReceiver.js",
      "expo-asset",
      [
        "expo-splash-screen",
        {
          image: "./assets/icon.png",
          resizeMode: "contain",
          backgroundColor: "#00102a",
          imageWidth: 180,
        }
      ],
      "expo-font",
      "expo-location",
      [
        "expo-audio",
        {
          microphonePermission: false,
          recordAudioAndroid: false,
          enableBackgroundPlayback: true,
        }
      ],
      "expo-secure-store",
      "expo-background-task",
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#2D8B6F",  // Warm sage primary color
          "sounds": [
            "./assets/sounds/adhan_short.ogg",
            "./assets/sounds/adhan_ios.caf",
            "./assets/sounds/adhan_full.mp3"
          ]
        }
      ],
      "./plugins/withPlatformSounds.js",
      [
        "react-native-google-mobile-ads",
        {
          androidAppId: "ca-app-pub-5474984690525462~6816196886",
          iosAppId: "ca-app-pub-5474984690525462~1671116769"
        },
      ],
      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 36,
            targetSdkVersion: 36,
            minSdkVersion: 24,
            kotlinVersion: "2.0.21",
          },
          ios: {
            deploymentTarget: "15.1",
          },
        },
      ],
    ],
    extra: {
      eas: {
        projectId: "1df4a37a-5211-4ef7-9a89-37d7ef2f8b52",
      },
      edgeApi: {
        baseUrl: edgeApiBaseUrl,
        enabled: edgeApiEnabled,
      },
      perfValidation: {
        enabled: perfValidationEnabled,
      },
      notificationTrace: {
        enabled: notificationTraceEnabled,
      },
      notificationSounds: [
        "./assets/sounds/adhan_short.ogg",
        "./assets/sounds/adhan_ios.caf",
        "./assets/sounds/adhan_full.mp3"
      ],
      "react-native-google-mobile-ads": {
        androidAppId: "ca-app-pub-5474984690525462~6816196886",
        iosAppId: "ca-app-pub-5474984690525462~1671116769"
      }
    },
  },
  "react-native-google-mobile-ads": {
    android_app_id: "ca-app-pub-5474984690525462~6816196886",
    ios_app_id: "ca-app-pub-5474984690525462~1671116769"
  }
};
