import fs from 'fs';
import path from 'path';

describe('app config contract', () => {
  it('keeps the bundled adhan sound assets configured for notifications', () => {
    const appConfig = require('../../app.config.js').default;
    const notificationsPlugin = appConfig.expo.plugins.find(
      (plugin: any) => Array.isArray(plugin) && plugin[0] === 'expo-notifications'
    );

    expect(notificationsPlugin[1].sounds).toEqual([
      './assets/sounds/adhan_short.ogg',
      './assets/sounds/adhan_ios.caf',
      './assets/sounds/adhan_full.mp3',
    ]);
  });

  it('declares expo-audio with explicit playback-related config', () => {
    const appConfig = require('../../app.config.js').default;
    const audioPlugin = appConfig.expo.plugins.find(
      (plugin: any) => Array.isArray(plugin) && plugin[0] === 'expo-audio'
    );

    expect(audioPlugin[1]).toMatchObject({
      microphonePermission: false,
      recordAudioAndroid: false,
      enableBackgroundPlayback: true,
    });
  });

  it('keeps Android release minification enabled through expo-build-properties', () => {
    const appConfig = require('../../app.config.js').default;
    const buildPropertiesPlugin = appConfig.expo.plugins.find(
      (plugin: any) => Array.isArray(plugin) && plugin[0] === 'expo-build-properties'
    );

    expect(buildPropertiesPlugin[1].android).toMatchObject({
      enableMinifyInReleaseBuilds: true,
      enableShrinkResourcesInReleaseBuilds: true,
    });
  });

  it('keeps Android foreground media playback permissions and the AdhanService declaration', () => {
    const manifestPath = path.join(
      __dirname,
      '../../android/app/src/main/AndroidManifest.xml'
    );
    const manifest = fs.readFileSync(manifestPath, 'utf8');

    expect(manifest).toContain('android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK');
    expect(manifest).toContain('android:name=".AdhanService"');
    expect(manifest).toContain('android:foregroundServiceType="mediaPlayback"');
    expect(manifest).toContain('android:name=".AdhanAlarmReceiver"');
  });
});
