const { withGradleProperties } = require('@expo/config-plugins');
const { execSync } = require('child_process');

const withNodePath = (config) => {
  return withGradleProperties(config, (config) => {
    // Get the Node.js path
    let nodePath;
    try {
      // Try to get node path from current environment
      nodePath = execSync('which node', { encoding: 'utf8' }).trim();
    } catch (error) {
      // Fallback paths for common Node.js installations
      const possiblePaths = [
        process.execPath, // Current Node.js executable
        '/usr/local/bin/node',
        '/opt/homebrew/bin/node',
        '/usr/bin/node'
      ];
      
      for (const testPath of possiblePaths) {
        try {
          execSync(`${testPath} --version`, { encoding: 'utf8' });
          nodePath = testPath;
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
      
      // Also try adding React Native specific properties
      config.modResults.push({
        type: 'property',
        key: 'react.native.node.executable',
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