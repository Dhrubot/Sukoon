import React, { useEffect, useState, createRef } from "react";
import { StatusBar } from "expo-status-bar";
import {
  NavigationContainer,
  NavigationContainerRef,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  View,
  Text,
  ActivityIndicator,
  Modal,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as SplashScreen from 'expo-splash-screen';

// Services
import StorageService from "./src/services/StorageService";
import NotificationService from "./src/services/NotificationService";
import PrayerTimeService from "./src/services/PrayerTimeService";
import LocationService from "./src/services/LocationService";

// Import SubscriptionService
const SubscriptionService = Platform.select({
  web: () => require("./src/services/SubscriptionService.web").default,
  default: () => require("./src/services/SubscriptionService").default,
})();

// Import AdService based on platform
const AdService = Platform.select({
  web: () => require("./src/services/AdService.web").default,
  default: () => require("./src/services/AdService").default,
})();

// Import DonationService based on platform
const DonationService = Platform.select({
  web: () => require("./src/services/DonationService.web").default,
  default: () => require("./src/services/DonationService").default,
})();

// Import FamilySharingService based on platform
const FamilySharingService = Platform.select({
  web: () => require("./src/services/FamilySharingService.web").default,
  default: () => require("./src/services/FamilySharingService").default,
})();

// Screens
import HomeScreen from "./src/screens/Home/HomeScreen";
import StatsScreen from "./src/screens/Stats/StatsScreen";
import SettingsScreen from "./src/screens/Settings/SettingsScreen";
import MindfulnessFlow from "./src/screens/Mindfulness/MindfulnessFlow";
import OnboardingScreen from "./src/screens/Onboarding/OnboardingScreen";
import SupportScreen from "./src/screens/Support/SupportScreen";
// import ProfileScreen from './src/screens/Profile/ProfileScreen';
// import FamilyScreen from './src/screens/Family/FamilyScreen';

// Store
import { useStore } from "./src/store/useStore";

// Types
import { Location as LocationType, PrayerName } from "./src/types";
import AchievementsScreen from "./src/screens/Achievements/AchievementsScreen";
import DigitalWellnessScreen from "./src/screens/DigitalWellness/DigitalWellnessScreen";

// Keep the splash screen visible
SplashScreen.preventAutoHideAsync();

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Create navigation reference
export const navigationRef = createRef<NavigationContainerRef<any>>();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [locationInputError, setLocationInputError] = useState("");

  const { setUserSettings, setLocation } = useStore();

  useEffect(() => {
    initializeApp();
  }, []);

  // Register navigation handler for notifications
  useEffect(() => {
    const handleNotificationNavigation = (
      prayer: PrayerName,
      action: string
    ) => {
      console.log(
        `Handling notification action: ${action} for prayer: ${prayer}`
      );

      if (navigationRef.current?.isReady()) {
        switch (action) {
          case "complete":
            // Navigate to home and mark prayer complete
            navigationRef.current.navigate("MainTabs", {
              screen: "Home",
              params: { markPrayerComplete: prayer },
            });
            break;
          case "prepare":
            // Navigate to mindfulness flow
            navigationRef.current.navigate("MindfulnessFlow", {
              prayer: prayer,
            });
            break;
          default:
            // Just navigate to the main app
            navigationRef.current.navigate("MainTabs");
            break;
        }
      }
    };

    // Register the handler with NotificationService
    NotificationService.registerNavigationHandler(handleNotificationNavigation);
  }, []);

  useEffect(() => {
    const initializeMonetization = async () => {
      console.log("Initializing services...");
      try {
        // Initialize subscription service
        await SubscriptionService.initialize();
        console.log("SubscriptionService initialized");

        // Initialize ad service
        await AdService.initialize();
        console.log("AdService initialized");

        // Initialize donation service
        await DonationService.initialize();
        console.log("DonationService initialized");

        // Initialize family sharing service
        await FamilySharingService.initialize();
        console.log("FamilySharingService initialized");
      } catch (error) {
        console.error("Error initializing services:", error);
      }
    };

    initializeMonetization();

    return () => {
      console.log("Cleaning up services...");
      SubscriptionService.cleanup();
      AdService.cleanup();
      DonationService.cleanup();
      FamilySharingService.cleanup();
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Check if first launch
      const firstLaunch = StorageService.isFirstLaunch();
      setIsFirstLaunch(firstLaunch);

      // Load saved settings or create defaults
      let settings = StorageService.getUserSettings();
      if (!settings) {
        settings = StorageService.getDefaultSettings();
        StorageService.setUserSettings(settings);
      }
      setUserSettings(settings);

      // Only request location if we don't already have it stored
      let userLocation = settings.location;
      if (!LocationService.hasSavedLocation()) {
        console.log("No saved location found, requesting new location...");
        const newLocation = await LocationService.getCurrentLocation();

        if (newLocation) {
          userLocation = newLocation;
          settings.location = userLocation;
          StorageService.updateUserSettings({ location: userLocation });
          setLocation(userLocation);
        } else {
          // Show location modal if automatic location detection failed
          setShowLocationModal(true);
        }
      } else {
        console.log("Using saved location:", userLocation);
        setLocation(userLocation);
      }

      // Initialize notifications
      await NotificationService.initialize();

      // Only fetch prayer times if needed
      if (userLocation) {
        // Check if we need to refresh prayer times (e.g., if it's a new day)
        const shouldRefreshPrayerTimes = await shouldRefreshPrayers(
          userLocation,
          settings.calculationMethod
        );

        if (shouldRefreshPrayerTimes) {
          console.log("Refreshing prayer times...");
          await PrayerTimeService.getPrayerTimesList(
            userLocation,
            new Date(),
            settings.calculationMethod
          );
        } else {
          console.log("Using cached prayer times");
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error initializing app:", error);
      setIsLoading(false);
    } finally {
      // Hide the splash screen
      await SplashScreen.hideAsync();
    }
  };

  // Helper function to determine if we should refresh prayer times
  const shouldRefreshPrayers = async (
    location: LocationType,
    method: string
  ): Promise<boolean> => {
    try {
      // Get today's date in YYYY-MM-DD format for the cache key
      const today = new Date();
      const dateStr = today.toISOString().split("T")[0];

      // Create a storage key for the prayer times refresh timestamp
      const refreshKey = `lastPrayerRefresh_${location.latitude.toFixed(
        4
      )}_${location.longitude.toFixed(4)}_${dateStr}_${method}`;

      // Check when we last refreshed prayer times
      const lastRefresh = StorageService.getValue(refreshKey);

      if (!lastRefresh) {
        // No refresh timestamp, so we should refresh
        // Save current time as last refresh
        StorageService.setValue(refreshKey, Date.now().toString());
        return true;
      }

      // Check if it's been more than 12 hours since last refresh
      const lastRefreshTime = parseInt(lastRefresh, 10);
      const twelveHoursMs = 12 * 60 * 60 * 1000;

      if (Date.now() - lastRefreshTime > twelveHoursMs) {
        // More than 12 hours, refresh
        StorageService.setValue(refreshKey, Date.now().toString());
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error checking if prayer times should refresh:", error);
      return true; // Refresh to be safe
    }
  };

  const handleManualLocation = async () => {
    setLocationInputError("");

    setIsLoading(true);

    try {
      let locationData: LocationType | null = null;

      if (city && country) {
        // Use city and country
        locationData = await LocationService.setLocationByAddress(
          city,
          country
        );
      } else if (postalCode && country) {
        // Use postal code and country
        locationData = await LocationService.setLocationByPostalCode(
          postalCode,
          country
        );
      } else {
        setLocationInputError(
          "Please enter either city and country, or postal code and country."
        );
        setIsLoading(false);
        return;
      }

      if (locationData) {
        setShowLocationModal(false);
        setLocation(locationData);
      } else {
        setLocationInputError(
          "Could not find location. Please check your input and try again."
        );
      }
    } catch (error) {
      console.error("Error setting manual location:", error);
      setLocationInputError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1B5E3F" />
        <Text style={{ marginTop: 20, fontSize: 16 }}>
          Preparing your prayer companion...
        </Text>
      </View>
    );
  }

  if (isFirstLaunch) {
    return <OnboardingScreen onComplete={() => setIsFirstLaunch(false)} />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <StatusBar style="auto" />

        {/* Manual location input modal */}
        <Modal
          visible={showLocationModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowLocationModal(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Set Your Location</Text>
              <Text style={styles.modalSubtitle}>
                To provide accurate prayer times, we need your location.
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Enter city name"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Country</Text>
                <TextInput
                  style={styles.input}
                  value={country}
                  onChangeText={setCountry}
                  placeholder="Enter country name"
                  placeholderTextColor="#999"
                />
              </View>

              <Text style={styles.modalSubtitle}>OR</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Postal/Zip Code</Text>
                <TextInput
                  style={styles.input}
                  value={postalCode}
                  onChangeText={setPostalCode}
                  placeholder="Enter postal code"
                  placeholderTextColor="#999"
                />
              </View>

              {locationInputError ? (
                <Text style={styles.errorText}>{locationInputError}</Text>
              ) : null}

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.submitButton]}
                  onPress={handleManualLocation}
                >
                  <Text style={styles.buttonText}>Set Location</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.noteText}>
                Note: Enter either a city or postal code. Country is required
                for better accuracy.
              </Text>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen
            name="MindfulnessFlow"
            component={MindfulnessFlow}
            options={{ presentation: "modal" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#1B5E3F",
        tabBarInactiveTintColor: "#757575",
        headerShown: false,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: "#E0E0E0",
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Prayer Times",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🕌</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarLabel: "Progress",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>📊</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Achievements"
        component={AchievementsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size }}>🏆</Text>
          ),
        }}
      />
      <Tab.Screen
        name="DigitalWellness"
        component={DigitalWellnessScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size }}>📱</Text>
          ),
          tabBarLabel: "Digital",
        }}
      />
      <Tab.Screen
        name="Support"
        component={SupportScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>💚</Text>
          ),
          tabBarLabel: "Support",
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>⚙️</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    width: "90%",
    maxWidth: 500,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1B5E3F",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  button: {
    borderRadius: 5,
    padding: 12,
    minWidth: 120,
    alignItems: "center",
  },
  submitButton: {
    backgroundColor: "#1B5E3F",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    color: "red",
    marginBottom: 10,
    textAlign: "center",
  },
  noteText: {
    fontSize: 12,
    color: "#666",
    marginTop: 15,
    textAlign: "center",
    fontStyle: "italic",
  },
});
