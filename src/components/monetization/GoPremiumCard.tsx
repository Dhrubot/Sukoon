// src/components/monetization/GoPremiumCard.tsx
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import { AppTheme } from '../../theme';

interface GoPremiumCardProps {
  onPress: () => void;
}

const GoPremiumCard: React.FC<GoPremiumCardProps> = ({ onPress }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <LinearGradient
        colors={[theme.colors.primary.dark, theme.colors.primary.DEFAULT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        {/* <View style={styles.content}>
          <Text style={styles.icon}>⭐</Text>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Unlock Premium</Text>
            <Text style={styles.subtitle}>
              Advanced stats, cloud backup, custom Adhan & more
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </View> */}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.xl,
    marginVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  icon: {
    fontSize: theme.typography.fontSize['4xl'],
    marginRight: theme.spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.primary.contrast,
    marginBottom: theme.spacing.xxs,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  arrow: {
    fontSize: theme.typography.fontSize['4xl'],
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.primary.contrast,
    marginLeft: theme.spacing.sm,
  },
});

export default React.memo(GoPremiumCard);
