import { withAlpha } from '../utils/color';

describe('withAlpha', () => {
  it('applies alpha to hex colors safely', () => {
    expect(withAlpha('#2dd4bf', 0.08)).toBe('rgba(45, 212, 191, 0.08)');
  });

  it('composes alpha for rgba colors safely', () => {
    expect(withAlpha('rgba(45, 212, 191, 0.5)', 0.4)).toBe('rgba(45, 212, 191, 0.2)');
  });

  it('returns the original string when parsing fails', () => {
    expect(withAlpha('transparent', 0.2)).toBe('transparent');
  });
});
