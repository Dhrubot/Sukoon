// app.config.js
export default {
  expo: {
    name: "Sukoon",
    slug: "sukoon",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/icon.png",
      resizeMode: "contain",
      backgroundColor: "#4b5b77ff",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.talukders.sukoon",
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "Sukoon needs your location to calculate accurate prayer times for your area.",
        NSUserNotificationsUsageDescription:
          "Sukoon needs notification permission to remind you of prayer times.",
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
        "VIBRATE",
        "RECEIVE_BOOT_COMPLETED",
        "WAKE_LOCK",
        "ACCESS_NOTIFICATION_POLICY",
        "MODIFY_AUDIO_SETTINGS",
        "android.permission.PACKAGE_USAGE_STATS",
      ],
      config: {
        googleMobileAds: {
          app_id: "ca-app-pub-5474984690525462~6816196886",
        },
      },
      googleServicesFile: "./google-services.json",
    },
    plugins: [
      "@react-native-firebase/app" ,
      "./plugins/withUsageStats.js",
      "./plugins/withModularHeaders.js",
      "./plugins/withAndroidIapFlavor.js",
      "./plugins/withNodePath.js",
      "./plugins/withRingerMode.js",
      "./plugins/withWidget.js",
      "./plugins/withAndroidWidget.js",
      "expo-location",
      "expo-audio",
      "expo-secure-store",
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#2D8B6F",  // Warm sage primary color
          "sounds": [
            "./assets/sounds/adhan_short.wav",
            "./assets/sounds/adhan_full.mp3"
          ]
        }
      ],
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
            newArchEnabled: true,
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            minSdkVersion: 24,
          },
          ios: {
            newArchEnabled: true,
            deploymentTarget: "15.1",
            useFrameworks: "static",
          },
        },
      ],
    ],
    extra: {
      eas: {
        projectId: "1df4a37a-5211-4ef7-9a89-37d7ef2f8b52",
      },
      "react-native-google-mobile-ads": {
        androidAppId: "ca-app-pub-5474984690525462~6816196886",
        iosAppId: "ca-app-pub-5474984690525462~1671116769"
      }
    },
  },
  "react-native-google-mobile-ads": {
    androidAppId: "ca-app-pub-5474984690525462~6816196886",
    iosAppId: "ca-app-pub-5474984690525462~1671116769"
  }
};
