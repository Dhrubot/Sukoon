// src/components/LocationModal.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useLocationSetup } from '../hooks/useLocationSetup';
import { useTheme } from '../providers/ThemeProvider';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { AppTheme } from '../theme';

interface LocationModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const {
    formData,
    error,
    isLoading,
    handleManualLocation,
    updateFormData,
    resetForm,
  } = useLocationSetup();

  const handleSubmit = async () => {
    const success = await handleManualLocation();
    if (success) {
      resetForm();
      onClose();
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Your Location</Text>
            <Text style={styles.modalSubtitle}>
              We need your location to calculate accurate prayer times
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your city"
                placeholderTextColor={theme.colors.text.muted}
                selectionColor={theme.colors.primary.DEFAULT}
                value={formData.city}
                onChangeText={(text) => updateFormData('city', text)}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Country</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your country"
                placeholderTextColor={theme.colors.text.muted}
                selectionColor={theme.colors.primary.DEFAULT}
                value={formData.country}
                onChangeText={(text) => updateFormData('country', text)}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Postal Code (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter postal code"
                placeholderTextColor={theme.colors.text.muted}
                selectionColor={theme.colors.primary.DEFAULT}
                value={formData.postalCode}
                onChangeText={(text) => updateFormData('postalCode', text)}
                autoCapitalize="characters"
              />
            </View>

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? 'Setting Location...' : 'Set Location'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.noteText}>
              Note: Enter either a city or postal code. Country is required for better accuracy.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.settings.modalOverlay,
    padding: theme.spacing.xl,
  },
  keyboardView: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.card.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xl,
    width: '90%',
    maxWidth: 500,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    shadowColor: theme.colors.achievement.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontFamily: theme.typography.fontFamily.heading,
    marginBottom: theme.spacing.sm,
    color: theme.colors.primary.DEFAULT,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.typography.fontSize.lg,
    marginBottom: theme.spacing.xs,
    color: theme.colors.text.primary,
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
  button: {
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    minWidth: 120,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  buttonText: {
    color: theme.colors.primary.contrast,
    fontSize: theme.typography.fontSize.lg,
    fontFamily: theme.typography.fontFamily.bodySemibold,
  },
  errorText: {
    color: theme.colors.status.error,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  noteText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.muted,
    marginTop: theme.spacing.lg,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
