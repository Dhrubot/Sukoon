// src/screens/Settings/modals/CalculationMethodModal.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { CalculationMethodType } from '../../../types';

interface CalculationMethodModalProps {
  visible: boolean;
  onClose: () => void;
  calculationMethods: CalculationMethodType[];
  selectedMethod: string;
  onMethodSelect: (method: CalculationMethodType) => void;
}

export const CalculationMethodModal: React.FC<CalculationMethodModalProps> = ({
  visible,
  onClose,
  calculationMethods,
  selectedMethod,
  onMethodSelect,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Calculation Method</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalClose}>Done</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.methodList}>
          {calculationMethods.map((method) => (
            <TouchableOpacity
              key={method.value}
              style={[
                styles.methodOption,
                selectedMethod === method.value && styles.methodOptionSelected
              ]}
              onPress={() => onMethodSelect(method)}
            >
              <Text style={[
                styles.methodText,
                selectedMethod === method.value && styles.methodTextSelected
              ]}>
                {method.label}
              </Text>
              {selectedMethod === method.value && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
  },
  modalClose: {
    fontSize: 16,
    color: '#1B5E3F',
    fontWeight: '600',
  },
  methodList: {
    maxHeight: 400,
    paddingBottom: 20,
  },
  methodOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  methodOptionSelected: {
    backgroundColor: '#F0FDF4',
  },
  methodText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  methodTextSelected: {
    color: '#1B5E3F',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: '#1B5E3F',
    fontWeight: 'bold',
  },
});