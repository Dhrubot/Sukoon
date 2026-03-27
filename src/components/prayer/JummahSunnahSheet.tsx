import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { AppTheme } from '../../theme';
import {
  JUMMAH_GHUSL_SECTIONS,
  JUMMAH_RESOURCE_COPY,
  JUMMAH_SALAWAT_SECTIONS,
  JummahResourceSection,
  JummahResourceTopic,
} from '../../constants/jummahContent';
import {
  JummahSurahAyah,
  SURAH_AL_KAHF_AYAHS,
} from '../../constants/surahAlKahf';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface JummahSunnahSheetProps {
  visible: boolean;
  topic: JummahResourceTopic | null;
  onDismiss: () => void;
}

type SheetSection = JummahResourceSection | JummahSurahAyah;

const isSurahAyah = (section: SheetSection): section is JummahSurahAyah =>
  'numberInSurah' in section;

const JummahSunnahSheet: React.FC<JummahSunnahSheetProps> = ({
  visible,
  topic,
  onDismiss,
}) => {
  const styles = useThemedStyles(createStyles);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [backdropAnim, slideAnim, visible]);

  useEffect(() => {
    if (!visible) {
      setExpandedIds(new Set());
      return;
    }

    if (topic !== 'kahf') {
      setExpandedIds(new Set());
    }
  }, [topic, visible]);

  const copy = topic ? JUMMAH_RESOURCE_COPY[topic] : null;

  const sections = useMemo<SheetSection[]>(() => {
    if (!topic) return [];
    if (topic === 'kahf') return SURAH_AL_KAHF_AYAHS;
    if (topic === 'ghusl') return JUMMAH_GHUSL_SECTIONS;
    return JUMMAH_SALAWAT_SECTIONS;
  }, [topic]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (!topic || !copy) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.modalContainer}>
        <TouchableWithoutFeedback onPress={onDismiss}>
          <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
        </TouchableWithoutFeedback>

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.eyebrow}>JUMU&apos;AH</Text>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.subtitle}>{copy.subtitle}</Text>
            <Text style={styles.hint}>{copy.hint}</Text>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {sections.map((section) => {
              const isExpanded = expandedIds.has(section.id);
              const cardLabel = isSurahAyah(section)
                ? `Ayah ${section.numberInSurah}`
                : section.label;

              return (
                <TouchableOpacity
                  key={section.id}
                  style={styles.sectionCard}
                  activeOpacity={0.85}
                  onPress={() => toggleExpanded(section.id)}
                >
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionLabel}>{cardLabel}</Text>
                    <Text style={styles.sectionToggle}>
                      {isExpanded ? 'Show less' : 'Read more'}
                    </Text>
                  </View>

                  {'arabic' in section && section.arabic ? (
                    <Text
                      style={styles.arabicText}
                      numberOfLines={isExpanded ? undefined : 3}
                    >
                      {section.arabic}
                    </Text>
                  ) : null}

                  {'transliteration' in section && section.transliteration && isExpanded ? (
                    <Text style={styles.transliterationText}>
                      {section.transliteration}
                    </Text>
                  ) : null}

                  <Text
                    style={styles.translationText}
                    numberOfLines={isExpanded ? undefined : 3}
                  >
                    {section.translation}
                    {!isExpanded ? <Text style={styles.expandHint}> Read more</Text> : null}
                  </Text>

                  {'reference' in section && section.reference ? (
                    <Text style={styles.referenceText}>{section.reference}</Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissButtonText}>Close</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.background.overlay,
    },
    sheet: {
      maxHeight: SCREEN_HEIGHT * 0.86,
      backgroundColor: theme.colors.card.background,
      borderTopLeftRadius: theme.borderRadius.xl,
      borderTopRightRadius: theme.borderRadius.xl,
      paddingTop: theme.spacing.md,
      paddingHorizontal: theme.spacing['2xl'],
      paddingBottom: theme.spacing['3xl'],
    },
    handle: {
      width: theme.spacing['4xl'],
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.border.primary,
      alignSelf: 'center',
      marginBottom: theme.spacing.lg,
    },
    header: {
      marginBottom: theme.spacing.lg,
      gap: theme.spacing.xs,
    },
    eyebrow: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.bodyBold,
      letterSpacing: 2,
      color: theme.colors.gold,
    },
    title: {
      fontSize: theme.typography.fontSize['3xl'],
      fontFamily: theme.typography.fontFamily.heading,
      color: theme.colors.text.primary,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      lineHeight: 20,
    },
    hint: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.muted,
      lineHeight: 18,
    },
    scrollView: {
      flexGrow: 0,
    },
    scrollContent: {
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.md,
    },
    sectionCard: {
      backgroundColor: theme.colors.background.secondary,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    sectionLabel: {
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.gold,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    sectionToggle: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.text.muted,
    },
    arabicText: {
      fontSize: theme.typography.fontSize['2xl'],
      fontFamily: theme.typography.fontFamily.arabic,
      color: theme.colors.text.primary,
      textAlign: 'right',
      lineHeight: 42,
    },
    transliterationText: {
      fontSize: theme.typography.fontSize.sm,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.secondary,
      lineHeight: 22,
      fontStyle: 'italic',
    },
    translationText: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.primary,
      lineHeight: 24,
    },
    expandHint: {
      color: theme.colors.text.muted,
      fontFamily: theme.typography.fontFamily.bodyMedium,
    },
    referenceText: {
      fontSize: theme.typography.fontSize.xs,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.text.muted,
      lineHeight: 18,
    },
    dismissButton: {
      marginTop: theme.spacing.sm,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
    },
    dismissButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.text.primary,
    },
  });

export default JummahSunnahSheet;
