import { useEffect, useMemo, useState } from 'react';

import GeocodingService, { LocationSearchResult } from '../services/GeocodingService';
import {
  CountryOption,
  filterCountryOptions,
  findCountryOptionByCode,
  findCountryOptionByName,
} from '../constants/countries';
import logger from '../utils/logger';

interface StructuredLocationSearchOptions {
  initialCountryName?: string;
  initialCountryCode?: string;
  debounceMs?: number;
  resultLimit?: number;
}

function sanitizeInitialCountryValue(value?: string): string | undefined {
  const trimmedValue = value?.trim();
  if (!trimmedValue) return undefined;

  const normalizedValue = trimmedValue.toLowerCase();
  if (normalizedValue === 'unknown' || normalizedValue === 'unknown country') {
    return undefined;
  }

  return trimmedValue;
}

export const useStructuredLocationSearch = (options?: StructuredLocationSearchOptions) => {
  const debounceMs = options?.debounceMs ?? 250;
  const resultLimit = options?.resultLimit ?? 6;
  const sanitizedInitialCountryName = sanitizeInitialCountryValue(options?.initialCountryName);

  const initialCountry =
    findCountryOptionByCode(options?.initialCountryCode) ||
    findCountryOptionByName(sanitizedInitialCountryName) ||
    null;

  const [countryQuery, setCountryQuery] = useState(initialCountry?.name ?? sanitizedInitialCountryName ?? '');
  const [selectedCountry, setSelectedCountry] = useState<CountryOption | null>(initialCountry);
  const [cityQuery, setCityQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [selectedSearchResult, setSelectedSearchResult] = useState<LocationSearchResult | null>(null);
  const [suggestedResults, setSuggestedResults] = useState<LocationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const countryOptions = useMemo(
    () => filterCountryOptions(countryQuery, 8),
    [countryQuery]
  );

  useEffect(() => {
    if (!selectedCountry || cityQuery.trim().length < 2) {
      setSearchResults([]);
      setSuggestedResults([]);
      setSearchError('');
      setIsSearching(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsSearching(true);
        setSearchError('');
        const response = await GeocodingService.searchCitiesDetailed(
          cityQuery.trim(),
          selectedCountry.code,
          resultLimit
        );
        setSearchResults(response.results);
        setSuggestedResults(response.suggestedResults);
      } catch (error) {
        logger.error('City search failed:', error);
        setSearchResults([]);
        setSuggestedResults([]);
        setSearchError('City search is unavailable right now. Please try again or use GPS location.');
      } finally {
        setIsSearching(false);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [cityQuery, selectedCountry, debounceMs, resultLimit]);

  const updateCountryQuery = (value: string) => {
    setCountryQuery(value);
    setSearchError('');

    const matchingSelectedCountry =
      selectedCountry && value.trim().toLowerCase() === selectedCountry.name.toLowerCase();

    if (!matchingSelectedCountry) {
      setSelectedCountry(null);
      setSelectedSearchResult(null);
      setSearchResults([]);
      setSuggestedResults([]);
    }
  };

  const updateCityQuery = (value: string) => {
    setCityQuery(value);
    setSearchError('');

    const matchingSelectedResult =
      selectedSearchResult &&
      value.trim().toLowerCase() === (selectedSearchResult.city || '').trim().toLowerCase();

    if (!matchingSelectedResult) {
      setSelectedSearchResult(null);
    }
  };

  const selectCountry = (country: CountryOption) => {
    setSelectedCountry(country);
    setCountryQuery(country.name);
    setSelectedSearchResult(null);
    setSearchResults([]);
    setSuggestedResults([]);
    setSearchError('');
  };

  const selectSearchResult = (result: LocationSearchResult) => {
    setSelectedSearchResult(result);
    setCityQuery(result.city || '');

    const matchingCountry = findCountryOptionByName(result.country) || selectedCountry;
    if (matchingCountry) {
      setSelectedCountry(matchingCountry);
      setCountryQuery(matchingCountry.name);
    } else if (result.country) {
      setCountryQuery(result.country);
    }

    setSearchResults([]);
    setSuggestedResults([]);
    setSearchError('');
  };

  const reset = () => {
    setCountryQuery(initialCountry?.name ?? sanitizedInitialCountryName ?? '');
    setSelectedCountry(initialCountry);
    setCityQuery('');
    setSearchResults([]);
    setSuggestedResults([]);
    setSelectedSearchResult(null);
    setIsSearching(false);
    setSearchError('');
  };

  return {
    cityQuery,
    countryQuery,
    countryOptions,
    selectedCountry,
    searchResults,
    suggestedResults,
    selectedSearchResult,
    isSearching,
    searchError,
    updateCityQuery,
    updateCountryQuery,
    selectCountry,
    selectSearchResult,
    reset,
  };
};
