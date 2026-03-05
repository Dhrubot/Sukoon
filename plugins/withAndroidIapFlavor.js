const { withAppBuildGradle } = require('@expo/config-plugins');

const withAndroidIapFlavor = (config) => {
  return withAppBuildGradle(config, (config) => {
    let buildGradleContent = config.modResults.contents;
    
    // Check if the strategy is already added
    if (!buildGradleContent.includes("missingDimensionStrategy 'store'")) {
      // Look for the versionName line and add the strategy after it
      const versionNamePattern = /(versionName\s+["'][^"']*["'])/;
      
      if (versionNamePattern.test(buildGradleContent)) {
        buildGradleContent = buildGradleContent.replace(
          versionNamePattern,
          `$1\n        missingDimensionStrategy 'store', 'play'`
        );
      } else {
        // Fallback: add it right after the defaultConfig { line
        buildGradleContent = buildGradleContent.replace(
          /(defaultConfig\s*{\s*)/,
          `$1\n        missingDimensionStrategy 'store', 'play'`
        );
      }
      
      config.modResults.contents = buildGradleContent;
    }
    
    return config;
  });
};

module.exports = withAndroidIapFlavor;