import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { useLocationSetup } from '../hooks/useLocationSetup';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { Location } from '../types';
import { AppTheme } from '../theme';
import { StructuredLocationSearch } from './location/StructuredLocationSearch';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LocationModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  dismissLabel?: string;
  onLocationResolved?: (location: Location) => void | Promise<void>;
}

export const LocationModal: React.FC<LocationModalProps> = ({
  visible,
  onClose,
  title = 'Set Your Location',
  subtitle = 'Select your country, then choose your city for accurate prayer times.',
  submitLabel = 'Set Location',
  dismissLabel = 'Cancel',
  onLocationResolved,
}) => {
  const styles = useThemedStyles(createStyles);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const {
    error,
    isLoading,
    handleManualLocation,
    updateCity,
    updateCountry,
    selectCountry,
    selectSearchResult,
    resetForm,
    structuredSearch,
  } = useLocationSetup();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      resetForm();
    });
  }, [visible]);

  const handleDismiss = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    const location = await handleManualLocation();
    if (!location) return;

    if (onLocationResolved) {
      await onLocationResolved(location);
    }

    handleDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.modalContainer}>
        <TouchableWithoutFeedback onPress={handleDismiss}>
          <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <Animated.View
            style={[
              styles.sheet,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.handle} />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            <StructuredLocationSearch
              cityQuery={structuredSearch.cityQuery}
              countryQuery={structuredSearch.countryQuery}
              countryOptions={structuredSearch.countryOptions}
              selectedCountry={structuredSearch.selectedCountry}
              searchResults={structuredSearch.searchResults}
              selectedSearchResult={structuredSearch.selectedSearchResult}
              isSearching={structuredSearch.isSearching}
              searchError={structuredSearch.searchError}
              disabled={isLoading}
              onCityQueryChange={updateCity}
              onCountryQueryChange={updateCountry}
              onCountrySelect={selectCountry}
              onSearchResultSelect={selectSearchResult}
            />

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                (isLoading || !structuredSearch.selectedSearchResult) && styles.primaryButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isLoading || !structuredSearch.selectedSearchResult}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>
                {isLoading ? 'Setting Location...' : submitLabel}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleDismiss}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>{dismissLabel}</Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.background.overlay,
    },
    keyboardView: {
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.colors.card.background,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.md,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.border.primary,
      alignSelf: 'center',
    },
    title: {
      fontSize: theme.typography.fontSize['2xl'],
      fontFamily: theme.typography.fontFamily.heading,
      color: theme.colors.text.primary,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    errorText: {
      color: theme.colors.status.error,
      textAlign: 'center',
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
    },
    primaryButton: {
      backgroundColor: theme.colors.primary.DEFAULT,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: theme.spacing.xs,
    },
    primaryButtonDisabled: {
      opacity: 0.65,
    },
    primaryButtonText: {
      color: theme.colors.primary.contrast,
      fontSize: theme.typography.fontSize.lg,
      fontFamily: theme.typography.fontFamily.bodySemibold,
    },
    secondaryButton: {
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
    },
    secondaryButtonText: {
      color: theme.colors.text.muted,
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
    },
  });
