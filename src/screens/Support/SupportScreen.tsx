import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

// Services
import SubscriptionService from '../../services/SubscriptionService';
import AdService from '../../services/AdService';
import DonationService, { DONATION_TIERS } from '../../services/DonationService';
import StorageService from '../../services/StorageService';

// Types
import { SubscriptionPlan } from '../../types';

const { width } = Dimensions.get('window');

const SupportScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [canWatchAd, setCanWatchAd] = useState(false);
  const [hoursUntilNextAd, setHoursUntilNextAd] = useState(0);
  const [selectedTab, setSelectedTab] = useState<'subscription' | 'watch' | 'donate'>('subscription');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    initializeServices();
  }, []);

  const initializeServices = async () => {
    setIsLoading(true);
    try {
      // Initialize services
      await SubscriptionService.initialize();
      await AdService.initialize();
      await DonationService.initialize();

      // Check current subscription
      const hasSubscription = await SubscriptionService.checkSubscriptionStatus();
      if (hasSubscription) {
        setCurrentPlan(SubscriptionService.getCurrentSubscription());
      }

      // Check ad availability
      const canShow = await AdService.checkCanShowAd();
      setCanWatchAd(canShow);
      setHoursUntilNextAd(AdService.getTimeUntilNextAd());
    } catch (error) {
      console.error('Failed to initialize support services:', error);
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
          'Thank You! 💚',
          'You now have 24 hours of premium access. Enjoy all features!',
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
          'JazakAllah Khair! 🤲',
          'May Allah reward your generosity. Your support helps us continue developing.',
          [{ text: 'Ameen' }]
        );
      }
    } catch (error) {
      console.error('Donation error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderSubscriptionTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.introCard}>
        <Text style={styles.introTitle}>Premium Features</Text>
        <Text style={styles.introText}>
          Unlock advanced features while supporting continued development
        </Text>
      </View>

      {/* Features List */}
      <View style={styles.featuresContainer}>
        <Text style={styles.featuresTitle}>What's Included:</Text>
        
        {[
          { icon: '👨‍👩‍👧‍👦', text: 'Family Sharing - Track family prayers together' },
          { icon: '📊', text: 'Advanced Analytics & Insights' },
          { icon: '☁️', text: 'Cloud Backup & Sync' },
          { icon: '🔊', text: '30+ Premium Notification Sounds' },
          { icon: '📤', text: 'Export Prayer Data' },
          { icon: '🎨', text: 'Custom Themes & Colors' },
          { icon: '🕋', text: 'Qibla Compass with AR' },
          { icon: '📖', text: 'Extended Dua Library' },
          { icon: '🔄', text: 'Unlimited History' },
          { icon: '🚫', text: 'Ad-Free Experience' },
        ].map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Text style={styles.featureIcon}>{feature.icon}</Text>
            <Text style={styles.featureText}>{feature.text}</Text>
          </View>
        ))}
      </View>

      {/* Subscription Plans */}
      <View style={styles.plansContainer}>
        {/* Monthly Plan */}
        <TouchableOpacity
          style={[styles.planCard, currentPlan?.type === 'monthly' && styles.activePlan]}
          onPress={() => handleSubscribe('monthly')}
          disabled={isProcessing || currentPlan?.type === 'monthly'}
        >
          <View style={styles.planHeader}>
            <Text style={styles.planName}>Monthly</Text>
            <Text style={styles.planPrice}>$1.99/month</Text>
          </View>
          <Text style={styles.planDescription}>Perfect for trying premium</Text>
          {currentPlan?.type === 'monthly' && (
            <Text style={styles.currentPlanBadge}>Current Plan</Text>
          )}
        </TouchableOpacity>

        {/* Yearly Plan */}
        <TouchableOpacity
          style={[styles.planCard, styles.recommendedPlan, currentPlan?.type === 'yearly' && styles.activePlan]}
          onPress={() => handleSubscribe('yearly')}
          disabled={isProcessing || currentPlan?.type === 'yearly'}
        >
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedText}>BEST VALUE</Text>
          </View>
          <View style={styles.planHeader}>
            <Text style={styles.planName}>Yearly</Text>
            <Text style={styles.planPrice}>$19.99/year</Text>
          </View>
          <Text style={styles.planDescription}>Save 17% - Only $1.67/month</Text>
          {currentPlan?.type === 'yearly' && (
            <Text style={styles.currentPlanBadge}>Current Plan</Text>
          )}
        </TouchableOpacity>

        {/* Lifetime Plan */}
        <TouchableOpacity
          style={[styles.planCard, currentPlan?.type === 'lifetime' && styles.activePlan]}
          onPress={() => handleSubscribe('lifetime')}
          disabled={isProcessing || currentPlan?.type === 'lifetime'}
        >
          <View style={styles.planHeader}>
            <Text style={styles.planName}>Lifetime</Text>
            <Text style={styles.planPrice}>$49.99</Text>
          </View>
          <Text style={styles.planDescription}>One-time payment, forever access</Text>
          {currentPlan?.type === 'lifetime' && (
            <Text style={styles.currentPlanBadge}>Current Plan</Text>
          )}
        </TouchableOpacity>
      </View>

      {currentPlan && (
        <TouchableOpacity style={styles.manageButton} onPress={() => SubscriptionService.cancelSubscription()}>
          <Text style={styles.manageButtonText}>Manage Subscription</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  const renderWatchAdTab = () => {
    const adStatus = AdService.getAdFreeStatus();
    
    return (
      <View style={styles.adContainer}>
        <View style={styles.adCard}>
          <Text style={styles.adEmoji}>📺</Text>
          <Text style={styles.adTitle}>Support by Watching</Text>
          <Text style={styles.adDescription}>
            Watch a short ad when YOU choose to support the app and unlock premium features for 24 hours
          </Text>

          {canWatchAd ? (
            <>
              <Text style={styles.adNote}>
                • Completely voluntary{'\n'}
                • No forced or popup ads{'\n'}
                • All ads are halal content only{'\n'}
                • Support development costs
              </Text>
              
              <TouchableOpacity
                style={styles.watchAdButton}
                onPress={handleWatchAd}
                disabled={isProcessing}
              >
                <LinearGradient
                  colors={['#4CAF50', '#45A049']}
                  style={styles.watchAdGradient}
                >
                  <Text style={styles.watchAdButtonText}>
                    {isProcessing ? 'Loading...' : 'Watch Ad & Support'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.adUnavailable}>
              <Text style={styles.adUnavailableText}>
                {hoursUntilNextAd > 0
                  ? `You can watch another ad in ${hoursUntilNextAd} hours`
                  : 'Premium features already active!'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.privacyNote}>
          <Text style={styles.privacyTitle}>🔒 Our Promise</Text>
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

      {/* Alternative Donation Methods */}
      <View style={styles.alternativeMethods}>
        <Text style={styles.alternativeTitle}>Other Ways to Support</Text>
        
        <TouchableOpacity
          style={styles.alternativeButton}
          onPress={() => DonationService.openPayPalDonation()}
        >
          <Text style={styles.alternativeButtonText}>PayPal</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.alternativeButton}
          onPress={() => DonationService.openCryptoDonation()}
        >
          <Text style={styles.alternativeButtonText}>Cryptocurrency</Text>
        </TouchableOpacity>
      </View>

      {/* Zakat Note */}
      <View style={styles.zakatNote}>
        <Text style={styles.zakatTitle}>📿 Zakat Eligible</Text>
        <Text style={styles.zakatText}>
          If you're calculating your annual Zakat, supporting Islamic apps that benefit the Ummah can be considered as Fi Sabilillah (in the way of Allah).
        </Text>
      </View>
    </ScrollView>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1B5E3F" />
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
            Choose how you'd like to support continued development
          </Text>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          {(['subscription', 'watch', 'donate'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, selectedTab === tab && styles.tabActive]}
              onPress={() => {
                setSelectedTab(tab);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={[styles.tabIcon, selectedTab === tab && styles.tabIconActive]}>
                {tab === 'subscription' ? '⭐' : tab === 'watch' ? '📺' : '🤲'}
              </Text>
              <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
                {tab === 'subscription' ? 'Premium' : tab === 'watch' ? 'Watch Ad' : 'Donate'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {selectedTab === 'subscription' && renderSubscriptionTab()}
          {selectedTab === 'watch' && renderWatchAdTab()}
          {selectedTab === 'donate' && renderDonateTab()}
        </View>

        {/* Footer Message */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            JazakAllah Khair for supporting us! May Allah reward your generosity. 💚
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabIcon: {
    fontSize: 20,
  },
  tabIconActive: {
    fontSize: 20,
  },
  tabText: {
    fontSize: 14,
    color: '#757575',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#1B5E3F',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  // Subscription Tab Styles
  introCard: {
    backgroundColor: '#E8F5E9',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1B5E3F',
    marginBottom: 8,
  },
  introText: {
    fontSize: 16,
    color: '#2E7D32',
    lineHeight: 22,
  },
  featuresContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#424242',
    flex: 1,
  },
  plansContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  recommendedPlan: {
    borderColor: '#4CAF50',
  },
  activePlan: {
    backgroundColor: '#F5F5F5',
    borderColor: '#9E9E9E',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -12,
    right: 16,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1B5E3F',
  },
  planDescription: {
    fontSize: 16,
    color: '#757575',
  },
  currentPlanBadge: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 8,
  },
  manageButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  manageButtonText: {
    fontSize: 16,
    color: '#1B5E3F',
    textDecorationLine: 'underline',
  },
  // Watch Ad Tab Styles
  adContainer: {
    padding: 20,
  },
  adCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  adEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  adTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 12,
  },
  adDescription: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  adNote: {
    fontSize: 15,
    color: '#424242',
    lineHeight: 22,
    marginBottom: 24,
  },
  watchAdButton: {
    width: '100%',
  },
  watchAdGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  watchAdButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  adUnavailable: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  adUnavailableText: {
    fontSize: 16,
    color: '#E65100',
    textAlign: 'center',
  },
  privacyNote: {
    backgroundColor: '#E8F5E9',
    padding: 20,
    borderRadius: 12,
    marginTop: 24,
  },
  privacyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B5E3F',
    marginBottom: 12,
  },
  privacyText: {
    fontSize: 15,
    color: '#2E7D32',
    lineHeight: 22,
  },
  // Donate Tab Styles
  donateHeader: {
    paddingHorizontal: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  donateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 8,
  },
  donateSubtitle: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 22,
  },
  donationTiers: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  donationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  donationEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  donationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  donationDescription: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 12,
  },
  donationAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1B5E3F',
  },
  alternativeMethods: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  alternativeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 16,
  },
  alternativeButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1B5E3F',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  alternativeButtonText: {
    fontSize: 16,
    color: '#1B5E3F',
    fontWeight: '500',
  },
  zakatNote: {
    backgroundColor: '#FFF3E0',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  zakatTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 8,
  },
  zakatText: {
    fontSize: 15,
    color: '#BF360C',
    lineHeight: 22,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default SupportScreen;