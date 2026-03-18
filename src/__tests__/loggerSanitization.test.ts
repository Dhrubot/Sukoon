import { sanitizeLogText } from '../utils/logger';

describe('logger sanitization', () => {
  it('redacts quoted user-entered values', () => {
    expect(sanitizeLogText('Failed to find location for "Dhaka, Bangladesh".')).toBe(
      'Failed to find location for "[redacted]".'
    );
  });

  it('redacts coordinate-like numbers', () => {
    expect(sanitizeLogText('lat=23.810300 lng=90.412500')).toBe(
      '[redacted-location] [redacted-location]'
    );
  });
});
