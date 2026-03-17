jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import AdhanPlayer from '../services/notifications/AdhanPlayer';

describe('AdhanPlayer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AdhanPlayer.stop();
  });

  it('configures audio mode for silent mode and background playback', async () => {
    await AdhanPlayer.configureAudioMode();

    expect(setAudioModeAsync).toHaveBeenCalledWith({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    });
  });

  it('creates and plays a foreground audio player', () => {
    AdhanPlayer.play();

    expect(createAudioPlayer).toHaveBeenCalledTimes(1);

    const player = (createAudioPlayer as jest.Mock).mock.results[0].value;
    expect(player.play).toHaveBeenCalledTimes(1);
    expect(player.addListener).toHaveBeenCalledWith(
      'playbackStatusUpdate',
      expect.any(Function)
    );
  });

  it('cleans up and fires completion callback when playback finishes', () => {
    const onComplete = jest.fn();

    AdhanPlayer.play(onComplete);

    const player = (createAudioPlayer as jest.Mock).mock.results[0].value;
    player.__emit('playbackStatusUpdate', { isLoaded: true, didJustFinish: true });

    expect(player.pause).toHaveBeenCalledTimes(1);
    expect(player.seekTo).toHaveBeenCalledWith(0);
    expect(player.remove).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('stops the existing player before starting a new one', () => {
    AdhanPlayer.play();
    const firstPlayer = (createAudioPlayer as jest.Mock).mock.results[0].value;

    AdhanPlayer.play();

    expect(firstPlayer.pause).toHaveBeenCalledTimes(1);
    expect(createAudioPlayer).toHaveBeenCalledTimes(2);
  });

  it('supports repeated stop calls without throwing', () => {
    AdhanPlayer.play();

    expect(() => {
      AdhanPlayer.stop();
      AdhanPlayer.stop();
    }).not.toThrow();
  });
});
