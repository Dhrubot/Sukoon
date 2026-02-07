# Monetization Services

These services handle in-app purchases, donations, and ads. They are **not yet integrated** into the main app flow.

## Services

- **SubscriptionService.ts** — Monthly/yearly/lifetime premium subscriptions via `react-native-iap`
- **DonationService.ts** — One-time donation tiers (coffee, meal, generous, custom)
- **AdService.ts** — Rewarded ads via AdMob for temporary premium access

## Status

- Product IDs use `com.talukders.sukoon.*` (corrected from placeholder `com.prayerbuddy.*`)
- Only imported in `SupportScreen`
- No paywall gates are active yet
- No server-side receipt validation

## TODO

- [ ] Create IAP products in App Store Connect / Google Play Console
- [ ] Add premium gates around advanced features
- [ ] Add "Go Premium" card in Stats/Menu
- [ ] Add server-side receipt validation
