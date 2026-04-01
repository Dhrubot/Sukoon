# Monetization Services

## Services

- **SubscriptionService.ts** — Subscription state is disabled until premium launches
- **DonationService.ts** — Donation requests are disabled until monetization launches
- **IAPManager.ts** — Shared purchase abstraction, currently disabled

## Integration Status

- Product IDs use `com.talukders.sukoon.*`
- Imported in `SupportScreen` (lazy-initialized once per session)
- `GoPremiumCard` component shows upgrade prompt on Stats screen
- `PremiumGate` component wraps premium-only features
- `usePremium` hook provides premium state to any component

## Firebase Analytics

- `AnalyticsService.ts` is wired to `@react-native-firebase/analytics`
- Tracks: prayer_completed, premium_purchased, streak_milestone, etc.
- Requires `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)

## TODO

- [ ] Create IAP products in App Store Connect / Google Play Console
- [ ] Place `google-services.json` and `GoogleService-Info.plist` in project root
- [ ] Add server-side receipt validation (optional, can defer)
