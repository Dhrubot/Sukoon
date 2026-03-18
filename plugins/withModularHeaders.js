const { withPodfile } = require('@expo/config-plugins');

const withModularHeaders = (config) =>
  withPodfile(config, (config) => {
    const podfileContent = config.modResults.contents;

    if (!podfileContent.includes('use_modular_headers!')) {
      config.modResults.contents = podfileContent.replace(
        /prepare_react_native_project!\n/,
        (match) => `${match}\nuse_modular_headers!\n\n`
      );
    }

    return config;
  });

module.exports = withModularHeaders;