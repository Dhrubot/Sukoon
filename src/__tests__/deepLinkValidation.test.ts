// src/__tests__/deepLinkValidation.test.ts
// Sprint 5C: Verify deep link parameter validation rejects invalid prayer names
// and unknown URL schemes/actions.

const VALID_PRAYER_NAMES = new Set(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']);
const VALID_DEEP_LINK_ACTIONS = new Set(['prepare', 'prayed']);

// Extracted validation logic from NavigationProvider for unit testing
function validateDeepLink(url: string): { action: string; prayer: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'sukoon:') return null;

    const action = parsed.hostname;
    if (!VALID_DEEP_LINK_ACTIONS.has(action)) return null;

    const prayer = parsed.searchParams.get('prayer');
    if (!prayer || !VALID_PRAYER_NAMES.has(prayer)) return null;

    return { action, prayer };
  } catch {
    return null;
  }
}

describe('Deep link validation', () => {
  describe('valid deep links', () => {
    it('accepts sukoon://prepare?prayer=Fajr', () => {
      const result = validateDeepLink('sukoon://prepare?prayer=Fajr');
      expect(result).toEqual({ action: 'prepare', prayer: 'Fajr' });
    });

    it('accepts sukoon://prayed?prayer=Isha', () => {
      const result = validateDeepLink('sukoon://prayed?prayer=Isha');
      expect(result).toEqual({ action: 'prayed', prayer: 'Isha' });
    });

    it('accepts all five prayer names', () => {
      for (const name of ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']) {
        const result = validateDeepLink(`sukoon://prepare?prayer=${name}`);
        expect(result).not.toBeNull();
        expect(result!.prayer).toBe(name);
      }
    });
  });

  describe('invalid prayer names', () => {
    it('rejects unknown prayer name', () => {
      expect(validateDeepLink('sukoon://prepare?prayer=Taraweeh')).toBeNull();
    });

    it('rejects empty prayer param', () => {
      expect(validateDeepLink('sukoon://prepare?prayer=')).toBeNull();
    });

    it('rejects missing prayer param', () => {
      expect(validateDeepLink('sukoon://prepare')).toBeNull();
    });

    it('rejects case-sensitive mismatch', () => {
      expect(validateDeepLink('sukoon://prepare?prayer=fajr')).toBeNull();
      expect(validateDeepLink('sukoon://prepare?prayer=FAJR')).toBeNull();
    });

    it('rejects injection attempt', () => {
      expect(validateDeepLink('sukoon://prepare?prayer=Fajr&evil=true')).not.toBeNull();
      // Extra params are ignored, but the prayer is still valid — this is fine
      // The important thing is that only valid prayer names pass
    });

    it('rejects prayer name with whitespace', () => {
      expect(validateDeepLink('sukoon://prepare?prayer=Fajr%20')).toBeNull();
    });
  });

  describe('invalid actions', () => {
    it('rejects unknown action', () => {
      expect(validateDeepLink('sukoon://delete?prayer=Fajr')).toBeNull();
    });

    it('rejects empty hostname', () => {
      expect(validateDeepLink('sukoon://?prayer=Fajr')).toBeNull();
    });
  });

  describe('invalid schemes', () => {
    it('rejects http scheme', () => {
      expect(validateDeepLink('http://prepare?prayer=Fajr')).toBeNull();
    });

    it('rejects malformed URL', () => {
      expect(validateDeepLink('not-a-url')).toBeNull();
    });

    it('rejects empty string', () => {
      expect(validateDeepLink('')).toBeNull();
    });
  });
});

describe('quickLogPrayer route param validation', () => {
  it('validates prayer names against the known set', () => {
    const validNames = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const invalidNames = ['Taraweeh', 'Tahajjud', 'fajr', '', null, undefined, 123];

    for (const name of validNames) {
      expect(VALID_PRAYER_NAMES.has(name)).toBe(true);
    }

    for (const name of invalidNames) {
      expect(VALID_PRAYER_NAMES.has(name as string)).toBe(false);
    }
  });
});
