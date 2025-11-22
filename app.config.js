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
      image: "./assets/crescent.png",
      resizeMode: "contain",
      backgroundColor: "#1B5E3F",
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
      jsEngine: "hermes"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/crescent.png",
        backgroundColor: "#1B5E3F",
      },
      package: "com.talukders.sukoon",
      jsEngine: "hermes",
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "VIBRATE",
        "RECEIVE_BOOT_COMPLETED",
        "WAKE_LOCK",
        "android.permission.PACKAGE_USAGE_STATS",
      ],
      config: {
        googleMobileAds: {
          app_id: "ca-app-pub-5474984690525462~6816196886",
        },
      }
    },
    plugins: [
      "./plugins/withUsageStats.js",
      "./plugins/withModularHeaders.js",
      "./plugins/withAndroidIapFlavor.js",
      "./plugins/withNodePath.js",
      "expo-location",
      "expo-audio",
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#1B5E3F",
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
            deploymentTarget: "13.4",
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
