import { CalculationMethod, Location, UserSettings } from '../types';

const normalizeCountry = (country?: string | null): string =>
  (country || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const matchesCountry = (country: string, names: string[]) => names.includes(country);

export const resolveCalculationMethodForCountry = (country?: string | null): CalculationMethod => {
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

  const calculationMethod = resolveCalculationMethodForCountry(nextLocation?.country);

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
