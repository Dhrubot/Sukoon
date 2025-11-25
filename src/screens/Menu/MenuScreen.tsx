// src/screens/Menu/MenuScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../providers/ThemeProvider';

interface MenuItem {
  icon: string;
  title: string;
  subtitle: string;
  screen: string;
}

const menuItems: MenuItem[] = [
  {
    icon: '🏆',
    title: 'Achievements',
    subtitle: 'Track your spiritual milestones',
    screen: 'Achievements',
  },
  {
    icon: '📱',
    title: 'Digital Wellness',
    subtitle: 'Monitor your screen time',
    screen: 'DigitalWellness',
  },
  {
    icon: '💚',
    title: 'Support Us',
    subtitle: 'Help keep this app ad-free',
    screen: 'Support',
  },
  {
    icon: '⚙️',
    title: 'Settings',
    subtitle: 'Customize your experience',
    screen: 'Settings',
  },
];

const MenuScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();

  const handleItemPress = (screen: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(screen as never);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.card.background }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>More</Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.text.secondary }]}>
          Explore more features
        </Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={[styles.menuItem, { backgroundColor: theme.colors.card.background, borderBottomColor: theme.colors.border.primary }]}
            onPress={() => handleItemPress(item.screen)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.card.hover }]}>
              <Text style={styles.icon}>{item.icon}</Text>
            </View>
            
            <View style={styles.textContainer}>
              <Text style={[styles.itemTitle, { color: theme.colors.text.primary }]}>
                {item.title}
              </Text>
              <Text style={[styles.itemSubtitle, { color: theme.colors.text.secondary }]}>
                {item.subtitle}
              </Text>
            </View>

            <Text style={[styles.chevron, { color: theme.colors.text.muted }]}>›</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.appInfo}>
          <Text style={[styles.appVersion, { color: theme.colors.text.muted }]}>
            Sukoon v1.0.0
          </Text>
          <Text style={[styles.blessing, { color: theme.colors.text.muted }]}>
            May Allah accept our efforts 🤲
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  icon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 13,
  },
  chevron: {
    fontSize: 28,
    fontWeight: '300',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  appVersion: {
    fontSize: 13,
    marginBottom: 8,
  },
  blessing: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});

export default MenuScreen;