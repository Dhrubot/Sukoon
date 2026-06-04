import {
  applyRegionalCalculationMethod,
  resolveCalculationMethodForCountry,
  needsCalculationMethodMigration,
  migrateUserSettingsForLocale,
} from '../utils/calculationMethodByRegion';
import StorageService from '../services/StorageService';
import type { Location, UserSettings } from '../types';

describe('calculationMethodByRegion', () => {
  it('maps broad regions to the expected methods', () => {
    expect(resolveCalculationMethodForCountry('United States')).toBe('ISNA');
    expect(resolveCalculationMethodForCountry('Canada')).toBe('ISNA');
    expect(resolveCalculationMethodForCountry('Saudi Arabia')).toBe('Makkah');
    expect(resolveCalculationMethodForCountry('Bangladesh')).toBe('Karachi');
    expect(resolveCalculationMethodForCountry('Egypt')).toBe('Egypt');
    expect(resolveCalculationMethodForCountry('Iran')).toBe('Tehran');
    expect(resolveCalculationMethodForCountry('United Kingdom')).toBe('MWL');
    expect(resolveCalculationMethodForCountry(undefined)).toBe('MWL');
  });

  it('auto-selects a method from the current country while the setting is auto-managed', () => {
    const settings = StorageService.getDefaultSettings();

    const result = applyRegionalCalculationMethod(settings, {
      latitude: 23.8103,
      longitude: 90.4125,
      city: 'Dhaka',
      country: 'Bangladesh',
    });

    expect(result.calculationMethod).toBe('Karachi');
    expect(result.didAutoSelect).toBe(true);
    expect(result.settings.calculationMethod).toBe('Karachi');
    expect(result.settings.calculationMethodManuallySelected).toBe(false);
  });

  it('does not overwrite a user-chosen method after location changes', () => {
    const settings = {
      ...StorageService.getDefaultSettings(),
      calculationMethod: 'ISNA' as const,
      calculationMethodManuallySelected: true,
    };

    const result = applyRegionalCalculationMethod(settings, {
      latitude: 24.7136,
      longitude: 46.6753,
      city: 'Riyadh',
      country: 'Saudi Arabia',
    });

    expect(result.calculationMethod).toBe('ISNA');
    expect(result.didAutoSelect).toBe(false);
    expect(result.settings.calculationMethod).toBe('ISNA');
    expect(result.settings.calculationMethodManuallySelected).toBe(true);
  });

  it('reapplies the regional method after automatic mode is restored', () => {
    const settings = {
      ...StorageService.getDefaultSettings(),
      calculationMethod: 'ISNA' as const,
      calculationMethodManuallySelected: false,
    };

    const result = applyRegionalCalculationMethod(settings, {
      latitude: 23.8103,
      longitude: 90.4125,
      city: 'Dhaka',
      country: 'Bangladesh',
    });

    expect(result.didAutoSelect).toBe(true);
    expect(result.settings.calculationMethod).toBe('Karachi');
    expect(result.settings.calculationMethodManuallySelected).toBe(false);
  });

  // ─── ISO-code resolution (the fix for non-English Nominatim responses) ──

  it('resolves from countryCode when country name is in non-English script', () => {
    expect(resolveCalculationMethodForCountry('বাংলাদেশ', 'BD')).toBe('Karachi');
    expect(resolveCalculationMethodForCountry('المملكة العربية السعودية', 'SA')).toBe('Makkah');
    expect(resolveCalculationMethodForCountry('ایران', 'IR')).toBe('Tehran');
    expect(resolveCalculationMethodForCountry('مصر', 'EG')).toBe('Egypt');
  });

  it('ISO code overrides English name when both present', () => {
    // Even if the name happens to be MWL-mapped, the code wins.
    expect(resolveCalculationMethodForCountry('United Kingdom', 'BD')).toBe('Karachi');
  });

  it('falls back to English country name when countryCode is missing', () => {
    expect(resolveCalculationMethodForCountry('Bangladesh', undefined)).toBe('Karachi');
    expect(resolveCalculationMethodForCountry('Saudi Arabia', null)).toBe('Makkah');
  });

  it('falls back to English name when countryCode is malformed', () => {
    expect(resolveCalculationMethodForCountry('Bangladesh', 'BDX')).toBe('Karachi');
    expect(resolveCalculationMethodForCountry('Bangladesh', '')).toBe('Karachi');
    expect(resolveCalculationMethodForCountry('Bangladesh', '  ')).toBe('Karachi');
  });

  it('lowercased countryCodes still resolve (normalisation)', () => {
    expect(resolveCalculationMethodForCountry(null, 'bd')).toBe('Karachi');
    expect(resolveCalculationMethodForCountry(null, 'sa')).toBe('Makkah');
  });

  it('countryCode for an unmapped country falls through to name match', () => {
    // FR isn't in METHOD_BY_COUNTRY_CODE → falls through to name resolver
    // → "United Kingdom" → MWL.
    expect(resolveCalculationMethodForCountry('United Kingdom', 'FR')).toBe('MWL');
  });

  // ─── Migration detection + application ─────────────────────────────────

  it('needsCalculationMethodMigration: false when location has countryCode', () => {
    const location: Location = {
      latitude: 23.81,
      longitude: 90.41,
      country: 'বাংলাদেশ',
      countryCode: 'BD',
    };
    expect(needsCalculationMethodMigration(location)).toBe(false);
  });

  it('needsCalculationMethodMigration: true when country is non-ASCII and countryCode missing', () => {
    const location: Location = {
      latitude: 23.81,
      longitude: 90.41,
      country: 'বাংলাদেশ',
    };
    expect(needsCalculationMethodMigration(location)).toBe(true);
  });

  it('needsCalculationMethodMigration: false for English country with no countryCode', () => {
    const location: Location = {
      latitude: 51.5,
      longitude: -0.13,
      country: 'United Kingdom',
    };
    expect(needsCalculationMethodMigration(location)).toBe(false);
  });

  it('needsCalculationMethodMigration: false for empty/null location', () => {
    expect(needsCalculationMethodMigration(null)).toBe(false);
    expect(needsCalculationMethodMigration(undefined)).toBe(false);
    expect(
      needsCalculationMethodMigration({ latitude: 0, longitude: 0, country: '' }),
    ).toBe(false);
  });

  it('migrateUserSettingsForLocale: switches MWL → Karachi for Dhaka bug victim', () => {
    const settings: UserSettings = {
      ...StorageService.getDefaultSettings(),
      calculationMethod: 'MWL',
      calculationMethodManuallySelected: true, // locked in by buggy onboarding confirm
      location: { latitude: 23.81, longitude: 90.41, country: 'বাংলাদেশ' },
    };
    const fresh: Location = {
      latitude: 23.81,
      longitude: 90.41,
      city: 'Dhaka',
      country: 'Bangladesh',
      countryCode: 'BD',
    };
    const migrated = migrateUserSettingsForLocale(settings, fresh);
    expect(migrated).not.toBeNull();
    expect(migrated!.calculationMethod).toBe('Karachi');
    expect(migrated!.calculationMethodManuallySelected).toBe(false);
    expect(migrated!.location?.country).toBe('Bangladesh');
    expect(migrated!.location?.countryCode).toBe('BD');
  });

  it('migrateUserSettingsForLocale: no method change still updates location with countryCode', () => {
    const settings: UserSettings = {
      ...StorageService.getDefaultSettings(),
      calculationMethod: 'MWL',
      calculationMethodManuallySelected: false,
      location: { latitude: 51.5, longitude: -0.13, country: 'United Kingdom' },
    };
    const fresh: Location = {
      latitude: 51.5,
      longitude: -0.13,
      city: 'London',
      country: 'United Kingdom',
      countryCode: 'GB',
    };
    const migrated = migrateUserSettingsForLocale(settings, fresh);
    // UK still resolves to MWL — method unchanged, but location updated with countryCode.
    expect(migrated).not.toBeNull();
    expect(migrated!.calculationMethod).toBe('MWL');
    expect(migrated!.location?.countryCode).toBe('GB');
    // Manual-selected flag preserved when method doesn't change.
    expect(migrated!.calculationMethodManuallySelected).toBe(false);
  });
});
