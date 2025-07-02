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

interface LocationModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({ visible, onClose }) => {
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

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  keyboardView: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1B5E3F',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
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
    backgroundColor: '#1B5E3F',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  noteText: {
    fontSize: 12,
    color: '#666',
    marginTop: 15,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
