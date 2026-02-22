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
    padding: 20,
  },
  keyboardView: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.card.background,
    borderRadius: 10,
    padding: 20,
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
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    color: theme.colors.primary.DEFAULT,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: theme.colors.text.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: theme.colors.background.secondary,
    color: theme.colors.text.primary,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  button: {
    borderRadius: 5,
    padding: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  buttonText: {
    color: theme.colors.primary.contrast,
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: theme.colors.status.error,
    marginBottom: 10,
    textAlign: 'center',
  },
  noteText: {
    fontSize: 13,
    color: theme.colors.text.muted,
    marginTop: 15,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
