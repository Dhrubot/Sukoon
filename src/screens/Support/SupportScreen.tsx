import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import { AppTheme } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import logger from '../../utils/logger';

// Services
import IAPManager from '../../services/monetization/IAPManager';
import SubscriptionService from '../../services/monetization/SubscriptionService';
import AdService from '../../services/monetization/AdService';
import DonationService, { DONATION_TIERS } from '../../services/monetization/DonationService';
import StorageService from '../../services/StorageService';
import AnalyticsService from '../../services/AnalyticsService';

// Types
import { SubscriptionPlan } from '../../types';

const { width } = Dimensions.get('window');

// Module-level flag: services only need to be initialized once per app session
let servicesInitialized = false;

const SupportScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [isLoading, setIsLoading] = useState(!servicesInitialized);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [canWatchAd, setCanWatchAd] = useState(false);
  const [hoursUntilNextAd, setHoursUntilNextAd] = useState(0);
  // TODO: Re-enable 'subscription' as default once we have premium features ready
  const [selectedTab, setSelectedTab] = useState<'subscription' | 'watch' | 'donate'>('watch');

  const handleTabChange = (tab: 'subscription' | 'watch' | 'donate') => {
    setSelectedTab(tab);
    AnalyticsService.logEvent('premium_card_tapped', { tab });
  };
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    initializeServices();
  }, []);

  const initializeServices = async () => {
    try {
      // Only run heavy initialization once per app session
      if (!servicesInitialized) {
        setIsLoading(true);
        // IAPManager must be initialized first — owns the single IAP connection + listener
        await IAPManager.initialize();
        await SubscriptionService.initialize();
        await AdService.initialize();
        await DonationService.initialize();
        servicesInitialized = true;
      }

      // Always refresh status on mount (lightweight)
      const hasSubscription = await SubscriptionService.checkSubscriptionStatus();
      if (hasSubscription) {
        setCurrentPlan(SubscriptionService.getCurrentSubscription());
      }

      const canShow = await AdService.canShowAd();
      setCanWatchAd(canShow);
      setHoursUntilNextAd(AdService.getHoursUntilNextAd());
    } catch (error) {
      logger.error('Failed to initialize support services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async (planType: 'monthly' | 'yearly' | 'lifetime') => {
    setIsProcessing(true);
    try {
      await SubscriptionService.purchaseSubscription(planType);
      Alert.alert('Success!', 'Thank you for your support! Premium features are now active.');
      await initializeServices();
    } catch (error: any) {
      if (error.code !== 'E_USER_CANCELLED') {
        Alert.alert('Error', 'Failed to complete purchase. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWatchAd = async () => {
    setIsProcessing(true);
    try {
      const success = await AdService.showRewardedAd();
      if (success) {
        Alert.alert(
          'JazakAllah Khair!',
          'Your support helps keep Sukoon free for the Ummah. May Allah reward your generosity.',
          [{ text: 'Alhamdulillah' }]
        );
        await initializeServices();
      } else {
        Alert.alert('Ad Not Ready', 'Please try again in a moment.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to show ad. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDonation = async (tierId: string) => {
    setIsProcessing(true);
    try {
      const success = await DonationService.makeDonation(tierId);
      if (success) {
        Alert.alert(
          'JazakAllah Khair!',
          'May Allah reward your generosity. Your support helps us continue developing.',
          [{ text: 'Ameen' }]
        );
      }
    } catch (error) {
      logger.error('Donation error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // const renderSubscriptionTab = () => (
  //   <ScrollView showsVerticalScrollIndicator={false}>
  //     <View style={styles.introCard}>
  //       <Text style={styles.introTitle}>Premium Features</Text>
  //       <Text style={styles.introText}>
  //         Unlock advanced features while supporting continued development
  //       </Text>
  //     </View>

  //     {/* Features List */}
  //     <View style={styles.featuresContainer}>
  //       <Text style={styles.featuresTitle}>What's Included:</Text>
        
  //       {[
  //         { icon: '👨‍👩‍👧‍👦', text: 'Family Sharing - Track family prayers together' },
  //         { icon: '📊', text: 'Advanced Analytics & Insights' },
  //         { icon: '☁️', text: 'Cloud Backup & Sync' },
  //         { icon: '🔊', text: '30+ Premium Notification Sounds' },
  //         { icon: '📤', text: 'Export Prayer Data' },
  //         { icon: '🎨', text: 'Custom Themes & Colors' },
  //         { icon: '🕋', text: 'Qibla Compass with AR' },
  //         { icon: '📖', text: 'Extended Dua Library' },
  //         { icon: '🔄', text: 'Unlimited History' },
  //       ].map((feature, index) => (
  //         <View key={index} style={styles.featureRow}>
  //           <Text style={styles.featureIcon}>{feature.icon}</Text>
  //           <Text style={styles.featureText}>{feature.text}</Text>
  //         </View>
  //       ))}
  //     </View>

  //     {/* Subscription Plans */}
  //     <View style={styles.plansContainer}>
  //       {/* Monthly Plan */}
  //       <TouchableOpacity
  //         style={[styles.planCard, currentPlan?.type === 'monthly' && styles.activePlan]}
  //         onPress={() => handleSubscribe('monthly')}
  //         disabled={isProcessing || currentPlan?.type === 'monthly'}
  //       >
  //         <View style={styles.planHeader}>
  //           <Text style={styles.planName}>Monthly</Text>
  //           <Text style={styles.planPrice}>$1.99/month</Text>
  //         </View>
  //         <Text style={styles.planDescription}>Perfect for trying premium</Text>
  //         {currentPlan?.type === 'monthly' && (
  //           <Text style={styles.currentPlanBadge}>Current Plan</Text>
  //         )}
  //       </TouchableOpacity>

  //       {/* Yearly Plan */}
  //       <TouchableOpacity
  //         style={[styles.planCard, styles.recommendedPlan, currentPlan?.type === 'yearly' && styles.activePlan]}
  //         onPress={() => handleSubscribe('yearly')}
  //         disabled={isProcessing || currentPlan?.type === 'yearly'}
  //       >
  //         <View style={styles.recommendedBadge}>
  //           <Text style={styles.recommendedText}>BEST VALUE</Text>
  //         </View>
  //         <View style={styles.planHeader}>
  //           <Text style={styles.planName}>Yearly</Text>
  //           <Text style={styles.planPrice}>$19.99/year</Text>
  //         </View>
  //         <Text style={styles.planDescription}>Save 17% - Only $1.67/month</Text>
  //         {currentPlan?.type === 'yearly' && (
  //           <Text style={styles.currentPlanBadge}>Current Plan</Text>
  //         )}
  //       </TouchableOpacity>

  //       {/* Lifetime Plan */}
  //       <TouchableOpacity
  //         style={[styles.planCard, currentPlan?.type === 'lifetime' && styles.activePlan]}
  //         onPress={() => handleSubscribe('lifetime')}
  //         disabled={isProcessing || currentPlan?.type === 'lifetime'}
  //       >
  //         <View style={styles.planHeader}>
  //           <Text style={styles.planName}>Lifetime</Text>
  //           <Text style={styles.planPrice}>$49.99</Text>
  //         </View>
  //         <Text style={styles.planDescription}>One-time payment, forever access</Text>
  //         {currentPlan?.type === 'lifetime' && (
  //           <Text style={styles.currentPlanBadge}>Current Plan</Text>
  //         )}
  //       </TouchableOpacity>
  //     </View>

  //     {currentPlan && (
  //       <TouchableOpacity style={styles.manageButton} onPress={() => SubscriptionService.cancelSubscription()}>
  //         <Text style={styles.manageButtonText}>Manage Subscription</Text>
  //       </TouchableOpacity>
  //     )}
  //   </ScrollView>
  // );

  const renderWatchAdTab = () => {
    const adStatus = AdService.getAdFreeStatus();
    
    return (
      <View style={styles.adContainer}>
        <View style={styles.adCard}>
          <Text style={styles.adEmoji}>📺</Text>
          <Text style={styles.adTitle}>Support by Watching</Text>
          <Text style={styles.adDescription}>
            Watch a short ad to help cover our server and development costs
          </Text>

          <Text style={styles.adNote}>
            • Completely voluntary{'\n'}
            • No forced or popup ads{'\n'}
            • All ads are halal content only{'\n'}
            • Support development costs
          </Text>

          {canWatchAd ? (
            <TouchableOpacity
              style={styles.watchAdButton}
              onPress={handleWatchAd}
              disabled={isProcessing}
            >
              <LinearGradient
                colors={[theme.colors.status.success, theme.colors.primary.dark]}
                style={styles.watchAdGradient}
              >
                <Text style={styles.watchAdButtonText}>
                  {isProcessing ? 'Loading...' : 'Watch Ad — JazakAllah Khair'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={styles.adUnavailable}>
              {/* TODO: [PREMIUM] Re-add hoursUntilNextAd cooldown messaging when premium features are implemented */}
              <Text style={styles.adUnavailableText}>
                {AdService.isAdReady()
                  ? 'JazakAllah Khair for your support!'
                  : 'Ad is loading... please wait a moment'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.privacyNote}>
          <Text style={styles.privacyTitle}>Our Promise</Text>
          <Text style={styles.privacyText}>
            • We will NEVER show popup or forced ads{'\n'}
            • All ads are screened for halal content{'\n'}
            • You choose when to support us{'\n'}
            • Your privacy is always protected
          </Text>
        </View>
      </View>
    );
  };

  const renderDonateTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.donateHeader}>
        <Text style={styles.donateTitle}>Support Development</Text>
        <Text style={styles.donateSubtitle}>
          Your generosity helps us maintain and improve Sukoon for the Ummah
        </Text>
      </View>

      {/* Donation Tiers */}
      <View style={styles.donationTiers}>
        {DONATION_TIERS.map((tier) => (
          <TouchableOpacity
            key={tier.id}
            style={styles.donationCard}
            onPress={() => handleDonation(tier.id)}
            disabled={isProcessing}
          >
            <Text style={styles.donationEmoji}>{tier.emoji}</Text>
            <Text style={styles.donationTitle}>{tier.title}</Text>
            <Text style={styles.donationDescription}>{tier.description}</Text>
            {tier.amount > 0 && (
              <Text style={styles.donationAmount}>${tier.amount}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Sadaqah Jariyah Note */}
      <View style={styles.zakatNote}>
        <Text style={styles.zakatTitle}>📿 Sadaqah Jariyah</Text>
        <Text style={styles.zakatText}>
          Supporting Islamic tools can be a form of Sadaqah Jariyah — ongoing charity whose reward continues even after you've given.
        </Text>
      </View>
    </ScrollView>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>Loading support options...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Support Sukoon</Text>
          <Text style={styles.subtitle}>
            Sukoon is built with love for the Ummah. Your support keeps it free and growing.
          </Text>
        </View>

        {/* Tab Selector */}
        {/* TODO: Re-enable 'subscription' tab once we have premium features ready */}
        <View style={styles.tabContainer}>
          {/* {(['subscription', 'watch', 'donate'] as const).map((tab) => ( */}
          {(['watch', 'donate'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, selectedTab === tab && styles.tabActive]}
              onPress={() => {
                handleTabChange(tab);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              {/* <Text style={[styles.tabIcon, selectedTab === tab && styles.tabIconActive]}>
                { tab === 'subscription' ? '⭐' :  tab === 'watch' ? '📺' : '🤲'}
              </Text> */}
              <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
                {/* tab === 'subscription' ? 'Premium' : */ tab === 'watch' ? 'Watch Ad' : 'Donate'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {/* {selectedTab === 'subscription' && renderSubscriptionTab()} */}
          {selectedTab === 'watch' && renderWatchAdTab()}
          {selectedTab === 'donate' && renderDonateTab()}
        </View>

        {/* Footer Message */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            JazakAllah Khair for supporting us! May Allah reward your generosity.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.lg,
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
  },
  header: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: theme.typography.fontSize['5xl'],
    fontWeight: theme.typography.fontWeight.bold,
    fontFamily: theme.typography.fontFamily.heading,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.card.hover,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xs,
    marginBottom: theme.spacing.xl,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    gap: theme.spacing.xs + 2,
  },
  tabActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
    shadowColor: theme.colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  tabIcon: {
    fontSize: theme.typography.fontSize['2xl'],
  },
  tabIconActive: {
    fontSize: theme.typography.fontSize['2xl'],
  },
  tabText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.fontFamily.bodyMedium,
  },
  tabTextActive: {
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.bodySemibold,
  },
  tabContent: {
    flex: 1,
  },
  // Subscription Tab Styles
  introCard: {
    backgroundColor: theme.colors.card.background,
    marginHorizontal: theme.spacing.xl,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing['2xl'],
    borderWidth: 1,
    borderColor: theme.colors.card.hover,
  },
  introTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.primary.DEFAULT,
    marginBottom: theme.spacing.sm,
  },
  introText: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  featuresContainer: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing['2xl'],
  },
  featuresTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  featureIcon: {
    fontSize: theme.typography.fontSize['3xl'],
    marginRight: theme.spacing.md,
  },
  featureText: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  plansContainer: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing['2xl'],
  },
  planCard: {
    backgroundColor: theme.colors.card.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.card.hover,
  },
  recommendedPlan: {
    borderColor: theme.colors.primary.DEFAULT,
  },
  activePlan: {
    backgroundColor: theme.colors.card.hover,
    borderColor: theme.colors.primary.DEFAULT,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -12,
    right: theme.spacing.lg,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
  },
  recommendedText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.text.primary,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  planName: {
    fontSize: theme.typography.fontSize['2xl'],
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
  },
  planPrice: {
    fontSize: theme.typography.fontSize['3xl'],
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.primary.DEFAULT,
  },
  planDescription: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
  },
  currentPlanBadge: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.primary.DEFAULT,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    marginTop: theme.spacing.sm,
  },
  manageButton: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  manageButtonText: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.primary.DEFAULT,
    textDecorationLine: 'underline',
  },
  // Watch Ad Tab Styles
  adContainer: {
    padding: theme.spacing.xl,
  },
  adCard: {
    backgroundColor: theme.colors.card.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing['2xl'],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.card.hover,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  adEmoji: {
    fontSize: 64,
    marginBottom: theme.spacing.lg,
  },
  adTitle: {
    fontSize: theme.typography.fontSize['3xl'],
    fontFamily: theme.typography.fontFamily.heading,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  adDescription: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing.xl,
  },
  adNote: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    lineHeight: 22,
    marginBottom: theme.spacing['2xl'],
  },
  watchAdButton: {
    width: '100%',
  },
  watchAdGradient: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing['3xl'],
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  watchAdButtonText: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
  },
  adUnavailable: {
    backgroundColor: theme.colors.card.hover,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.lg,
  },
  adUnavailableText: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.status.warning,
    textAlign: 'center',
  },
  privacyNote: {
    backgroundColor: theme.colors.card.background,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing['2xl'],
    borderWidth: 1,
    borderColor: theme.colors.card.hover,
  },
  privacyTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.primary.DEFAULT,
    marginBottom: theme.spacing.md,
  },
  privacyText: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  // Donate Tab Styles
  donateHeader: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing['2xl'],
    alignItems: 'center',
  },
  donateTitle: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    fontFamily: theme.typography.fontFamily.headingRegular,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  donateSubtitle: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  donationTiers: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing['2xl'],
  },
  donationCard: {
    backgroundColor: theme.colors.card.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.card.hover,
  },
  donationEmoji: {
    fontSize: theme.typography.fontSize['5xl'] + 16,
    marginBottom: theme.spacing.md,
  },
  donationTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  donationDescription: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  donationAmount: {
    fontSize: theme.typography.fontSize['2xl'],
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.primary.DEFAULT,
  },
  alternativeMethods: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing['2xl'],
  },
  alternativeTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  alternativeButton: {
    backgroundColor: theme.colors.card.background,
    borderWidth: 1,
    borderColor: theme.colors.primary.DEFAULT,
    borderRadius: theme.borderRadius.sm,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  alternativeButtonText: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.primary.DEFAULT,
    fontFamily: theme.typography.fontFamily.bodyMedium,
  },
  zakatNote: {
    backgroundColor: theme.colors.card.hover,
    marginHorizontal: theme.spacing.xl,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing['2xl'],
    borderWidth: 1,
    borderColor: theme.colors.primary.DEFAULT,
  },
  zakatTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.status.warning,
    marginBottom: theme.spacing.sm,
  },
  zakatText: {
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  footer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default SupportScreen;