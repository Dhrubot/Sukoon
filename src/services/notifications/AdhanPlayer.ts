// src/services/notifications/AdhanPlayer.ts
// Extracted from NotificationService: Adhan audio playback

import { createAudioPlayer, AudioPlayer, setAudioModeAsync } from 'expo-audio';
import logger from '../../utils/logger';

class AdhanPlayer {
  private audioPlayer: AudioPlayer | null = null;
  private audioPlayerListener: (() => void) | null = null;

  /**
   * Configure audio mode for Adhan playback (allows playing in silent mode).
   */
  async configureAudioMode(): Promise<void> {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
      });
    } catch (e) {
      logger.warn('⚠️ Failed to set audio mode:', e);
    }
  }

  /**
   * Play the full Adhan audio clip.
   */
  play(): void {
    try {
      this.stop(); // Stop any existing sound first

      const source = require('../../../assets/sounds/adhan_full.mp3');
      this.audioPlayer = createAudioPlayer(source);
      this.audioPlayer.play();
      logger.log('🔊 Playing full Adhan in foreground');

      // Store listener subscription for cleanup
      const subscription = this.audioPlayer.addListener('playbackStatusUpdate', (status) => {
        if (status.isLoaded && status.didJustFinish) {
          this.stop();
        }
      });
      this.audioPlayerListener = () => subscription.remove();
    } catch (error) {
      logger.error('❌ Error playing Adhan:', error);
    }
  }

  /**
   * Stop any currently playing Adhan and clean up resources.
   */
  stop(): void {
    if (this.audioPlayerListener) {
      try {
        this.audioPlayerListener();
      } catch (e) {
        // Ignore errors if already cleaned up
      }
      this.audioPlayerListener = null;
    }

    if (this.audioPlayer) {
      try {
        this.audioPlayer.pause();
        this.audioPlayer.seekTo(0);
        this.audioPlayer.remove();
        this.audioPlayer = null;
      } catch (e) {
        // Ignore errors if already cleaned up
      }
    }
  }
}

export default new AdhanPlayer();
