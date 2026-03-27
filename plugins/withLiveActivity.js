// plugins/withLiveActivity.js
// Expo config plugin to add iOS Live Activities (ActivityKit) and Android ongoing notification
// for prayer countdown on lock screen / notification shade.

const {
  withInfoPlist,
  withDangerousMod,
  withXcodeProject,
  withMainApplication,
} = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');
const { registerAndroidPackageInMainApplication } = require('./withAndroidPackageRegistration');

const WIDGET_NAME = 'SukoonWidget';
const templatePath = (...parts) => path.join(__dirname, 'templates', ...parts);
const readTemplate = (...parts) => fs.readFileSync(templatePath(...parts), 'utf-8');

// ═══════════════════════════════════════════════════════════════════
// PLUGIN STEPS
// ═══════════════════════════════════════════════════════════════════

/**
 * 1. iOS: Add NSSupportsLiveActivities to Info.plist
 */
const withLiveActivityInfoPlist = (config) => {
  return withInfoPlist(config, (mod) => {
    mod.modResults.NSSupportsLiveActivities = true;
    console.log('✅ Added NSSupportsLiveActivities to Info.plist');
    return mod;
  });
};

/**
 * 2. iOS: Write Swift files to disk
 *    - Live Activity SwiftUI views → widget extension dir
 *    - RN bridge → main app dir
 *    - Update SukoonWidgetBundle to include Live Activity
 */
const withLiveActivityFiles = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosPath = path.join(projectRoot, 'ios');
      const projectName = config.modRequest.projectName || 'Sukoon';

      // --- Widget extension: Live Activity views ---
      const widgetPath = path.join(iosPath, WIDGET_NAME);
      if (!fs.existsSync(widgetPath)) {
        fs.mkdirSync(widgetPath, { recursive: true });
      }

      fs.writeFileSync(
        path.join(widgetPath, 'SukoonLiveActivity.swift'),
        readTemplate('ios', 'widget', 'SukoonLiveActivity.swift'),
        'utf-8'
      );
      console.log('✅ Created SukoonLiveActivity.swift in widget extension');

      // Update SukoonWidgetBundle.swift to include Live Activity
      const bundlePath = path.join(widgetPath, 'SukoonWidgetBundle.swift');
      const updatedBundle = readTemplate('ios', 'widget', 'SukoonWidgetBundle.swift');
      fs.writeFileSync(bundlePath, updatedBundle, 'utf-8');
      console.log('✅ Updated SukoonWidgetBundle.swift with Live Activity');

      // --- Main app: RN bridge files ---
      const mainAppPath = path.join(iosPath, projectName);
      if (!fs.existsSync(mainAppPath)) {
        fs.mkdirSync(mainAppPath, { recursive: true });
      }

      fs.writeFileSync(
        path.join(mainAppPath, 'SukoonLiveActivityBridge.swift'),
        readTemplate('ios', 'app', 'SukoonLiveActivityBridge.swift'),
        'utf-8'
      );
      console.log('✅ Created SukoonLiveActivityBridge.swift');

      fs.writeFileSync(
        path.join(mainAppPath, 'SukoonLiveActivityBridge.m'),
        readTemplate('ios', 'app', 'SukoonLiveActivityBridge.m'),
        'utf-8'
      );
      console.log('✅ Created SukoonLiveActivityBridge.m');

      return config;
    },
  ]);
};

/**
 * 3. iOS: Add Live Activity Swift file to the widget target's build phase
 *    and add bridge files to the main app target
 */
