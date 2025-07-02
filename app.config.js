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
        image: "./assets/splash-icon.png",
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
            app_id: "ca-app-pub-3940256099942544~3347511713",
          },
        },
        jsEngine: "hermes"
      },
      android: {
        adaptiveIcon: {
          foregroundImage: "./assets/adaptive-icon.png",
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
            app_id: "ca-app-pub-3940256099942544~3347511713",
          },
        }
      },
      plugins: [
        "./plugins/withUsageStats.js",
        "./plugins/withModularHeaders.js",
        "./plugins/withAndroidIapFlavor.js",
        "./plugins/withNodePath.js",
        "expo-notifications",
        "expo-location",
        [
          "react-native-google-mobile-ads",
          {
            android_app_id: "ca-app-pub-3940256099942544~3347511713",
            ios_app_id: "ca-app-pub-3940256099942544~3347511713"
          },
        ],
      ],
      extra: {
        eas: {
          projectId: "talukders-sukoon-id",
        },
      },
    },
  };
  