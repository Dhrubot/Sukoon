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

  it('keeps Android release minification DISABLED through expo-build-properties (crash-symbol stability — see eas-submit-guide.md)', () => {
    const appConfig = require('../../app.config.js').default;
    const buildPropertiesPlugin = appConfig.expo.plugins.find(
      (plugin: any) => Array.isArray(plugin) && plugin[0] === 'expo-build-properties'
    );

    // We intentionally ship Android production with minify=false (and shrinkResources=false)
    // so that R8/ProGuard does not strip native crash symbols. If you flip this back to true,
    // you must also wire ProGuard rules for our native AdhanService + MosqueMode receivers
    // AND update eas.json/eas-submit-guide.md accordingly.
    expect(buildPropertiesPlugin[1].android).toMatchObject({
      enableMinifyInReleaseBuilds: false,
      enableShrinkResourcesInReleaseBuilds: false,
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
