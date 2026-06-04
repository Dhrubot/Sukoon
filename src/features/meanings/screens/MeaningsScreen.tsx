// MeaningsScreen — browse view for the prayer-meanings library.
//
// Filter chips by salah position, search by translation/transliteration,
// list of MeaningCards (compact variant). Tapping a card pushes
// MeaningDetail. The screen is unaware of how it was launched —
// can be opened from Reflection Garden, Menu row, or anywhere.

import React, { useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { useThemedStyles } from '../../../hooks/useThemedStyles';
import { AppTheme } from '../../../theme';
import type { MenuStackParamList } from '../../../navigation/MenuStackNavigator';
import { MeaningCard } from '../components';
import MeaningsService from '../services/MeaningsService';
import type { Meaning, PrayerPosition } from '../content/schema';

type PositionFilter = PrayerPosition | 'all';

const FILTERS: { key: PositionFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'opening', label: 'Opening' },
  { key: 'standing', label: 'Standing' },
  { key: 'ruku', label: 'Ruku' },
  { key: 'sujood', label: 'Sujood' },
  { key: 'sitting', label: 'Sitting' },
  { key: 'taslim', label: 'Taslim' },
];

type NavProp = StackNavigationProp<MenuStackParamList, 'Meanings'>;

const MeaningsScreen: React.FC = () => {
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<NavProp>();
  const [filter, setFilter] = useState<PositionFilter>('all');
  const [query, setQuery] = useState('');

  // Record screen-open for implicit opt-in (no-op in Phase 3, real in Phase 4).
  React.useEffect(() => {
    MeaningsService.recordScreenOpen();
  }, []);

  const all = useMemo(() => MeaningsService.getAll(), []);
  const filtered = useMemo<Meaning[]>(() => {
    let result = all;
    if (filter !== 'all') {
      result = result.filter((m) => m.position === filter);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((m) => {
        if (m.title.toLowerCase().includes(q)) return true;
        if (m.transliteration.toLowerCase().includes(q)) return true;
        const t = m.translations.en;
        if (t?.translation.toLowerCase().includes(q)) return true;
        return false;
      });
    }
    return result;
  }, [all, filter, query]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.intro}>
          The words you say in every prayer — what they mean, line by line.
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search words or meanings..."
          placeholderTextColor={styles.searchPlaceholderColor.color}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {FILTERS.map((f) => {
          const active = f.key === filter;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <MeaningCard
            meaning={item}
            variant="compact"
            onPress={() => navigation.navigate('MeaningDetail', { id: item.id })}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No matches. Try a different search.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background.primary },
    header: {
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    intro: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      lineHeight: 22,
    },
    searchWrap: {
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    searchInput: {
      backgroundColor: theme.colors.meanings.searchBg,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.meanings.searchBorder,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.meanings.searchText,
    },
    // RN doesn't accept dynamic placeholderTextColor cleanly via StyleSheet,
    // so we expose it as a separate "color" we can reference at the prop site.
    searchPlaceholderColor: { color: theme.colors.meanings.searchPlaceholder },
    chipsRow: {
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    chip: {
      backgroundColor: theme.colors.meanings.chipBg,
      borderRadius: 999,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
      marginRight: theme.spacing.sm,
    },
    chipActive: {
      backgroundColor: theme.colors.meanings.chipActiveBg,
    },
    chipText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.meanings.chipText,
    },
    chipTextActive: {
      color: theme.colors.meanings.chipActiveText,
      fontFamily: theme.typography.fontFamily.bodySemibold,
    },
    listContent: {
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing['2xl'],
    },
    empty: {
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing['2xl'],
      alignItems: 'center',
    },
    emptyText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.muted,
    },
  });

export default MeaningsScreen;
