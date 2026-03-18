import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppTheme } from '../../theme';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useTheme } from '../../providers/ThemeProvider';
import { CountryOption } from '../../constants/countries';
import { LocationSearchResult } from '../../services/GeocodingService';

interface StructuredLocationSearchProps {
  cityQuery: string;
  countryQuery: string;
  countryOptions: CountryOption[];
  selectedCountry: CountryOption | null;
  searchResults: LocationSearchResult[];
  suggestedResults: LocationSearchResult[];
  selectedSearchResult: LocationSearchResult | null;
  isSearching: boolean;
  searchError?: string;
  disabled?: boolean;
  onCityQueryChange: (value: string) => void;
  onCountryQueryChange: (value: string) => void;
  onCountrySelect: (country: CountryOption) => void;
  onSearchResultSelect: (result: LocationSearchResult) => void;
}

export const StructuredLocationSearch: React.FC<StructuredLocationSearchProps> = ({
  cityQuery,
  countryQuery,
  countryOptions,
  selectedCountry,
  searchResults,
  suggestedResults,
  selectedSearchResult,
  isSearching,
  searchError = '',
  disabled = false,
  onCityQueryChange,
  onCountryQueryChange,
  onCountrySelect,
  onSearchResultSelect,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <View style={styles.fieldBlock}>
        <Text style={styles.label}>Country</Text>
        <TextInput
          style={styles.input}
          placeholder="Select your country"
          placeholderTextColor={theme.colors.text.muted}
          selectionColor={theme.colors.primary.DEFAULT}
          value={countryQuery}
          onChangeText={onCountryQueryChange}
          autoCapitalize="words"
          editable={!disabled}
        />
        {!selectedCountry && countryQuery.trim().length > 0 && (
          <View style={styles.resultsCard}>
            {countryOptions.length > 0 ? (
              countryOptions.map((country) => (
                <TouchableOpacity
                  key={country.code}
                  style={styles.resultRow}
                  onPress={() => onCountrySelect(country)}
                  disabled={disabled}
                >
                  <Text style={styles.resultTitle}>{country.name}</Text>
                  <Text style={styles.resultSubtitle}>{country.code}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyText}>No country match found.</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.label}>City</Text>
        <TextInput
          style={[styles.input, !selectedCountry && styles.inputDisabled]}
          placeholder={selectedCountry ? 'Search your city' : 'Select a country first'}
          placeholderTextColor={theme.colors.text.muted}
          selectionColor={theme.colors.primary.DEFAULT}
          value={cityQuery}
          onChangeText={onCityQueryChange}
          autoCapitalize="words"
          editable={!disabled && !!selectedCountry}
        />

        {selectedSearchResult && (
          <View style={styles.selectionPill}>
            <Text style={styles.selectionTitle}>
              {selectedSearchResult.city}
              {selectedSearchResult.admin1 ? `, ${selectedSearchResult.admin1}` : ''}
            </Text>
            <Text style={styles.selectionSubtitle}>{selectedSearchResult.country}</Text>
          </View>
        )}

        {!!selectedCountry && (
          <View style={styles.resultsCard}>
            {isSearching ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={theme.colors.primary.DEFAULT} />
                <Text style={styles.loadingText}>Searching cities...</Text>
              </View>
            ) : searchResults.length > 0 ? (
              searchResults.map((result) => (
                <TouchableOpacity
                  key={`${result.latitude}:${result.longitude}:${result.city}`}
                  style={styles.resultRow}
                  onPress={() => onSearchResultSelect(result)}
                  disabled={disabled}
                >
                  <Text style={styles.resultTitle}>
                    {result.city}
                    {result.admin1 ? `, ${result.admin1}` : ''}
                  </Text>
                  <Text style={styles.resultSubtitle}>{result.country}</Text>
                </TouchableOpacity>
              ))
            ) : searchError ? (
              <Text style={styles.emptyText}>{searchError}</Text>
            ) : cityQuery.trim().length >= 2 ? (
              <>
                <Text style={styles.emptyText}>
                  We could not find that town. Try the nearest major city instead.
                </Text>
                {suggestedResults.length > 0 ? (
                  <View style={styles.suggestionsBlock}>
                    <Text style={styles.suggestionsLabel}>Popular cities in {selectedCountry?.name}</Text>
                    {suggestedResults.map((result) => (
                      <TouchableOpacity
                        key={`suggested:${result.latitude}:${result.longitude}:${result.city}`}
                        style={styles.resultRow}
                        onPress={() => onSearchResultSelect(result)}
                        disabled={disabled}
                      >
                        <Text style={styles.resultTitle}>
                          {result.city}
                          {result.admin1 ? `, ${result.admin1}` : ''}
                        </Text>
                        <Text style={styles.resultSubtitle}>{result.country}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={styles.helperText}>
                Start typing a major city after selecting your country.
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    width: '100%',
  },
  fieldBlock: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.typography.fontSize.lg,
    marginBottom: theme.spacing.xs,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.fontFamily.bodyMedium,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    fontSize: theme.typography.fontSize.lg,
    backgroundColor: theme.colors.background.secondary,
    color: theme.colors.text.primary,
  },
  inputDisabled: {
    opacity: 0.55,
  },
  resultsCard: {
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border.secondary,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.card.background,
    overflow: 'hidden',
  },
  resultRow: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border.secondary,
  },
  resultTitle: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
  },
  resultSubtitle: {
    marginTop: 2,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.muted,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  loadingText: {
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
  },
  helperText: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.muted,
  },
  emptyText: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.secondary,
  },
  suggestionsBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border.secondary,
  },
  suggestionsLabel: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.muted,
  },
  selectionPill: {
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.card.hover || theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: theme.colors.border.secondary,
  },
  selectionTitle: {
    fontSize: theme.typography.fontSize.md,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.text.primary,
  },
  selectionSubtitle: {
    marginTop: 2,
    fontSize: theme.typography.fontSize.sm,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.text.muted,
  },
});
