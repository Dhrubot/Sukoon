// src/screens/Adhkar/AdhkarScreen.tsx
//
// Morning & Evening Adhkar screen — guides the user through authentic
// daily remembrances from Hisnul Muslim using the reusable DhikrCounter.

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import DhikrCounter from '../../components/mindfulness/DhikrCounter';
import { MORNING_ADHKAR, EVENING_ADHKAR } from '../../constants/adhkarData';

type AdhkarType = 'morning' | 'evening';

const getDefaultType = (): AdhkarType => {
  const hour = new Date().getHours();
  // Before 3 PM → morning adhkar, after → evening
  return hour < 15 ? 'morning' : 'evening';
};

const AdhkarScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation();

  const [adhkarType, setAdhkarType] = useState<AdhkarType>(getDefaultType);
  const [completed, setCompleted] = useState(false);
  const [key, setKey] = useState(0); // forces DhikrCounter remount on toggle

  const items = useMemo(
    () => (adhkarType === 'morning' ? MORNING_ADHKAR : EVENING_ADHKAR),
    [adhkarType],
  );

  const handleToggle = useCallback(
    (type: AdhkarType) => {
      if (type === adhkarType) return;
      setAdhkarType(type);
      setCompleted(false);
      setKey((k) => k + 1);
    },
    [adhkarType],
  );

  const handleComplete = useCallback(() => {
    setCompleted(true);
  }, []);

  const handleSkip = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleDone = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  if (completed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.completionContainer}>
          <Text style={styles.completionTitle}>
            {adhkarType === 'morning'
              ? 'Your morning remembrance is complete'
              : 'Your evening remembrance is complete'}
          </Text>
          <Text style={styles.completionSubtitle}>
            May Allah accept your dhikr
          </Text>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={handleDone}
            activeOpacity={0.7}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Toggle pills */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.togglePill,
            adhkarType === 'morning' && styles.togglePillActive,
          ]}
          onPress={() => handleToggle('morning')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.toggleText,
              adhkarType === 'morning' && styles.toggleTextActive,
            ]}
          >
            Morning
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.togglePill,
            adhkarType === 'evening' && styles.togglePillActive,
          ]}
          onPress={() => handleToggle('evening')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.toggleText,
              adhkarType === 'evening' && styles.toggleTextActive,
            ]}
          >
            Evening
          </Text>
        </TouchableOpacity>
      </View>

      {/* Dhikr counter */}
      <View style={styles.counterContainer}>
        <DhikrCounter
          key={key}
          items={items}
          onComplete={handleComplete}
          onSkip={handleSkip}
        />
      </View>
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },
    toggleRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing['2xl'],
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    togglePill: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xl,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.card.background,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    togglePillActive: {
      backgroundColor: theme.colors.primary.DEFAULT,
      borderColor: theme.colors.primary.DEFAULT,
    },
    toggleText: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: '500',
      color: theme.colors.text.secondary,
    },
    toggleTextActive: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
    counterContainer: {
      flex: 1,
    },
    completionContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing['3xl'],
    },
    completionTitle: {
      fontSize: theme.typography.fontSize['2xl'],
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.heading,
      color: theme.colors.text.primary,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    completionSubtitle: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      fontStyle: 'italic',
      marginBottom: theme.spacing['4xl'],
    },
    doneButton: {
      backgroundColor: theme.colors.primary.DEFAULT,
      borderRadius: theme.borderRadius.lg,
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing['4xl'],
    },
    doneButtonText: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });

export default AdhkarScreen;
