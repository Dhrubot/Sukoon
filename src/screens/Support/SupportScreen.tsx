import React, { useState, useEffect } from 'react';
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

// Services
import IAPManager from '../../services/monetization/IAPManager';
import SubscriptionService from '../../services/monetization/SubscriptionService';
import DonationService, { DONATION_TIERS } from '../../services/monetization/DonationService';

// Module-level flag: services only need to be initialized once per app session
let servicesInitialized = false;

const SupportScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const ambientColors = [theme.colors.ambient.top, theme.colors.ambient.bottom] as const;
  const [isLoading, setIsLoading] = useState(!servicesInitialized);
  // TODO: Re-enable watch ad tab once we have a solid userbase
  // const [canWatchAd, setCanWatchAd] = useState(false);
  // const [hoursUntilNextAd, setHoursUntilNextAd] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    initializeServices();
    // TODO: Re-enable ad polling once watch ad tab is back
    // const adPoll = setInterval(async () => {
    //   const canShow = await AdService.canShowAd();
    //   setCanWatchAd(canShow);
    // }, 10_000);
    // return () => clearInterval(adPoll);
  }, []);

  const initializeServices = async () => {
    try {
      // Only run heavy initialization once per app session
      if (!servicesInitialized) {
        setIsLoading(true);
        // IAPManager must be initialized first — owns the single IAP connection + listener
        await IAPManager.initialize();
        await SubscriptionService.initialize();
        // TODO: Re-enable AdService once watch ad tab is back
        // await AdService.initialize();
        await DonationService.initialize();
        servicesInitialized = true;
      }

      await SubscriptionService.checkSubscriptionStatus();

      // TODO: Re-enable ad status checks once watch ad tab is back
      // const canShow = await AdService.canShowAd();
      // setCanWatchAd(canShow);
      // setHoursUntilNextAd(AdService.getHoursUntilNextAd());
    } catch (error) {
      logger.error('Failed to initialize support services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // TODO: Re-enable handleWatchAd once we have a solid userbase
  // const handleWatchAd = async () => {
  //   setIsProcessing(true);
  //   try {
  //     const success = await AdService.showRewardedAd();
  //     if (success) {
  //       Alert.alert(
  //         'JazakAllah Khair!',
  //         'Your support helps keep Sukoon free for the Ummah. May Allah reward your generosity.',
  //         [{ text: 'Alhamdulillah' }]
  //       );
  //       setCanWatchAd(false);
  //       setTimeout(async () => {
  //         const canShow = await AdService.canShowAd();
  //         setCanWatchAd(canShow);
  //       }, 3000);
  //     } else {
  //       Alert.alert('Ad Not Ready', 'Please try again in a moment.');
  //     }
  //   } catch (error) {
  //     Alert.alert('Error', 'Failed to show ad. Please try again.');
  //   } finally {
  //     setIsProcessing(false);
  //   }
  // };

  const handleDonation = async (tierId: string) => {
    setIsProcessing(true);
    try {
      const success = await DonationService.makeDonation(tierId);
      if (success) {
        Alert.alert(
          'JazakAllah Khair!',
          'May Allah accept your contribution. It helps us keep caring for Sukoon.',
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

  // TODO: Re-enable renderWatchAdTab once we have a solid userbase
  // const renderWatchAdTab = () => {
  //   const adStatus = AdService.getAdFreeStatus();
  //   return (
  //     <View style={styles.adContainer}>
  //       <View style={styles.adCard}>
  //         <Text style={styles.adEmoji}>📺</Text>
  //         <Text style={styles.adTitle}>Support by Watching</Text>
  //         <Text style={styles.adDescription}>
  //           Watch a short ad to help cover our server and development costs
  //         </Text>
  //         <Text style={styles.adNote}>
  //           • Completely voluntary{'\n'}
  //           • No forced or popup ads{'\n'}
  //           • All ads use family-safe settings{'\n'}
  //           • Support development costs
  //         </Text>
  //         {canWatchAd ? (
  //           <TouchableOpacity
  //             style={styles.watchAdButton}
  //             onPress={handleWatchAd}
  //             disabled={isProcessing}
  //           >
  //             <LinearGradient
  //               colors={[theme.colors.status.success, theme.colors.primary.dark]}
  //               style={styles.watchAdGradient}
  //             >
  //               <Text style={styles.watchAdButtonText}>
  //                 {isProcessing ? 'Loading...' : 'Watch Ad'}
  //               </Text>
  //             </LinearGradient>
  //           </TouchableOpacity>
  //         ) : (
  //           <View style={styles.adUnavailable}>
  //             <Text style={styles.adUnavailableText}>
  //               {AdService.isAdReady()
  //                 ? 'Ready to watch another ad!'
  //                 : 'Ad is loading... please wait a moment'}
  //             </Text>
  //           </View>
  //         )}
  //       </View>
  //       <View style={styles.privacyNote}>
  //         <Text style={styles.privacyTitle}>Our Promise</Text>
  //         <Text style={styles.privacyText}>
  //           • We will NEVER show popup or forced ads{'\n'}
  //           • All ads use family-safe settings{'\n'}
  //           • You choose when to support us{'\n'}
  //           • Your privacy is always protected
  //         </Text>
  //       </View>
  //     </View>
  //   );
  // };

  const renderDonateTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.donateHeader}>
        <Text style={styles.eyebrow}>Support</Text>
        <Text style={styles.donateTitle}>Help sustain Sukoon</Text>
        <Text style={styles.donateSubtitle}>
          If this app helps your prayer, you can help us maintain it carefully and continue improving it for the Ummah.
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
        <Text style={styles.zakatTitle}>Sadaqah Jariyah</Text>
        <Text style={styles.zakatText}>
          Supporting a beneficial Islamic tool can be part of ongoing charity, especially when it helps someone return to prayer with steadiness.
        </Text>
      </View>
    </ScrollView>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={ambientColors} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
            <Text style={styles.loadingText}>Preparing support options...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={ambientColors} style={styles.gradient}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Support</Text>
            <Text style={styles.title}>Support Sukoon</Text>
            <Text style={styles.subtitle}>
              Contributions are optional. If Sukoon has become useful in your daily prayers, you can help sustain its upkeep.
            </Text>
          </View>

          {/* Tab Selector */}
          {/* TODO: Re-enable 'subscription' tab once we have premium features ready */}
          {/* TODO: Re-enable 'watch' tab once we have a solid userbase */}
          {/* <View style={styles.tabContainer}>
            {(['donate'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, selectedTab === tab && styles.tabActive]}
                onPress={() => {
                  handleTabChange(tab);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
                  Donate
                </Text>
              </TouchableOpacity>
            ))}
          </View> */}

          {/* Tab Content — donate only for now */}
          <View style={styles.tabContent}>
            {/* {selectedTab === 'subscription' && renderSubscriptionTab()} */}
            {/* {selectedTab === 'watch' && renderWatchAdTab()} */}
            {renderDonateTab()}
          </View>

          {/* Footer Message */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              May Allah accept every sincere contribution.
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
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
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
  },
  eyebrow: {
    fontSize: theme.typography.fontSize.xs,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.muted,
    letterSpacing: 1.4,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
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
  },
  donateTitle: {
    fontSize: 22,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
  },
  donateSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
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
    backgroundColor: theme.colors.card.background,
    marginHorizontal: theme.spacing.xl,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing['2xl'],
    borderWidth: 1,
    borderColor: theme.colors.border.secondary,
  },
  zakatTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
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
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default SupportScreen;
