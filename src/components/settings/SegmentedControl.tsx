// src/components/settings/SegmentedControl.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface SegmentedControlOption {
  value: string;
  label: string;
  description?: string;
}

interface SegmentedControlProps {
  options: SegmentedControlOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  style?: any;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  selectedValue,
  onValueChange,
  style,
}) => (
  <View style={[styles.container, style]}>
    {options.map((option, index) => (
      <TouchableOpacity
        key={option.value}
        style={[
          styles.segment,
          index === 0 && styles.segmentLeft,
          index === options.length - 1 && styles.segmentRight,
          selectedValue === option.value && styles.segmentActive,
        ]}
        onPress={() => onValueChange(option.value)}
      >
        <Text style={[
          styles.segmentText,
          selectedValue === option.value && styles.segmentTextActive,
        ]}>
          {option.label}
        </Text>
        {option.description && (
          <Text style={styles.segmentDesc}>
            {option.description}
          </Text>
        )}
      </TouchableOpacity>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    padding: 3,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
    borderRadius: 9,
  },
  segmentLeft: {
    marginRight: 1,
  },
  segmentRight: {
    marginLeft: 1,
  },
  segmentActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentText: {
    fontSize: 15,  // base
    fontWeight: '600',  // semibold
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  segmentTextActive: {
    color: '#1B5E3F',
  },
  segmentDesc: {
    fontSize: 13,  // sm (adjusted up)
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },
});