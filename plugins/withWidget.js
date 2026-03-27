// plugins/withWidget.js
// Expo config plugin to add iOS WidgetKit extension for prayer times widget

const {
  withEntitlementsPlist,
  withXcodeProject,
  withDangerousMod,
} = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const APP_GROUP = 'group.com.talukders.sukoon';
const WIDGET_NAME = 'SukoonWidget';
const WIDGET_BUNDLE_ID = 'com.talukders.sukoon.SukoonWidget';
const DEPLOYMENT_TARGET = '16.0';
const templatePath = (...parts) => path.join(__dirname, 'templates', ...parts);
const readTemplate = (...parts) => fs.readFileSync(templatePath(...parts), 'utf-8');

// ─────────────────────────────────────────────────────────
// PLUGIN STEPS
// ─────────────────────────────────────────────────────────

/**
 * 1. Add App Group entitlement to the MAIN app target
 */
const withAppGroupEntitlement = (config) => {
  return withEntitlementsPlist(config, (mod) => {
    const entitlements = mod.modResults;
    if (!entitlements['com.apple.security.application-groups']) {
      entitlements['com.apple.security.application-groups'] = [];
    }
    const groups = entitlements['com.apple.security.application-groups'];
    if (!groups.includes(APP_GROUP)) {
      groups.push(APP_GROUP);
    }
    return mod;
  });
};

/**
 * 2. Write all native source files to the ios/ directory
 */
const withWidgetFiles = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosPath = path.join(projectRoot, 'ios');
      const projectName = config.modRequest.projectName || 'Sukoon';

      // --- Main app bridge files ---
      const mainAppPath = path.join(iosPath, projectName);
      if (!fs.existsSync(mainAppPath)) {
        fs.mkdirSync(mainAppPath, { recursive: true });
      }

      fs.writeFileSync(
        path.join(mainAppPath, 'SukoonWidgetBridge.swift'),
        readTemplate('ios', 'app', 'SukoonWidgetBridge.swift'),
        'utf-8'
      );
      console.log('✅ Created SukoonWidgetBridge.swift');

      fs.writeFileSync(
        path.join(mainAppPath, 'SukoonWidgetBridge.m'),
        readTemplate('ios', 'app', 'SukoonWidgetBridge.m'),
        'utf-8'
      );
      console.log('✅ Created SukoonWidgetBridge.m');

      // Always write bridging header with React Native imports
      // (Expo prebuild may create an empty one first, so we overwrite it)
      const bridgingHeaderPath = path.join(mainAppPath, `${projectName}-Bridging-Header.h`);
      fs.writeFileSync(
        bridgingHeaderPath,
        `//\n//  ${projectName}-Bridging-Header.h\n//\n\n#import <React/RCTBridgeModule.h>\n#import <React/RCTViewManager.h>\n`,
        'utf-8'
      );
      console.log('✅ Created bridging header with RCT imports');

      // --- Widget extension files ---
      const widgetPath = path.join(iosPath, WIDGET_NAME);
      if (!fs.existsSync(widgetPath)) {
        fs.mkdirSync(widgetPath, { recursive: true });
      }

      fs.writeFileSync(
        path.join(widgetPath, 'SukoonWidget.swift'),
        readTemplate('ios', 'widget', 'SukoonWidget.swift'),
        'utf-8'
      );
      console.log('✅ Created SukoonWidget.swift');

      fs.writeFileSync(
        path.join(widgetPath, 'SukoonWidgetBundle.swift'),
        readTemplate('ios', 'widget', 'SukoonWidgetBundle.swift'),
        'utf-8'
      );
      console.log('✅ Created SukoonWidgetBundle.swift');

      fs.writeFileSync(
        path.join(widgetPath, 'Info.plist'),
        readTemplate('ios', 'widget', 'Info.plist'),
        'utf-8'
      );
      console.log('✅ Created Widget Info.plist');

      fs.writeFileSync(
        path.join(widgetPath, `${WIDGET_NAME}.entitlements`),
        readTemplate('ios', 'widget', 'SukoonWidget.entitlements'),
        'utf-8'
      );
      console.log('✅ Created Widget entitlements');

      return config;
    },
  ]);
};

