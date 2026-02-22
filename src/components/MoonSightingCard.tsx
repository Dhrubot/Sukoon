// src/components/MoonSightingCard.tsx
// Small themed card shown on HomeScreen when the user previously tapped
// "Not yet" on the moon sighting prompt. Allows re-triggering the modal.

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { AppTheme } from '../theme';

interface MoonSightingCardProps {
  title: string;
  onPress: () => void;
}

const MoonSightingCard: React.FC<MoonSightingCardProps> = ({ title, onPress }) => {
  const styles = useThemedStyles(createStyles);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.emoji}>🌙</Text>
      <View style={styles.textContainer}>
        <Text style={styles.title}>Moon Sighting Update</Text>
        <Text style={styles.subtitle}>
          Tap to confirm when the crescent for {title} is sighted
        </Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card.background,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.md + 2,
      paddingHorizontal: theme.spacing.lg,
      marginHorizontal: theme.spacing.xl,
      marginBottom: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    emoji: {
      fontSize: theme.typography.fontSize['2xl'],
      marginRight: theme.spacing.md - 2,
    },
    textContainer: {
      flex: 1,
    },
    title: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xxs,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.muted,
      lineHeight: 17,
    },
    arrow: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: '300',
      color: theme.colors.text.muted,
      marginLeft: theme.spacing.sm,
    },
  });

export default MoonSightingCard;
