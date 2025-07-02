const { withGradleProperties } = require('@expo/config-plugins');
const { execSync } = require('child_process');

const withNodePath = (config) => {
  return withGradleProperties(config, (config) => {
    // Get the Node.js path
    let nodePath;
    try {
      nodePath = execSync('which node', { encoding: 'utf8' }).trim();
    } catch (error) {
      // Fallback paths for common Node.js installations
      const possiblePaths = [
        '/usr/local/bin/node',
        '/opt/homebrew/bin/node',
        '/usr/bin/node',
        process.execPath
      ];
      
      for (const path of possiblePaths) {
        try {
          execSync(`${path} --version`, { encoding: 'utf8' });
          nodePath = path;
          break;
        } catch (e) {
          // Continue to next path
        }
      }
    }
    
    if (nodePath) {
      // Add Node.js path to gradle.properties
      config.modResults.push({
        type: 'property',
        key: 'hermesCommand',
        value: nodePath,
      });
      
      config.modResults.push({
        type: 'property', 
        key: 'nodeExecutableAndArgs',
        value: nodePath,
      });
      
      console.log(`✅ Added Node.js path to gradle.properties: ${nodePath}`);
    } else {
      console.warn('⚠️ Could not find Node.js path');
    }
    
    return config;
  });
};

module.exports = withNodePath;