/**
 * 3. Add the widget extension target to the Xcode project
 *
 * NOTE: The xcode npm package's high-level APIs (findPBXGroupKey,
 * addSourceFile) are unreliable for extension targets — they silently
 * fail when the group created by addTarget() isn't findable.
 * We therefore manipulate project.hash.project.objects directly.
 */
const withWidgetTarget = (config) => {
  return withXcodeProject(config, async (config) => {
    const project = config.modResults;
    const projectName = config.modRequest.projectName || 'Sukoon';
    const objects = project.hash.project.objects;
    const genUuid = () => project.generateUuid();

    // Check if widget target already exists
    const targets = project.pbxNativeTargetSection();
    const existingTarget = Object.values(targets).find(
      (t) => t && typeof t === 'object' && t.name === `"${WIDGET_NAME}"`
    );

    if (existingTarget) {
      console.log('⚠️ Widget target already exists, skipping...');
      return config;
    }

    // --- 1. Add the widget target (creates empty Sources + Frameworks phases) ---
    const target = project.addTarget(
      WIDGET_NAME,
      'app_extension',
      WIDGET_NAME,
      WIDGET_BUNDLE_ID
    );

    if (!target) {
      console.error('❌ Failed to add widget target');
      return config;
    }

    console.log('✅ Added widget target:', WIDGET_NAME);

    // --- 2. Locate the widget target's Sources build phase ---
    // Strategy: find the PBXSourcesBuildPhase with an empty files array.
    // addTarget() creates an empty Sources phase for the widget; the main
    // app's Sources phase already has files, so the empty one is ours.
    let widgetSourcesPhaseUuid = null;
    const sourcePhasesSection = objects['PBXSourcesBuildPhase'] || {};
    for (const key of Object.keys(sourcePhasesSection)) {
      if (key.endsWith('_comment')) continue;
      const phase = sourcePhasesSection[key];
      if (phase && typeof phase === 'object' && phase.files && phase.files.length === 0) {
        widgetSourcesPhaseUuid = key;
        break;
      }
    }
    console.log(widgetSourcesPhaseUuid
      ? `✅ Found widget Sources build phase: ${widgetSourcesPhaseUuid}`
      : '❌ Could not find widget Sources build phase — will create one');

    // Fallback: create the Sources phase ourselves if addTarget didn't
    if (!widgetSourcesPhaseUuid) {
      widgetSourcesPhaseUuid = genUuid();
      sourcePhasesSection[widgetSourcesPhaseUuid] = {
        isa: 'PBXSourcesBuildPhase',
        buildActionMask: 2147483647,
        files: [],
        runOnlyForDeploymentPostprocessing: 0,
      };
      sourcePhasesSection[`${widgetSourcesPhaseUuid}_comment`] = 'Sources';
      // Also add to native target's buildPhases
      if (target.pbxNativeTarget && target.pbxNativeTarget.buildPhases) {
        target.pbxNativeTarget.buildPhases.push({
          value: widgetSourcesPhaseUuid,
          comment: 'Sources',
        });
      }
      console.log('✅ Created fallback Sources build phase for widget');
    }

    // --- 3. Create PBXGroup for widget source files ---
    let widgetGroupKey = project.findPBXGroupKey({ name: WIDGET_NAME });
    if (!widgetGroupKey) {
      widgetGroupKey = genUuid();
      objects['PBXGroup'][widgetGroupKey] = {
        isa: 'PBXGroup',
        children: [],
        name: `"${WIDGET_NAME}"`,
        path: `"${WIDGET_NAME}"`,
        sourceTree: '"<group>"',
      };
      objects['PBXGroup'][`${widgetGroupKey}_comment`] = WIDGET_NAME;

      // Add to the root project group
      const mainGroup = project.getFirstProject().firstProject.mainGroup;
      if (mainGroup && objects['PBXGroup'][mainGroup]) {
        objects['PBXGroup'][mainGroup].children.push({
          value: widgetGroupKey,
          comment: WIDGET_NAME,
        });
      }
      console.log('✅ Created PBXGroup for widget');
    }

    // --- 4. Add widget Swift source files to widget target ---
    const widgetSourceFiles = [
      { name: 'SukoonWidget.swift',       path: 'SukoonWidget.swift' },
      { name: 'SukoonWidgetBundle.swift',  path: 'SukoonWidgetBundle.swift' },
      { name: 'SukoonLiveActivity.swift',  path: 'SukoonLiveActivity.swift' },
    ];

    for (const file of widgetSourceFiles) {
      const fileRefUuid = genUuid();
      const buildFileUuid = genUuid();

      // PBXFileReference
      objects['PBXFileReference'][fileRefUuid] = {
        isa: 'PBXFileReference',
        lastKnownFileType: 'sourcecode.swift',
        name: `"${file.name}"`,
        path: `"${file.path}"`,
        sourceTree: '"<group>"',
      };
      objects['PBXFileReference'][`${fileRefUuid}_comment`] = file.name;

      // PBXBuildFile → links file ref to widget target compile
      objects['PBXBuildFile'][buildFileUuid] = {
        isa: 'PBXBuildFile',
        fileRef: fileRefUuid,
        fileRef_comment: file.name,
      };
      objects['PBXBuildFile'][`${buildFileUuid}_comment`] = `${file.name} in Sources`;

      // Add to widget Sources build phase
      if (widgetSourcesPhaseUuid) {
        const phase = objects['PBXSourcesBuildPhase'][widgetSourcesPhaseUuid];
        if (phase && phase.files) {
          phase.files.push({
            value: buildFileUuid,
            comment: `${file.name} in Sources`,
          });
        }
      }

      // Add file ref to widget PBXGroup
      const group = objects['PBXGroup'][widgetGroupKey];
      if (group && group.children) {
        group.children.push({
          value: fileRefUuid,
          comment: file.name,
        });
      }
    }

    console.log('✅ Added widget source files to Sources build phase');

    // --- 5. Add bridge files to main app target ---
    const mainTarget = project.getFirstTarget();
    const mainGroupKey = project.findPBXGroupKey({ name: projectName });
    if (mainGroupKey && mainTarget) {
      project.addSourceFile(
        `${projectName}/SukoonWidgetBridge.swift`,
        { target: mainTarget.firstTarget.uuid },
        mainGroupKey
      );
      project.addSourceFile(
        `${projectName}/SukoonWidgetBridge.m`,
        { target: mainTarget.firstTarget.uuid },
        mainGroupKey
      );
    }

    // --- 6. Configure build settings for widget target ---
    const configurations = project.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
      const cfg = configurations[key];
      if (
        cfg &&
        typeof cfg === 'object' &&
        cfg.buildSettings &&
        cfg.buildSettings.PRODUCT_NAME === `"${WIDGET_NAME}"`
      ) {
        cfg.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = `"${WIDGET_BUNDLE_ID}"`;
        cfg.buildSettings.INFOPLIST_FILE = `"${WIDGET_NAME}/Info.plist"`;
        cfg.buildSettings.CODE_SIGN_ENTITLEMENTS = `"${WIDGET_NAME}/${WIDGET_NAME}.entitlements"`;
        cfg.buildSettings.SWIFT_VERSION = '"5.0"';
        cfg.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = `"${DEPLOYMENT_TARGET}"`;
        cfg.buildSettings.TARGETED_DEVICE_FAMILY = '"1,2"';
        cfg.buildSettings.LD_RUNPATH_SEARCH_PATHS = '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"';
        cfg.buildSettings.SWIFT_EMIT_LOC_STRINGS = '"YES"';
        cfg.buildSettings.GENERATE_INFOPLIST_FILE = '"NO"';
        cfg.buildSettings.CURRENT_PROJECT_VERSION = '"1"';
        cfg.buildSettings.MARKETING_VERSION = '"1.0"';
        cfg.buildSettings.SKIP_INSTALL = '"YES"';
      }
    }

    // --- 7. Create Frameworks build phase for widget target ---
    // addFramework() silently fails because addTarget() doesn't reliably
    // create a Frameworks build phase. We create it manually.
    const fwPhaseUuid = genUuid();
    const swiftuiRefUuid = genUuid();
    const widgetkitRefUuid = genUuid();
    const activityKitRefUuid = genUuid();
    const swiftuiBuildFileUuid = genUuid();
    const widgetkitBuildFileUuid = genUuid();
    const activityKitBuildFileUuid = genUuid();

    // File references for system frameworks
    if (!objects['PBXFileReference']) objects['PBXFileReference'] = {};
    objects['PBXFileReference'][swiftuiRefUuid] = {
      isa: 'PBXFileReference',
      lastKnownFileType: 'wrapper.framework',
      name: 'SwiftUI.framework',
      path: 'System/Library/Frameworks/SwiftUI.framework',
      sourceTree: 'SDKROOT',
    };
    objects['PBXFileReference'][`${swiftuiRefUuid}_comment`] = 'SwiftUI.framework';
    objects['PBXFileReference'][widgetkitRefUuid] = {
      isa: 'PBXFileReference',
      lastKnownFileType: 'wrapper.framework',
      name: 'WidgetKit.framework',
      path: 'System/Library/Frameworks/WidgetKit.framework',
      sourceTree: 'SDKROOT',
    };
    objects['PBXFileReference'][`${widgetkitRefUuid}_comment`] = 'WidgetKit.framework';
    objects['PBXFileReference'][activityKitRefUuid] = {
      isa: 'PBXFileReference',
      lastKnownFileType: 'wrapper.framework',
      name: 'ActivityKit.framework',
      path: 'System/Library/Frameworks/ActivityKit.framework',
      sourceTree: 'SDKROOT',
    };
    objects['PBXFileReference'][`${activityKitRefUuid}_comment`] = 'ActivityKit.framework';

    // Build files linking frameworks to widget target
    objects['PBXBuildFile'][swiftuiBuildFileUuid] = {
      isa: 'PBXBuildFile',
      fileRef: swiftuiRefUuid,
      fileRef_comment: 'SwiftUI.framework',
    };
    objects['PBXBuildFile'][`${swiftuiBuildFileUuid}_comment`] = 'SwiftUI.framework in Frameworks';
    objects['PBXBuildFile'][widgetkitBuildFileUuid] = {
      isa: 'PBXBuildFile',
      fileRef: widgetkitRefUuid,
      fileRef_comment: 'WidgetKit.framework',
    };
    objects['PBXBuildFile'][`${widgetkitBuildFileUuid}_comment`] = 'WidgetKit.framework in Frameworks';
    objects['PBXBuildFile'][activityKitBuildFileUuid] = {
      isa: 'PBXBuildFile',
      fileRef: activityKitRefUuid,
      fileRef_comment: 'ActivityKit.framework',
    };
    objects['PBXBuildFile'][`${activityKitBuildFileUuid}_comment`] = 'ActivityKit.framework in Frameworks';

    // Create PBXFrameworksBuildPhase for widget target
    if (!objects['PBXFrameworksBuildPhase']) objects['PBXFrameworksBuildPhase'] = {};
    objects['PBXFrameworksBuildPhase'][fwPhaseUuid] = {
      isa: 'PBXFrameworksBuildPhase',
      buildActionMask: 2147483647,
      files: [
        { value: swiftuiBuildFileUuid, comment: 'SwiftUI.framework in Frameworks' },
        { value: widgetkitBuildFileUuid, comment: 'WidgetKit.framework in Frameworks' },
        { value: activityKitBuildFileUuid, comment: 'ActivityKit.framework in Frameworks' },
      ],
      runOnlyForDeploymentPostprocessing: 0,
    };
    objects['PBXFrameworksBuildPhase'][`${fwPhaseUuid}_comment`] = 'Frameworks';

    // Add Frameworks phase to widget target's buildPhases
    if (target.pbxNativeTarget && target.pbxNativeTarget.buildPhases) {
      target.pbxNativeTarget.buildPhases.push({
        value: fwPhaseUuid,
        comment: 'Frameworks',
      });
    }

    // Add framework refs to the Frameworks group
    const frameworksGroupKey = project.findPBXGroupKey({ name: 'Frameworks' });
    if (frameworksGroupKey && objects['PBXGroup'][frameworksGroupKey]) {
      const fwGroup = objects['PBXGroup'][frameworksGroupKey];
      if (fwGroup.children) {
        fwGroup.children.push({ value: swiftuiRefUuid, comment: 'SwiftUI.framework' });
        fwGroup.children.push({ value: widgetkitRefUuid, comment: 'WidgetKit.framework' });
        fwGroup.children.push({ value: activityKitRefUuid, comment: 'ActivityKit.framework' });
      }
    }

    console.log('✅ Created Frameworks build phase for widget with SwiftUI + WidgetKit + ActivityKit');

    // --- 8. Configure the "Copy Files" phase addTarget() already created ---
    // addTarget() creates a PBXCopyFilesBuildPhase ("Copy Files") on the main
    // target that copies the .appex. We just need to ensure dstSubfolderSpec = 13
    // (PlugIns). Do NOT create a second embed phase — that causes
    // "Unexpected duplicate tasks" errors.
    const mainTargetObj = project.getFirstTarget();
    if (mainTargetObj) {
      const copyPhases = objects['PBXCopyFilesBuildPhase'] || {};
      for (const key of Object.keys(copyPhases)) {
        if (key.endsWith('_comment')) continue;
        const phase = copyPhases[key];
        if (phase && typeof phase === 'object' && phase.files) {
          // Check if this phase copies the widget .appex
          const hasWidget = phase.files.some((f) => {
            const comment = f.comment || '';
            return comment.includes(WIDGET_NAME);
          });
          if (hasWidget) {
            phase.dstSubfolderSpec = 13; // PlugIns folder
            phase.dstPath = '""';
            console.log('✅ Configured existing Copy Files phase for PlugIns embed');
          }
        }
      }

      // --- 8b. Add target dependency: main app → widget ---
      // This ensures Xcode builds the widget BEFORE the main app.
      const proxyUuid = genUuid();
      const depUuid = genUuid();
      const projectRootUuid = project.hash.project.rootObject;

      if (!objects['PBXContainerItemProxy']) objects['PBXContainerItemProxy'] = {};
      objects['PBXContainerItemProxy'][proxyUuid] = {
        isa: 'PBXContainerItemProxy',
        containerPortal: projectRootUuid,
        containerPortal_comment: 'Project object',
        proxyType: 1,
        remoteGlobalIDString: target.uuid,
        remoteInfo: `"${WIDGET_NAME}"`,
      };
      objects['PBXContainerItemProxy'][`${proxyUuid}_comment`] = 'PBXContainerItemProxy';

      if (!objects['PBXTargetDependency']) objects['PBXTargetDependency'] = {};
      objects['PBXTargetDependency'][depUuid] = {
        isa: 'PBXTargetDependency',
        target: target.uuid,
        target_comment: WIDGET_NAME,
        targetProxy: proxyUuid,
        targetProxy_comment: 'PBXContainerItemProxy',
      };
      objects['PBXTargetDependency'][`${depUuid}_comment`] = 'PBXTargetDependency';

      // Add to main app target's dependencies
      // Find main app target by name (UUID hash lookup is unreliable)
      const nativeTargets = objects['PBXNativeTarget'] || {};
      let mainNativeTarget = null;
      for (const key of Object.keys(nativeTargets)) {
        if (key.endsWith('_comment')) continue;
        const t = nativeTargets[key];
        if (t && typeof t === 'object' &&
            (t.name === `"${projectName}"` || t.name === projectName)) {
          mainNativeTarget = t;
          break;
        }
      }
      if (mainNativeTarget && mainNativeTarget.dependencies) {
        mainNativeTarget.dependencies.push({
          value: depUuid,
          comment: 'PBXTargetDependency',
        });
      }

      console.log('✅ Added target dependency: Sukoon → SukoonWidget');
    }

    // --- 9. Set bridging header for main target ---
    for (const key in configurations) {
      const cfg = configurations[key];
      if (
        cfg &&
        typeof cfg === 'object' &&
        cfg.buildSettings &&
        (cfg.buildSettings.PRODUCT_NAME === `"${projectName}"` ||
         cfg.buildSettings.PRODUCT_BUNDLE_IDENTIFIER === '"com.talukders.sukoon"')
      ) {
        if (!cfg.buildSettings.SWIFT_OBJC_BRIDGING_HEADER) {
          cfg.buildSettings.SWIFT_OBJC_BRIDGING_HEADER = `"${projectName}/${projectName}-Bridging-Header.h"`;
        }
      }
    }

    console.log('✅ Widget target fully configured');
    return config;
  });
};

// ─────────────────────────────────────────────────────────
// MAIN PLUGIN EXPORT
// ─────────────────────────────────────────────────────────

module.exports = function withWidget(config) {
  config = withAppGroupEntitlement(config);
  config = withWidgetFiles(config);
  config = withWidgetTarget(config);
  return config;
};
