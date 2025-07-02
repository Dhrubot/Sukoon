const { withPodfile } = require('@expo/config-plugins');

const withModularHeaders = (config) => {
  return withPodfile(config, (config) => {
    const podfileContent = config.modResults.contents;
    
    // Check if use_modular_headers! is already added
    if (!podfileContent.includes('use_modular_headers!')) {
      // Add use_modular_headers! after the install! line
      config.modResults.contents = podfileContent.replace(
        /install! 'cocoapods',[\s\S]*?:deterministic_uuids => false/,
        (match) => `${match}\n\nuse_modular_headers!`
      );
    }
    
    return config;
  });
};

module.exports = withModularHeaders;