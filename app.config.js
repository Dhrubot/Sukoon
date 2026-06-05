// app.config.js
const edgeApiBaseUrl = process.env.EXPO_PUBLIC_EDGE_API_BASE_URL ?? null;
const edgeApiEnabled =
  edgeApiBaseUrl !== null &&
  edgeApiBaseUrl !== "" &&
  process.env.EXPO_PUBLIC_EDGE_API_ENABLED !== "false";
const perfValidationEnabled = process.env.EXPO_PUBLIC_PERF_VALIDATION_ENABLED === "true";
const notificationTraceEnabled = process.env.EXPO_PUBLIC_NOTIFICATION_TRACE_ENABLED === "true";
const androidReleaseMinifyEnabled = process.env.ANDROID_ENABLE_MINIFY === "true";
const androidReleaseShrinkResourcesEnabled = process.env.ANDROID_ENABLE_SHRINK_RESOURCES === "true";

export default {
  expo: {
    name: "Sukoon",
    slug: "sukoon",
    scheme: "sukoon",
    version: "1.1.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash-logo.png",
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
      jsEngine: "hermes",
      googleServicesFile: "./GoogleService-Info.plist",
    },
    android: {
      appBundles: true,
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#1A1F3A",  // Dark theme background
      },
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
        // Pulled in transitively by expo-sensors (pedometer APIs we don't use).
        // Sukoon has no Health features — strip to avoid Play Console Health policy review.
        "android.permission.ACTIVITY_RECOGNITION",
      ],
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
          image: "./assets/splash-logo.png",
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
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 36,
            targetSdkVersion: 36,
            minSdkVersion: 24,
            kotlinVersion: "2.0.21",
            enableMinifyInReleaseBuilds: androidReleaseMinifyEnabled,
            enableShrinkResourcesInReleaseBuilds: androidReleaseShrinkResourcesEnabled,
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
      supportEmail: "codifizz@gmail.com",
      privacyPolicyUrl: "https://dhrubot.github.io/Sukoon/privacy.html",
    },
  },
};
