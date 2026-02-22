// src/components/HijriNudgeCard.tsx
// Persistent soft card shown during days 1–3 of Ramadan, Shawwal, Dhul Hijjah
// when the user hasn't confirmed the moon sighting. Non-intrusive — one tap fixes it.

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { AppTheme } from '../theme';
import { useStore } from '../store/useStore';
import { HijriNudgeEvent, confirmMoonSighting } from '../utils/moonSighting';

interface HijriNudgeCardProps {
  nudge: HijriNudgeEvent;
  onDismissed: () => void;
}

const HijriNudgeCard: React.FC<HijriNudgeCardProps> = ({ nudge, onDismissed }) => {
  const styles = useThemedStyles(createStyles);
  const { updateUserSettings } = useStore();

  const handleAdjust = (offset: -1 | 0 | 1) => {
    updateUserSettings({ hijriAdjustment: offset });
    confirmMoonSighting(nudge.type, nudge.currentYear);
    onDismissed();
  };

  return (
    <View style={styles.card}>
      <Text style={styles.question}>
        Is today {nudge.currentDay} {nudge.currentMonth}?
      </Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.adjustButton}
          onPress={() => handleAdjust(-1)}
          activeOpacity={0.7}
        >
          <Text style={styles.adjustButtonText}>−1 Day</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.adjustButton, styles.correctButton]}
          onPress={() => handleAdjust(0)}
          activeOpacity={0.7}
        >
          <Text style={[styles.adjustButtonText, styles.correctButtonText]}>Correct</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.adjustButton}
          onPress={() => handleAdjust(1)}
          activeOpacity={0.7}
        >
          <Text style={styles.adjustButtonText}>+1 Day</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.card.background,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginHorizontal: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    question: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text.primary,
      textAlign: 'center',
      marginBottom: 12,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 10,
    },
    adjustButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      alignItems: 'center',
    },
    adjustButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.text.secondary,
    },
    correctButton: {
      backgroundColor: theme.colors.primary.DEFAULT,
      borderColor: theme.colors.primary.DEFAULT,
    },
    correctButtonText: {
      color: theme.colors.primary.contrast,
    },
  });

export default HijriNudgeCard;
