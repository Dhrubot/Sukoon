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
import { useTheme } from '../../../providers/ThemeProvider';
import { useThemedStyles } from '../../../hooks/useThemedStyles';
import { AppTheme } from '../../../theme';

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
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
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
                            <ActivityIndicator size="small" color={theme.colors.primary.DEFAULT} />
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

const createStyles = (theme: AppTheme) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.settings.modalOverlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.settings.modalBg,
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
    borderBottomColor: theme.colors.settings.modalBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.settings.modalTitle,
  },
  modalClose: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.settings.modalClose,
  },
  modalCloseDisabled: {
    color: theme.colors.settings.modalCloseDisabled,
  },
  methodList: {
    paddingHorizontal: 20,
  },
  previewContainer: {
    backgroundColor: theme.colors.settings.previewBg,
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 2,
    borderColor: theme.colors.settings.previewBorder,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary.DEFAULT,
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
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.settings.labelPrimary,
  },
  previewPrayerTime: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary.DEFAULT,
  },
  previewNote: {
    fontSize: 13,
    color: theme.colors.settings.labelMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  methodsContainer: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.settings.labelPrimary,
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
    backgroundColor: theme.colors.settings.optionBg,
    borderWidth: 1,
    borderColor: theme.colors.settings.optionBorder,
  },
  methodOptionSelected: {
    backgroundColor: theme.colors.settings.optionActiveBg,
    borderColor: theme.colors.primary.DEFAULT,
  },
  methodOptionDisabled: {
    opacity: 0.5,
  },
  methodInfo: {
    flex: 1,
  },
  methodText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.settings.labelPrimary,
  },
  methodTextSelected: {
    color: theme.colors.primary.DEFAULT,
  },
  methodTextDisabled: {
    color: theme.colors.settings.modalCloseDisabled,
  },
  methodDescription: {
    fontSize: 13,
    color: theme.colors.settings.labelMuted,
    marginTop: 2,
  },
  methodActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkmark: {
    fontSize: 18,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '700',
  },
  previewButton: {
    backgroundColor: theme.colors.settings.sectionBg,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.colors.primary.DEFAULT,
    minWidth: 70,
    alignItems: 'center',
  },
  previewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary.DEFAULT,
  },
  infoSection: {
    marginTop: 24,
    backgroundColor: theme.colors.settings.previewBg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.settings.optionBorder,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.settings.labelPrimary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: theme.colors.settings.labelMuted,
    lineHeight: 16,
    marginBottom: 6,
  },
});