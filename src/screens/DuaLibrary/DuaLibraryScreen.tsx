// src/screens/DuaLibrary/DuaLibraryScreen.tsx
//
// Browsable Hisnul Muslim dua library — category chips, search,
// expandable cards with Arabic, transliteration, translation, and share.

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Share,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../providers/ThemeProvider';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import {
  DUA_LIBRARY,
  DUA_CATEGORIES,
  Dua,
  DuaCategory,
} from '../../constants/duaLibrary';

const DuaLibraryScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const [selectedCategory, setSelectedCategory] = useState<DuaCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Dua of the Day — rotates based on day of year
  const duaOfTheDay = useMemo(() => {
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    return DUA_LIBRARY[dayOfYear % DUA_LIBRARY.length];
  }, []);

  const filteredDuas = useMemo(() => {
    let result = DUA_LIBRARY;
    if (selectedCategory !== 'all') {
      result = result.filter((d) => d.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.translation.toLowerCase().includes(q) ||
          d.transliteration.toLowerCase().includes(q) ||
          d.reference.toLowerCase().includes(q),
      );
    }
    return result;
  }, [selectedCategory, searchQuery]);

  const toggleExpand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleShare = useCallback(async (dua: Dua) => {
    try {
      await Share.share({
        message: `${dua.translation}\n\n${dua.arabic}\n\n${dua.transliteration}\n\n- ${dua.reference}\n\nShared via Sukoon`,
      });
    } catch (error) {
      console.error('Error sharing dua:', error);
    }
  }, []);

  const renderDuaCard = useCallback(
    ({ item }: { item: Dua }) => {
      const isExpanded = expandedIds.has(item.id);
      const isDuaOfDay = item.id === duaOfTheDay.id && selectedCategory === 'all' && !searchQuery;

      return (
        <TouchableOpacity
          style={[styles.duaCard, isDuaOfDay && styles.duaCardHighlight]}
          onPress={() => toggleExpand(item.id)}
          activeOpacity={0.8}
        >
          {isDuaOfDay && (
            <Text style={styles.duaOfDayLabel}>Dua of the Day</Text>
          )}

          <Text style={styles.duaArabic}>{item.arabic}</Text>

          {isExpanded && (
            <>
              <Text style={styles.duaTransliteration}>
                {item.transliteration}
              </Text>
            </>
          )}

          <Text style={styles.duaTranslation}>{item.translation}</Text>
          <View style={styles.duaFooter}>
            <Text style={styles.duaReference}>{item.reference}</Text>
            <TouchableOpacity
              onPress={() => handleShare(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.shareLink}>Share</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [expandedIds, duaOfTheDay, selectedCategory, searchQuery, styles, toggleExpand, handleShare],
  );

  const keyExtractor = useCallback((item: Dua) => String(item.id), []);

  const listHeader = (
    <>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search duas..."
          placeholderTextColor={theme.colors.text.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        <TouchableOpacity
          style={[
            styles.chip,
            selectedCategory === 'all' && styles.chipActive,
          ]}
          onPress={() => setSelectedCategory('all')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.chipText,
              selectedCategory === 'all' && styles.chipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {DUA_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.chip,
              selectedCategory === cat.key && styles.chipActive,
            ]}
            onPress={() => setSelectedCategory(cat.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                selectedCategory === cat.key && styles.chipTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={filteredDuas}
        keyExtractor={keyExtractor}
        renderItem={renderDuaCard}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No duas found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.primary,
    },
    searchRow: {
      paddingHorizontal: theme.spacing['2xl'],
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xs,
    },
    searchInput: {
      backgroundColor: theme.colors.card.background,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      fontFamily: theme.typography.fontFamily.body,
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.text.primary,
    },
    chipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing['2xl'],
      paddingTop: theme.spacing.xs,
      paddingBottom: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    chip: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.card.background,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    chipActive: {
      backgroundColor: theme.colors.primary.DEFAULT,
      borderColor: theme.colors.primary.DEFAULT,
    },
    chipText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.text.secondary,
      lineHeight: 18,
    },
    chipTextActive: {
      color: theme.colors.text.inverse ?? '#FFFFFF',
      fontFamily: theme.typography.fontFamily.bodySemibold,
    },
    listContent: {
      paddingHorizontal: theme.spacing['2xl'],
      paddingBottom: theme.spacing['4xl'],
    },
    duaCard: {
      backgroundColor: theme.colors.card.background,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    duaCardHighlight: {
      borderColor: theme.colors.primary.DEFAULT,
      borderWidth: 2,
    },
    duaOfDayLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.primary.DEFAULT,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: theme.spacing.sm,
    },
    duaArabic: {
      fontSize: theme.typography.fontSize['2xl'] + 2,
      color: theme.colors.text.primary,
      textAlign: 'right',
      lineHeight: 38,
      fontFamily: theme.typography.fontFamily.arabic,
      marginBottom: theme.spacing.md,
    },
    duaTransliteration: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.muted,
      fontStyle: 'italic',
      marginBottom: theme.spacing.md,
      lineHeight: 22,
    },
    duaTranslation: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      lineHeight: 22,
      marginBottom: theme.spacing.md,
    },
    duaFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    duaReference: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.muted,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      flex: 1,
    },
    shareLink: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.primary.DEFAULT,
      marginLeft: theme.spacing.md,
    },
    emptyState: {
      alignItems: 'center',
      paddingTop: theme.spacing['4xl'],
    },
    emptyText: {
      fontSize: theme.typography.fontSize.md,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.muted,
    },
  });

export default DuaLibraryScreen;
