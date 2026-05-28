/**
 * supportConfig.ts
 *
 * Re-exports support contact values from app.config.js `extra` fields,
 * with sane fallbacks to the placeholder values used during development.
 *
 * Usage:
 *   import { supportEmail, privacyPolicyUrl } from '../utils/supportConfig';
 *   Linking.openURL(`mailto:${supportEmail}`);
 */

import Constants from 'expo-constants';

const FALLBACK_SUPPORT_EMAIL = 'support@sukoon.app';
const FALLBACK_PRIVACY_POLICY_URL = 'https://dhrubot.github.io/Sukoon/privacy';

/**
 * The support email address configured in app.config.js `extra.supportEmail`.
 * Falls back to the placeholder address if the config value is absent.
 */
export const supportEmail: string =
  (Constants.expoConfig?.extra?.supportEmail as string | undefined) ??
  FALLBACK_SUPPORT_EMAIL;

/**
 * The hosted privacy policy URL configured in app.config.js `extra.privacyPolicyUrl`.
 * Falls back to the placeholder URL if the config value is absent.
 */
export const privacyPolicyUrl: string =
  (Constants.expoConfig?.extra?.privacyPolicyUrl as string | undefined) ??
  FALLBACK_PRIVACY_POLICY_URL;

/**
 * Returns a mailto: URI for the support email.
 * Optionally include a pre-filled subject line.
 */
export function getSupportMailtoUri(subject?: string): string {
  const encodedSubject = subject
    ? `?subject=${encodeURIComponent(subject)}`
    : '';
  return `mailto:${supportEmail}${encodedSubject}`;
}
