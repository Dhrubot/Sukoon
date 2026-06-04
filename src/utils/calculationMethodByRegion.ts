import { CalculationMethod, Location, UserSettings } from '../types';

// ─── ISO 3166-1 alpha-2 country code → calculation method ──────────────────
// Primary mapping. Stable across Nominatim's locale-dependent country-name
// responses. Bangladesh ("BD") maps to Karachi regardless of whether the
// upstream returned "Bangladesh" or "বাংলাদেশ" as the country string.

const METHOD_BY_COUNTRY_CODE: Record<string, CalculationMethod> = {
  // ISNA — Islamic Society of North America (Fajr 15°, Isha 15°)
  US: 'ISNA',
  CA: 'ISNA',

  // Tehran — Institute of Geophysics
  IR: 'Tehran',

  // Umm al-Qura, Makkah (Fajr 18.5°, Isha 90 min after Maghrib)
  SA: 'Makkah',
  AE: 'Makkah',
  QA: 'Makkah',
  KW: 'Makkah',
  BH: 'Makkah',
  OM: 'Makkah',

  // University of Islamic Sciences, Karachi (Fajr 18°, Isha 18°) — South Asia
  PK: 'Karachi',
  BD: 'Karachi',
  IN: 'Karachi',
  AF: 'Karachi',
  NP: 'Karachi',
  LK: 'Karachi',
  MV: 'Karachi',

  // Egyptian General Authority of Survey — North Africa
  EG: 'Egypt',
  DZ: 'Egypt',
  MA: 'Egypt',
  TN: 'Egypt',
  LY: 'Egypt',
  SD: 'Egypt',
};

// ─── Country-name fallback (legacy path) ──────────────────────────────────
// Kept so users whose settings were saved before the countryCode field
// existed still resolve correctly. Limited to English names — non-English
// country strings now go through the ISO code path above.

const normalizeCountry = (country?: string | null): string =>
  (country || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const matchesCountry = (country: string, names: string[]) => names.includes(country);

const resolveByCountryName = (country?: string | null): CalculationMethod => {
  const normalized = normalizeCountry(country);

  if (
    matchesCountry(normalized, [
      'united states',
      'united states of america',
      'usa',
      'us',
      'canada',
    ])
  ) {
    return 'ISNA';
  }

  if (matchesCountry(normalized, ['iran', 'islamic republic of iran'])) {
    return 'Tehran';
  }

  if (
    matchesCountry(normalized, [
      'saudi arabia',
      'united arab emirates',
      'uae',
      'qatar',
      'kuwait',
      'bahrain',
      'oman',
    ])
  ) {
    return 'Makkah';
  }

  if (
    matchesCountry(normalized, [
      'pakistan',
      'bangladesh',
      'india',
      'afghanistan',
      'nepal',
      'sri lanka',
      'maldives',
    ])
  ) {
    return 'Karachi';
  }

  if (
    matchesCountry(normalized, [
      'egypt',
      'algeria',
      'morocco',
      'tunisia',
      'libya',
      'sudan',
    ])
  ) {
    return 'Egypt';
  }

  return 'MWL';
};

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Returns the canonical calculation method for a region.
 *
 * Resolution priority:
 *   1. `countryCode` (ISO 3166-1 alpha-2, e.g. "BD") — stable across locales
 *   2. `country` name (English fallback for legacy settings)
 *   3. MWL as the global default
 *
 * The ISO code is the trustworthy input. The country-name path remains for
 * users whose persisted settings don't have a countryCode yet (pre-v57).
 */
export const resolveCalculationMethodForCountry = (
  country?: string | null,
  countryCode?: string | null,
): CalculationMethod => {
  if (countryCode) {
    const upper = countryCode.trim().toUpperCase();
    if (upper.length === 2 && METHOD_BY_COUNTRY_CODE[upper]) {
      return METHOD_BY_COUNTRY_CODE[upper];
    }
  }
  return resolveByCountryName(country);
};

interface AppliedCalculationMethodResult {
  calculationMethod: CalculationMethod;
  didAutoSelect: boolean;
  settings: UserSettings;
}

export const applyRegionalCalculationMethod = (
  settings: UserSettings,
  location?: Location | null
): AppliedCalculationMethodResult => {
  const nextLocation = location ?? settings.location;

  if (settings.calculationMethodManuallySelected) {
    return {
      calculationMethod: settings.calculationMethod,
      didAutoSelect: false,
      settings: {
        ...settings,
        location: nextLocation,
      },
    };
  }

  const calculationMethod = resolveCalculationMethodForCountry(
    nextLocation?.country,
    nextLocation?.countryCode,
  );

  return {
    calculationMethod,
    didAutoSelect: true,
    settings: {
      ...settings,
      location: nextLocation,
      calculationMethod,
      calculationMethodManuallySelected: false,
    },
  };
};

// ─── Migration helper ─────────────────────────────────────────────────────

/**
 * Detects whether a saved location was written under the pre-v57 reverse-geocode
 * path (no countryCode + country in a non-Latin script). Such users may have
 * settings.calculationMethod stuck on MWL even when the region had a better
 * default — the buggy resolution silently dropped to the fallback.
 *
 * Returns true if a re-resolution is recommended. Callers should re-geocode
 * the saved coordinates to refresh the country fields, then call
 * `applyRegionalCalculationMethod` again.
 */
export const needsCalculationMethodMigration = (location?: Location | null): boolean => {
  if (!location) return false;
  if (location.countryCode) return false;
  const country = (location.country || '').trim();
  if (!country) return false;
  // Any non-ASCII character signals the locale-dependent Nominatim response
  // that the pre-v57 edge path returned (e.g. "বাংলাদেশ" instead of "Bangladesh").
  // eslint-disable-next-line no-control-regex
  return /[^\x00-\x7F]/.test(country);
};

/**
 * One-shot migration helper. Given a user's existing settings and a freshly
 * re-geocoded location, produce the updated settings — replacing the buggy
 * MWL fallback with the correct regional method if the location's countryCode
 * now resolves to one. Clears `calculationMethodManuallySelected` so future
 * location changes aren't pinned to the silently-wrong method.
 *
 * Returns the new settings if a change was made, or null if no migration
 * was needed (method unchanged).
 */
export const migrateUserSettingsForLocale = (
  settings: UserSettings,
  freshLocation: Location,
): UserSettings | null => {
  const resolvedMethod = resolveCalculationMethodForCountry(
    freshLocation.country,
    freshLocation.countryCode,
  );
  if (resolvedMethod === settings.calculationMethod) {
    // Method didn't change. Still update the location so countryCode is
    // populated going forward, but skip the manual-selected reset.
    return {
      ...settings,
      location: freshLocation,
    };
  }
  return {
    ...settings,
    location: freshLocation,
    calculationMethod: resolvedMethod,
    // Reset the manual-selected flag — the previous value was the MWL
    // fallback, not a real user choice, so future location updates should
    // be allowed to re-resolve normally.
    calculationMethodManuallySelected: false,
  };
};
