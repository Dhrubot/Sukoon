const { withAppBuildGradle } = require('@expo/config-plugins');

const withAndroidIapFlavor = (config) => {
  return withAppBuildGradle(config, (config) => {
    const buildGradleContent = config.modResults.contents;
    
    // Check if the strategy is already added
    if (!buildGradleContent.includes("missingDimensionStrategy 'store'")) {
      // Add the missing dimension strategy to defaultConfig
      config.modResults.contents = buildGradleContent.replace(
        /defaultConfig\s*{[\s\S]*?targetSdkVersion\s+\d+/,
        (match) => `${match}\n        missingDimensionStrategy 'store', 'play'`
      );
    }
    
    return config;
  });
};

module.exports = withAndroidIapFlavor;