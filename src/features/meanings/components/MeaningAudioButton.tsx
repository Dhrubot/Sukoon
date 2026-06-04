// MeaningAudioButton — play/pause button for a bundled meaning audio clip.
//
// Phase 6 infrastructure: renders nothing when no audio asset is bundled yet
// (audioAsset === null). When a real asset is available, provides play/pause
// with a progress bar and auto-reset on completion.

import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useThemedStyles } from '../../../hooks/useThemedStyles';
import { AppTheme } from '../../../theme';
import logger from '../../../utils/logger';
import MeaningsService from '../services/MeaningsService';

export interface MeaningAudioButtonProps {
  meaningId: string;
}

// Inner component that only mounts when an audioAsset is present.
// Keeps hook calls unconditional (Rules of Hooks).
const AudioButtonInner: React.FC<{ audioAsset: number }> = ({ audioAsset }) => {
  const styles = useThemedStyles(createStyles);

  const player = useAudioPlayer(audioAsset);
  const status = useAudioPlayerStatus(player);

  // Auto-reset to start when the clip finishes.
  useEffect(() => {
    if (status.didJustFinish) {
      try {
        player.seekTo(0);
      } catch (e) {
        logger.warn('MeaningAudioButton: seek after finish failed', e);
      }
    }
  }, [status.didJustFinish, player]);

  const handlePress = () => {
    try {
      if (status.playing) {
        player.pause();
      } else {
        player.play();
      }
    } catch (e) {
      logger.error('MeaningAudioButton: playback toggle failed', e);
    }
  };

  const isDisabled = !status.isLoaded;

  // Progress ratio (0–1), guarded against division by zero.
  const progress =
    status.duration > 0 ? Math.min(status.currentTime / status.duration, 1) : 0;

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={[styles.button, isDisabled && styles.buttonDisabled]}
        onPress={handlePress}
        activeOpacity={0.75}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pause audio' : 'Play audio'}
        accessibilityState={{ disabled: isDisabled }}
      >
        <Text style={styles.icon}>{status.playing ? '⏸' : '▶'}</Text>
      </TouchableOpacity>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { flex: progress }]} />
        {/* Spacer to fill the remainder */}
        <View style={{ flex: 1 - progress }} />
      </View>
    </View>
  );
};

export const MeaningAudioButton: React.FC<MeaningAudioButtonProps> = ({ meaningId }) => {
  const audioAsset = MeaningsService.resolveAudioAsset(meaningId);

  if (audioAsset === null) {
    return null;
  }

  return <AudioButtonInner audioAsset={audioAsset} />;
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    wrapper: {
      alignItems: 'center',
      marginVertical: theme.spacing.md,
    },
    button: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.meanings.audioBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonDisabled: {
      opacity: 0.4,
    },
    icon: {
      fontSize: 18,
      color: theme.colors.meanings.audioIcon,
      lineHeight: 22,
    },
    progressTrack: {
      flexDirection: 'row',
      height: 3,
      width: 160,
      borderRadius: 2,
      backgroundColor: theme.colors.meanings.audioProgressTrack,
      marginTop: theme.spacing.sm,
      overflow: 'hidden',
    },
    progressFill: {
      height: 3,
      backgroundColor: theme.colors.meanings.audioProgressFill,
      borderRadius: 2,
    },
  });

export default MeaningAudioButton;
