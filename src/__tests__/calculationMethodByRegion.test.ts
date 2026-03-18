import {
  applyRegionalCalculationMethod,
  resolveCalculationMethodForCountry,
} from '../utils/calculationMethodByRegion';
import StorageService from '../services/StorageService';

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
});
