// src/components/settings/SegmentedControl.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';

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
}) => {
  const styles = useThemedStyles(createStyles);
  return (
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
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: theme.colors.settings.optionBg,
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
    backgroundColor: theme.colors.settings.sectionBg,
    shadowColor: theme.colors.settings.modalShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  segmentTextActive: {
    color: theme.colors.primary.DEFAULT,
  },
  segmentDesc: {
    fontSize: 13,
    color: theme.colors.text.muted,
    textAlign: 'center',
    lineHeight: 16,
  },
});