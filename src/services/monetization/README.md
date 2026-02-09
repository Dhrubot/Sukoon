# Monetization Services

## Services

- **SubscriptionService.ts** — Monthly/yearly/lifetime premium subscriptions via `react-native-iap`
- **DonationService.ts** — One-time donation tiers (coffee, meal, generous, custom)
- **AdService.ts** — Rewarded halal-only ads for temporary 24h premium access

## Integration Status

- Product IDs use `com.talukders.sukoon.*`
- Imported in `SupportScreen` (lazy-initialized once per session)
- `WatchAdCard` component provides the ad-watching UI
- `GoPremiumCard` component shows upgrade prompt on Stats screen
- `PremiumGate` component wraps premium-only features
- `usePremium` hook provides premium state to any component

## Ad Policy (Halal Only)

AdMob is configured for halal-safe content:
- `MaxAdContentRating.G` — general audiences only
- `requestNonPersonalizedAdsOnly: true` — privacy-first
- Keyword hints: education, technology, health, fitness, family, etc.
- **You MUST also block haram categories in AdMob dashboard:**
  - AdMob → Blocking controls → Sensitive categories
  - Block: Alcohol, Gambling, Dating, Sexual content, Political, Tobacco

## Firebase Analytics

- `AnalyticsService.ts` is wired to `@react-native-firebase/analytics`
- Tracks: prayer_completed, ad_watched, premium_purchased, streak_milestone, etc.
- Requires `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)

## TODO

- [ ] Create IAP products in App Store Connect / Google Play Console
- [ ] Place `google-services.json` and `GoogleService-Info.plist` in project root
- [ ] Configure haram category blocking in AdMob dashboard
- [ ] Add server-side receipt validation (optional, can defer)
