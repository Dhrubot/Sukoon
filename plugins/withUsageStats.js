const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withUsageStats(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const mainApplication = androidManifest.manifest.application[0];

    // Add the UsageStatsModule package to MainApplication
    if (!mainApplication.$?.['meta-data']) {
      mainApplication.$['meta-data'] = [];
    }

    // Add necessary permissions
    const permissions = androidManifest.manifest['uses-permission'] || [];

    // Check if the permission already exists
    const hasUsageStatsPermission = permissions.some(
      (permission) => 
        permission.$['android:name'] === 'android.permission.PACKAGE_USAGE_STATS'
    );

    if (!hasUsageStatsPermission) {
      permissions.push({
        $: {
          'android:name': 'android.permission.PACKAGE_USAGE_STATS',
          'tools:ignore': 'ProtectedPermissions',
        },
      });
    }

    // Make sure tools namespace is added to manifest tag
    const manifestTag = androidManifest.manifest.$;
    manifestTag['xmlns:tools'] = 'http://schemas.android.com/tools';

    // Add permissions to the manifest
    androidManifest.manifest['uses-permission'] = permissions;
    
    return config;
  });
};
