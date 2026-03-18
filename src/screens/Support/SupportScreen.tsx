import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import { AppTheme } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import logger from '../../utils/logger';
import IAPManager from '../../services/monetization/IAPManager';
import DonationService, { DONATION_TIERS } from '../../services/monetization/DonationService';

let donationsInitialized = false;

const SupportScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const ambientColors = [theme.colors.ambient.top, theme.colors.ambient.bottom] as const;
  const [isLoading, setIsLoading] = useState(!donationsInitialized);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    initializeDonations();
  }, []);

  const initializeDonations = async () => {
    try {
      if (!donationsInitialized) {
        setIsLoading(true);
        await IAPManager.initialize();
        await DonationService.initialize();
        donationsInitialized = true;
      }
    } catch (error) {
      logger.error('Failed to initialize donation flow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDonation = async (tierId: string) => {
    setIsProcessing(true);
    try {
      const success = await DonationService.makeDonation(tierId);
      if (success) {
        Alert.alert(
          'JazakAllah Khair',
          'May Allah accept your support. Giving is optional, and your donation helps us keep caring for Sukoon.',
          [{ text: 'Ameen' }]
        );
      }
    } catch (error) {
      logger.error('Donation error:', error);
      Alert.alert('Unable to Process Donation', 'Please try again in a moment.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={ambientColors} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
            <Text style={styles.loadingText}>Preparing donation options...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={ambientColors} style={styles.gradient}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Optional Support</Text>
            <Text style={styles.title}>Support Sukoon</Text>
            <Text style={styles.subtitle}>
              Sukoon is meant to serve prayer first. Giving is completely voluntary and helps us sustain the app with care.
            </Text>
          </View>

          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>A voluntary sadaqah</Text>
            <Text style={styles.noteText}>
              Donations help cover prayer-time infrastructure, quality improvements, and ongoing maintenance. Nothing in Sukoon is withheld if you do not give.
            </Text>
          </View>

          <View style={styles.tierList}>
            {DONATION_TIERS.map((tier) => (
              <TouchableOpacity
                key={tier.id}
                style={styles.tierCard}
                onPress={() => handleDonation(tier.id)}
                disabled={isProcessing}
                activeOpacity={0.8}
              >
                <View style={styles.tierHeader}>
                  <Text style={styles.tierEmoji}>{tier.emoji}</Text>
                  <View style={styles.tierCopy}>
                    <Text style={styles.tierTitle}>{tier.title}</Text>
                    <Text style={styles.tierDescription}>{tier.description}</Text>
                  </View>
                  <Text style={styles.tierAmount}>${tier.amount.toFixed(2)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },
    gradient: {
      flex: 1,
    },
    content: {
      padding: theme.spacing.xl,
      paddingBottom: theme.spacing['4xl'],
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    loadingText: {
      marginTop: theme.spacing.lg,
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
    },
    header: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xl,
    },
    eyebrow: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.muted,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    title: {
      fontSize: 24,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      lineHeight: 24,
    },
    noteCard: {
      backgroundColor: theme.colors.card.background,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border.secondary,
      padding: theme.spacing.xl,
      marginBottom: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    noteTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
    },
    noteText: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      lineHeight: 22,
    },
    tierList: {
      gap: theme.spacing.md,
    },
    tierCard: {
      backgroundColor: theme.colors.card.background,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border.secondary,
      padding: theme.spacing.xl,
    },
    tierHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    tierEmoji: {
      fontSize: 24,
    },
    tierCopy: {
      flex: 1,
      gap: 2,
    },
    tierTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
    },
    tierDescription: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
    },
    tierAmount: {
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.primary.DEFAULT,
    },
  });

export default SupportScreen;