const withLiveActivityXcodeConfig = (config) => {
  return withXcodeProject(config, async (config) => {
    const project = config.modResults;
    const projectName = config.modRequest.projectName || 'Sukoon';
    const objects = project.hash.project.objects;
    const genUuid = () => project.generateUuid();

    // --- Add SukoonLiveActivity.swift to widget target's Sources build phase ---
    // Find the widget target
    const nativeTargets = objects['PBXNativeTarget'] || {};
    let widgetTargetUuid = null;
    for (const key of Object.keys(nativeTargets)) {
      if (key.endsWith('_comment')) continue;
      const t = nativeTargets[key];
      if (t && typeof t === 'object' && t.name === `"${WIDGET_NAME}"`) {
        widgetTargetUuid = key;
        break;
      }
    }

    if (widgetTargetUuid) {
      const widgetTarget = nativeTargets[widgetTargetUuid];

      // Find the widget's Sources build phase
      let widgetSourcesPhaseUuid = null;
      if (widgetTarget.buildPhases) {
        for (const bp of widgetTarget.buildPhases) {
          const uuid = bp.value || bp;
          const phase = (objects['PBXSourcesBuildPhase'] || {})[uuid];
          if (phase && typeof phase === 'object') {
            widgetSourcesPhaseUuid = uuid;
            break;
          }
        }
      }

      if (widgetSourcesPhaseUuid) {
        // Create file reference for SukoonLiveActivity.swift
        const fileRefUuid = genUuid();
        const buildFileUuid = genUuid();

        objects['PBXFileReference'][fileRefUuid] = {
          isa: 'PBXFileReference',
          lastKnownFileType: 'sourcecode.swift',
          name: '"SukoonLiveActivity.swift"',
          path: '"SukoonLiveActivity.swift"',
          sourceTree: '"<group>"',
        };
        objects['PBXFileReference'][`${fileRefUuid}_comment`] = 'SukoonLiveActivity.swift';

        objects['PBXBuildFile'][buildFileUuid] = {
          isa: 'PBXBuildFile',
          fileRef: fileRefUuid,
          fileRef_comment: 'SukoonLiveActivity.swift',
        };
        objects['PBXBuildFile'][`${buildFileUuid}_comment`] = 'SukoonLiveActivity.swift in Sources';

        // Add to Sources build phase
        const phase = objects['PBXSourcesBuildPhase'][widgetSourcesPhaseUuid];
        if (phase && phase.files) {
          // Avoid duplicate
          const alreadyAdded = phase.files.some(f =>
            (f.comment || '').includes('SukoonLiveActivity.swift')
          );
          if (!alreadyAdded) {
            phase.files.push({
              value: buildFileUuid,
              comment: 'SukoonLiveActivity.swift in Sources',
            });
          }
        }

        // Add to widget PBXGroup
        const widgetGroupKey = project.findPBXGroupKey({ name: WIDGET_NAME });
        if (widgetGroupKey) {
          const group = objects['PBXGroup'][widgetGroupKey];
          if (group && group.children) {
            const alreadyInGroup = group.children.some(c =>
              (c.comment || '').includes('SukoonLiveActivity.swift')
            );
            if (!alreadyInGroup) {
              group.children.push({
                value: fileRefUuid,
                comment: 'SukoonLiveActivity.swift',
              });
            }
          }
        }

        console.log('✅ Added SukoonLiveActivity.swift to widget Sources build phase');
      } else {
        console.warn('⚠️ Could not find widget Sources build phase');
      }

      // Add ActivityKit framework to widget target
      const fwBuildPhases = widgetTarget.buildPhases || [];
      let fwPhaseUuid = null;
      for (const bp of fwBuildPhases) {
        const uuid = bp.value || bp;
        const phase = (objects['PBXFrameworksBuildPhase'] || {})[uuid];
        if (phase && typeof phase === 'object') {
          fwPhaseUuid = uuid;
          break;
        }
      }

      if (fwPhaseUuid) {
        const fwPhase = objects['PBXFrameworksBuildPhase'][fwPhaseUuid];
        const hasActivityKit = fwPhase.files && fwPhase.files.some(f =>
          (f.comment || '').includes('ActivityKit')
        );
        if (!hasActivityKit) {
          const akRefUuid = genUuid();
          const akBuildFileUuid = genUuid();

          objects['PBXFileReference'][akRefUuid] = {
            isa: 'PBXFileReference',
            lastKnownFileType: 'wrapper.framework',
            name: 'ActivityKit.framework',
            path: 'System/Library/Frameworks/ActivityKit.framework',
            sourceTree: 'SDKROOT',
          };
          objects['PBXFileReference'][`${akRefUuid}_comment`] = 'ActivityKit.framework';

          objects['PBXBuildFile'][akBuildFileUuid] = {
            isa: 'PBXBuildFile',
            fileRef: akRefUuid,
            fileRef_comment: 'ActivityKit.framework',
          };
          objects['PBXBuildFile'][`${akBuildFileUuid}_comment`] = 'ActivityKit.framework in Frameworks';

          fwPhase.files.push({
            value: akBuildFileUuid,
            comment: 'ActivityKit.framework in Frameworks',
          });

          // Add to Frameworks group
          const fwGroupKey = project.findPBXGroupKey({ name: 'Frameworks' });
          if (fwGroupKey && objects['PBXGroup'][fwGroupKey]) {
            objects['PBXGroup'][fwGroupKey].children.push({
              value: akRefUuid,
              comment: 'ActivityKit.framework',
            });
          }

          console.log('✅ Added ActivityKit.framework to widget target');
        }
      }
    } else {
      console.log('ℹ️ Widget target not available yet; withWidget will attach the Live Activity source during widget target creation');
    }

    // --- Add bridge files to main app target ---
    const mainTarget = project.getFirstTarget();
    const mainGroupKey = project.findPBXGroupKey({ name: projectName });
    if (mainGroupKey && mainTarget) {
      // Check if already added
      const bridgeFiles = [
        `${projectName}/SukoonLiveActivityBridge.swift`,
        `${projectName}/SukoonLiveActivityBridge.m`,
      ];
      for (const file of bridgeFiles) {
        try {
          project.addSourceFile(
            file,
            { target: mainTarget.firstTarget.uuid },
            mainGroupKey
          );
        } catch (e) {
          // Already added
        }
      }
      console.log('✅ Added Live Activity bridge files to main target');
    }

    return config;
  });
};

