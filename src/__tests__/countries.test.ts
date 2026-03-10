import {
  filterCountryOptions,
  findCountryOptionByCode,
  findCountryOptionByName,
} from '../constants/countries';

describe('country options', () => {
  it('ranks exact and prefix matches ahead of looser matches', () => {
    const results = filterCountryOptions('united', 5);

    expect(results[0]?.name).toBe('United Arab Emirates');
    expect(results[1]?.name).toBe('United Kingdom');
    expect(results[2]?.name).toBe('United States');
  });

  it('finds countries by ISO code', () => {
    expect(findCountryOptionByCode('bd')?.name).toBe('Bangladesh');
    expect(findCountryOptionByCode('BR')?.name).toBe('Brazil');
    expect(findCountryOptionByCode('GB')?.name).toBe('United Kingdom');
  });

  it('finds countries by normalized name', () => {
    expect(findCountryOptionByName('bangladesh')?.code).toBe('BD');
    expect(findCountryOptionByName('Brazil')?.code).toBe('BR');
    expect(findCountryOptionByName('United States')?.code).toBe('US');
  });
});
