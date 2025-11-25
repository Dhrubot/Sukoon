// src/screens/Settings/modals/CalculationMethodModal.tsx (ENHANCED)
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { format } from 'date-fns';
import { CalculationMethodType, PrayerTime } from '../../../types';

interface CalculationMethodModalProps {
  visible: boolean;
  onClose: () => void;
  calculationMethods: CalculationMethodType[];
  selectedMethod: string;
  onMethodSelect: (method: CalculationMethodType) => void;
  
  // 🎯 NEW: Preview functionality
  previewPrayerTimes?: {
    method: string;
    times: PrayerTime[];
  } | null;
  onPreviewMethod?: (method: CalculationMethodType) => void;
  isUpdatingMethod?: boolean;
}

export const CalculationMethodModal: React.FC<CalculationMethodModalProps> = ({
  visible,
  onClose,
  calculationMethods,
  selectedMethod,
  onMethodSelect,
  previewPrayerTimes,
  onPreviewMethod,
  isUpdatingMethod = false,
}) => {
  const [previewingMethod, setPreviewingMethod] = useState<string | null>(null);

  const handlePreview = async (method: CalculationMethodType) => {
    if (onPreviewMethod) {
      setPreviewingMethod(method.value);
      await onPreviewMethod(method);
      setPreviewingMethod(null);
    }
  };

  const handleMethodSelect = (method: CalculationMethodType) => {
    if (!isUpdatingMethod) {
      onMethodSelect(method);
    }
  };

  // 🎯 NEW: Render prayer times preview
  const renderPreview = () => {
    if (!previewPrayerTimes) return null;

    return (
      <View style={styles.previewContainer}>
        <Text style={styles.previewTitle}>
          Preview: {previewPrayerTimes.method}
        </Text>
        <View style={styles.previewTimes}>
          {previewPrayerTimes.times.map((prayer) => (
            <View key={prayer.name} style={styles.previewRow}>
              <Text style={styles.previewPrayerName}>{prayer.name}</Text>
              <Text style={styles.previewPrayerTime}>
                {format(prayer.time, 'h:mm a')}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.previewNote}>
          These are the prayer times you would get with this calculation method.
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Calculation Method</Text>
            <TouchableOpacity onPress={onClose} disabled={isUpdatingMethod}>
              <Text style={[
                styles.modalClose,
                isUpdatingMethod && styles.modalCloseDisabled
              ]}>
                {isUpdatingMethod ? 'Updating...' : 'Done'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.methodList} showsVerticalScrollIndicator={false}>
            {/* 🎯 NEW: Preview section */}
            {renderPreview()}
            
            {/* Method selection */}
            <View style={styles.methodsContainer}>
              <Text style={styles.sectionTitle}>Available Methods</Text>
              
              {calculationMethods.map((method) => (
                <View key={method.value} style={styles.methodWrapper}>
                  <TouchableOpacity
                    style={[
                      styles.methodOption,
                      selectedMethod === method.value && styles.methodOptionSelected,
                      isUpdatingMethod && styles.methodOptionDisabled,
                    ]}
                    onPress={() => handleMethodSelect(method)}
                    disabled={isUpdatingMethod}
                  >
                    <View style={styles.methodInfo}>
                      <Text style={[
                        styles.methodText,
                        selectedMethod === method.value && styles.methodTextSelected,
                        isUpdatingMethod && styles.methodTextDisabled,
                      ]}>
                        {method.label}
                      </Text>
                      
                      {/* 🎯 NEW: Method descriptions */}
                      <Text style={styles.methodDescription}>
                        {getMethodDescription(method.value)}
                      </Text>
                    </View>
                    
                    <View style={styles.methodActions}>
                      {selectedMethod === method.value && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                      
                      {/* 🎯 NEW: Preview button */}
                      {onPreviewMethod && selectedMethod !== method.value && (
                        <TouchableOpacity
                          style={styles.previewButton}
                          onPress={() => handlePreview(method)}
                          disabled={previewingMethod === method.value || isUpdatingMethod}
                        >
                          {previewingMethod === method.value ? (
                            <ActivityIndicator size="small" color="#1B5E3F" />
                          ) : (
                            <Text style={styles.previewButtonText}>Preview</Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            
            {/* 🎯 NEW: Information section */}
            <View style={styles.infoSection}>
              <Text style={styles.infoTitle}>ℹ️ About Calculation Methods</Text>
              <Text style={styles.infoText}>
                Different calculation methods may result in slightly different prayer times. 
                Choose the method that aligns with your local mosque or Islamic authority.
              </Text>
              <Text style={styles.infoText}>
                You can preview prayer times before switching to see how they would change.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// 🎯 NEW: Helper function for method descriptions
const getMethodDescription = (method: string): string => {
  const descriptions: Record<string, string> = {
    'MWL': 'Used worldwide, conservative approach',
    'ISNA': 'Common in North America',
    'Egypt': 'Egyptian General Authority method',
    'Makkah': 'Umm al-Qura, used in Saudi Arabia',
    'Karachi': 'University of Islamic Sciences',
    'Tehran': 'Institute of Geophysics, Tehran',
    'Jafari': 'Shia Ithna Ashari method',
  };
  return descriptions[method] || 'Standard calculation method';
};

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
    maxHeight: '85%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  modalTitle: {
    fontSize: 18,  // xl
    fontWeight: '700',  // bold
    color: '#1B5E3F',
  },
  modalClose: {
    fontSize: 16,  // lg
    fontWeight: '600',  // semibold
    color: '#1B5E3F',
  },
  modalCloseDisabled: {
    color: '#ADB5BD',
  },
  methodList: {
    paddingHorizontal: 20,
  },
  
  // 🎯 NEW: Preview styles
  previewContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 2,
    borderColor: '#1B5E3F',
  },
  previewTitle: {
    fontSize: 16,  // lg
    fontWeight: '700',  // bold
    color: '#1B5E3F',
    marginBottom: 12,
    textAlign: 'center',
  },
  previewTimes: {
    gap: 8,
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  previewPrayerName: {
    fontSize: 14,  // md
    fontWeight: '600',  // semibold
    color: '#495057',
  },
  previewPrayerTime: {
    fontSize: 14,  // md
    fontWeight: '500',  // medium
    color: '#1B5E3F',
  },
  previewNote: {
    fontSize: 13,  // sm (adjusted up)
    color: '#6C757D',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // Methods container
  methodsContainer: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,  // lg
    fontWeight: '600',  // semibold
    color: '#495057',
    marginBottom: 12,
  },
  methodWrapper: {
    marginBottom: 8,
  },
  methodOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  methodOptionSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#1B5E3F',
  },
  methodOptionDisabled: {
    opacity: 0.5,
  },
  methodInfo: {
    flex: 1,
  },
  methodText: {
    fontSize: 16,  // lg
    fontWeight: '600',  // semibold
    color: '#495057',
  },
  methodTextSelected: {
    color: '#1B5E3F',
  },
  methodTextDisabled: {
    color: '#ADB5BD',
  },
  methodDescription: {
    fontSize: 13,  // sm (adjusted up)
    color: '#6C757D',
    marginTop: 2,
  },
  methodActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkmark: {
    fontSize: 18,  // xl
    color: '#1B5E3F',
    fontWeight: '700',  // bold
  },
  
  // 🎯 NEW: Preview button styles
  previewButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#1B5E3F',
    minWidth: 70,
    alignItems: 'center',
  },
  previewButtonText: {
    fontSize: 13,  // sm (adjusted up)
    fontWeight: '600',  // semibold
    color: '#1B5E3F',
  },
  
  // Info section
  infoSection: {
    marginTop: 24,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  infoTitle: {
    fontSize: 14,  // md
    fontWeight: '600',  // semibold
    color: '#495057',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,  // sm (adjusted up)
    color: '#6C757D',
    lineHeight: 16,
    marginBottom: 6,
  },
});