/**
 * 4. Android: Write Java files
 */
const withLiveActivityAndroidFiles = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const javaPath = path.join(
        projectRoot,
        'android', 'app', 'src', 'main', 'java',
        'com', 'talukders', 'sukoon'
      );

      if (!fs.existsSync(javaPath)) {
        fs.mkdirSync(javaPath, { recursive: true });
      }

      fs.writeFileSync(
        path.join(javaPath, 'LiveActivityModule.java'),
        readTemplate('android', 'java', 'LiveActivityModule.java'),
        'utf-8'
      );
      console.log('✅ Created LiveActivityModule.java');

      fs.writeFileSync(
        path.join(javaPath, 'LiveActivityPackage.java'),
        readTemplate('android', 'java', 'LiveActivityPackage.java'),
        'utf-8'
      );
      console.log('✅ Created LiveActivityPackage.java');

      return config;
    },
  ]);
};

/**
 * 5. Android: Register LiveActivityPackage in MainApplication
 */
const withLiveActivityPackage = (config) => {
  return withMainApplication(config, (config) => {
    config.modResults.contents = registerAndroidPackageInMainApplication(
      config.modResults.contents,
      'LiveActivityPackage'
    );
    console.log('✅ Registered LiveActivityPackage in MainApplication');
    return config;
  });
};

// ═══════════════════════════════════════════════════════════════════
// MAIN PLUGIN EXPORT
// ═══════════════════════════════════════════════════════════════════

module.exports = function withLiveActivity(config) {
  // iOS
  config = withLiveActivityInfoPlist(config);
  config = withLiveActivityFiles(config);
  config = withLiveActivityXcodeConfig(config);
  // Android
  config = withLiveActivityAndroidFiles(config);
  config = withLiveActivityPackage(config);
  return config;
};
