import { isValidCoordinates } from '../utils/locationValidation';

describe('locationValidation', () => {
  it('accepts usable latitude and longitude pairs', () => {
    expect(isValidCoordinates({ latitude: 23.8103, longitude: 90.4125 })).toBe(true);
    expect(isValidCoordinates({ latitude: -33.8688, longitude: 151.2093 })).toBe(true);
  });

  it('rejects missing, malformed, zeroed, or out-of-range coordinates', () => {
    expect(isValidCoordinates(null)).toBe(false);
    expect(isValidCoordinates('23.8103,90.4125')).toBe(false);
    expect(isValidCoordinates({})).toBe(false);
    expect(isValidCoordinates({ latitude: '23.8103', longitude: 90.4125 })).toBe(false);
    expect(isValidCoordinates({ latitude: Number.NaN, longitude: 90.4125 })).toBe(false);
    expect(isValidCoordinates({ latitude: 0, longitude: 0 })).toBe(false);
    expect(isValidCoordinates({ latitude: 91, longitude: 90.4125 })).toBe(false);
    expect(isValidCoordinates({ latitude: 23.8103, longitude: 181 })).toBe(false);
  });
});
