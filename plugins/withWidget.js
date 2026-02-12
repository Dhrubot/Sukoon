// plugins/withWidget.js
// Expo config plugin to add iOS WidgetKit extension for prayer times widget

const {
  withEntitlementsPlist,
  withXcodeProject,
  withDangerousMod,
  withInfoPlist,
} = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const APP_GROUP = 'group.com.talukders.sukoon';
const WIDGET_NAME = 'SukoonWidget';
const WIDGET_BUNDLE_ID = 'com.talukders.sukoon.SukoonWidget';
const DEPLOYMENT_TARGET = '16.0';

// ─────────────────────────────────────────────────────────
// NATIVE BRIDGE: Swift module (added to MAIN app target)
// Allows React Native to write data to App Group UserDefaults
// and trigger WidgetKit timeline reloads.
// ─────────────────────────────────────────────────────────

const BRIDGE_SWIFT = `import Foundation
import WidgetKit

@objc(SukoonWidgetBridge)
class SukoonWidgetBridge: NSObject {

  private static let appGroup = "${APP_GROUP}"

  @objc
  func setWidgetData(_ jsonString: String,
                     resolve: @escaping RCTPromiseResolveBlock,
                     reject: @escaping RCTPromiseRejectBlock) {
    guard let defaults = UserDefaults(suiteName: SukoonWidgetBridge.appGroup) else {
      reject("APP_GROUP_ERROR", "Cannot access App Group UserDefaults", nil)
      return
    }
    defaults.set(jsonString, forKey: "widgetData")
    defaults.synchronize()
    resolve(true)
  }

  @objc
  func reloadWidgets(_ resolve: @escaping RCTPromiseResolveBlock,
                     reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
    resolve(true)
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
`;

const BRIDGE_OBJC = `#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SukoonWidgetBridge, NSObject)

RCT_EXTERN_METHOD(setWidgetData:(NSString *)jsonString
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(reloadWidgets:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
`;

// ─────────────────────────────────────────────────────────
// WIDGET EXTENSION: SwiftUI views + WidgetKit provider
// ─────────────────────────────────────────────────────────

const WIDGET_SWIFT = `import WidgetKit
import SwiftUI

// MARK: - Data Models

struct PrayerInfo: Codable, Identifiable {
    let name: String
    let time: String
    let status: String
    var id: String { name }
}

struct WidgetPrayerData: Codable {
    let prayerTimes: [PrayerInfo]
    let nextPrayerName: String
    let nextPrayerTime: String
    let completedCount: Int
    let totalPrayers: Int
    let streak: Int
    let lastUpdated: String
}

// MARK: - Colors

struct SukoonColors {
    static let navy       = Color(red: 0.102, green: 0.122, blue: 0.227)
    static let navyLight  = Color(red: 0.145, green: 0.169, blue: 0.278)
    static let navyCard   = Color(red: 0.176, green: 0.204, blue: 0.329)
    static let turquoise  = Color(red: 0.0,   green: 0.788, blue: 0.655)
    static let textPrimary   = Color.white
    static let textSecondary = Color(red: 0.627, green: 0.682, blue: 0.753)
    static let textMuted     = Color(red: 0.424, green: 0.478, blue: 0.537)

    static func prayerColor(_ name: String) -> Color {
        switch name {
        case "Fajr":    return Color(red: 0.224, green: 0.286, blue: 0.671)
        case "Dhuhr":   return Color(red: 1.0,   green: 0.718, blue: 0.302)
        case "Asr":     return Color(red: 1.0,   green: 0.596, blue: 0.0)
        case "Maghrib": return Color(red: 0.914, green: 0.118, blue: 0.388)
        case "Isha":    return Color(red: 0.318, green: 0.176, blue: 0.659)
        default:        return turquoise
        }
    }
}

// MARK: - Timeline Provider

struct SukoonProvider: TimelineProvider {
    private let appGroup = "${APP_GROUP}"

    func placeholder(in context: Context) -> SukoonEntry {
        SukoonEntry(date: Date(), data: Self.sampleData())
    }

    func getSnapshot(in context: Context, completion: @escaping (SukoonEntry) -> Void) {
        let data = loadData() ?? Self.sampleData()
        completion(SukoonEntry(date: Date(), data: data))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SukoonEntry>) -> Void) {
        let data = loadData() ?? Self.sampleData()
        let entry = SukoonEntry(date: Date(), data: data)
        let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }

    private func loadData() -> WidgetPrayerData? {
        guard let defaults = UserDefaults(suiteName: appGroup),
              let json = defaults.string(forKey: "widgetData"),
              let raw = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(WidgetPrayerData.self, from: raw)
    }

    static func sampleData() -> WidgetPrayerData {
        WidgetPrayerData(
            prayerTimes: [
                PrayerInfo(name: "Fajr",    time: "2025-01-15T05:15:00Z", status: "prayed"),
                PrayerInfo(name: "Dhuhr",   time: "2025-01-15T12:30:00Z", status: "prayed"),
                PrayerInfo(name: "Asr",     time: "2025-01-15T15:45:00Z", status: "current"),
                PrayerInfo(name: "Maghrib", time: "2025-01-15T18:10:00Z", status: "upcoming"),
                PrayerInfo(name: "Isha",    time: "2025-01-15T19:40:00Z", status: "upcoming"),
            ],
            nextPrayerName: "Asr",
            nextPrayerTime: "2025-01-15T15:45:00Z",
            completedCount: 2,
            totalPrayers: 5,
            streak: 7,
            lastUpdated: "2025-01-15T12:00:00Z"
        )
    }
}

// MARK: - Timeline Entry

struct SukoonEntry: TimelineEntry {
    let date: Date
    let data: WidgetPrayerData
}

// MARK: - Helper

private func parseISO(_ iso: String) -> Date? {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let d = f.date(from: iso) { return d }
    f.formatOptions = [.withInternetDateTime]
    return f.date(from: iso)
}

private func formatTime(_ iso: String) -> String {
    guard let date = parseISO(iso) else { return "--:--" }
    let f = DateFormatter()
    f.dateFormat = "h:mm a"
    return f.string(from: date)
}

// MARK: - Small Widget

struct SmallWidgetView: View {
    let data: WidgetPrayerData

    private var nextDate: Date? { parseISO(data.nextPrayerTime) }

    var body: some View {
        VStack(spacing: 6) {
            // Progress dots
            HStack(spacing: 5) {
                ForEach(data.prayerTimes) { p in
                    Circle()
                        .fill(p.status == "prayed"
                              ? SukoonColors.turquoise
                              : SukoonColors.navyCard)
                        .frame(width: 8, height: 8)
                }
                Spacer()
                Text("\\(data.completedCount)/5")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(SukoonColors.textMuted)
            }

            Spacer()

            // Prayer name
            Text(data.nextPrayerName.isEmpty ? "—" : data.nextPrayerName)
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundColor(SukoonColors.prayerColor(data.nextPrayerName))
                .minimumScaleFactor(0.7)

            // Time
            Text(formatTime(data.nextPrayerTime))
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(SukoonColors.textPrimary)

            // Countdown
            if let nd = nextDate, nd > Date() {
                Text(nd, style: .relative)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(SukoonColors.turquoise)
            } else {
                Text("Now")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(SukoonColors.turquoise)
            }

            Spacer()

            // Brand line
            HStack(spacing: 4) {
                line
                Text("Sukoon")
                    .font(.system(size: 9, weight: .medium))
                    .foregroundColor(SukoonColors.textMuted)
                line
            }
        }
        .padding(14)
    }

    private var line: some View {
        Rectangle()
            .fill(SukoonColors.turquoise.opacity(0.25))
            .frame(height: 0.5)
    }
}

// MARK: - Medium Widget

struct MediumWidgetView: View {
    let data: WidgetPrayerData

    private var nextDate: Date? { parseISO(data.nextPrayerTime) }

    private static let verses: [(String, String)] = [
        ("Indeed, prayer prohibits immorality and wrongdoing", "29:45"),
        ("And seek help through patience and prayer", "2:45"),
        ("Indeed, Allah is with the patient", "2:153"),
        ("So remember Me; I will remember you", "2:152"),
        ("In the remembrance of Allah do hearts find rest", "13:28"),
        ("And He is with you wherever you are", "57:4"),
        ("Allah does not burden a soul beyond that it can bear", "2:286"),
        ("Whoever puts their trust in Allah, He will be enough for them", "65:3"),
        ("And whoever fears Allah, He will make for them a way out", "65:2"),
        ("My mercy encompasses all things", "7:156"),
        ("Call upon Me; I will respond to you", "40:60"),
        ("Do not lose hope in the mercy of Allah", "39:53"),
    ]

    private var verse: (String, String) {
        let day = Calendar.current.ordinality(of: .day, in: .year, for: Date()) ?? 1
        return Self.verses[day % Self.verses.count]
    }

    var body: some View {
        VStack(spacing: 0) {
            // Top row
            HStack(alignment: .top) {
                // Left: next prayer
                VStack(alignment: .leading, spacing: 3) {
                    Text("NEXT PRAYER")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(SukoonColors.textMuted)
                        .tracking(0.5)

                    Text(data.nextPrayerName.isEmpty ? "—" : data.nextPrayerName)
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundColor(SukoonColors.prayerColor(data.nextPrayerName))
                        .minimumScaleFactor(0.7)

                    HStack(spacing: 8) {
                        Text(formatTime(data.nextPrayerTime))
                            .font(.system(size: 15, weight: .medium))
                            .foregroundColor(SukoonColors.textPrimary)

                        if let nd = nextDate, nd > Date() {
                            Text(nd, style: .relative)
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(SukoonColors.turquoise)
                        } else {
                            Text("Now")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(SukoonColors.turquoise)
                        }
                    }
                }

                Spacer()

                // Right: prayer list with dots
                VStack(alignment: .leading, spacing: 5) {
                    ForEach(data.prayerTimes) { p in
                        HStack(spacing: 5) {
                            Circle()
                                .fill(p.status == "prayed"
                                      ? SukoonColors.turquoise
                                      : SukoonColors.navyCard)
                                .frame(width: 7, height: 7)
                            Text(String(p.name.prefix(3)))
                                .font(.system(size: 10, weight: .medium, design: .rounded))
                                .foregroundColor(
                                    p.status == "prayed"
                                    ? SukoonColors.turquoise
                                    : p.status == "current"
                                      ? SukoonColors.textPrimary
                                      : SukoonColors.textMuted
                                )
                        }
                    }
                }
            }

            Spacer(minLength: 6)

            // Divider
            Rectangle()
                .fill(SukoonColors.turquoise.opacity(0.18))
                .frame(height: 0.5)

            Spacer(minLength: 6)

            // Verse
            VStack(spacing: 2) {
                Text("\\u{201C}\\(verse.0)\\u{201D}")
                    .font(.system(size: 11, weight: .regular))
                    .foregroundColor(SukoonColors.textSecondary)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)

                Text("— Quran \\(verse.1)")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(SukoonColors.textMuted)
            }
        }
        .padding(16)
    }
}

// MARK: - Widget Definition

struct SukoonWidget: Widget {
    let kind = "SukoonWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SukoonProvider()) { entry in
            if #available(iOS 17.0, *) {
                WidgetEntryView(entry: entry)
                    .containerBackground(SukoonColors.navy, for: .widget)
            } else {
                WidgetEntryView(entry: entry)
                    .background(SukoonColors.navy)
            }
        }
        .configurationDisplayName("Prayer Times")
        .description("Your next prayer, daily progress, and a Quranic reminder.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct WidgetEntryView: View {
    @Environment(\\.widgetFamily) var family
    let entry: SukoonEntry

    var body: some View {
        switch family {
        case .systemMedium:
            MediumWidgetView(data: entry.data)
        default:
            SmallWidgetView(data: entry.data)
        }
    }
}
`;

const WIDGET_BUNDLE_SWIFT = `import WidgetKit
import SwiftUI

@main
struct SukoonWidgetBundle: WidgetBundle {
    var body: some Widget {
        SukoonWidget()
    }
}
`;

const WIDGET_INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>$(DEVELOPMENT_LANGUAGE)</string>
	<key>CFBundleDisplayName</key>
	<string>Sukoon Widget</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
	<key>CFBundleShortVersionString</key>
	<string>$(MARKETING_VERSION)</string>
	<key>CFBundleVersion</key>
	<string>$(CURRENT_PROJECT_VERSION)</string>
	<key>NSExtension</key>
	<dict>
		<key>NSExtensionPointIdentifier</key>
		<string>com.apple.widgetkit-extension</string>
	</dict>
</dict>
</plist>
`;

const WIDGET_ENTITLEMENTS = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.security.application-groups</key>
	<array>
		<string>${APP_GROUP}</string>
	</array>
</dict>
</plist>
`;

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
        BRIDGE_SWIFT,
        'utf-8'
      );
      console.log('✅ Created SukoonWidgetBridge.swift');

      fs.writeFileSync(
        path.join(mainAppPath, 'SukoonWidgetBridge.m'),
        BRIDGE_OBJC,
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
        WIDGET_SWIFT,
        'utf-8'
      );
      console.log('✅ Created SukoonWidget.swift');

      fs.writeFileSync(
        path.join(widgetPath, 'SukoonWidgetBundle.swift'),
        WIDGET_BUNDLE_SWIFT,
        'utf-8'
      );
      console.log('✅ Created SukoonWidgetBundle.swift');

      fs.writeFileSync(
        path.join(widgetPath, 'Info.plist'),
        WIDGET_INFO_PLIST,
        'utf-8'
      );
      console.log('✅ Created Widget Info.plist');

      fs.writeFileSync(
        path.join(widgetPath, `${WIDGET_NAME}.entitlements`),
        WIDGET_ENTITLEMENTS,
        'utf-8'
      );
      console.log('✅ Created Widget entitlements');

      return config;
    },
  ]);
};

/**
 * 3. Add the widget extension target to the Xcode project
 */
const withWidgetTarget = (config) => {
  return withXcodeProject(config, async (config) => {
    const project = config.modResults;
    const projectName = config.modRequest.projectName || 'Sukoon';

    // Check if widget target already exists
    const targets = project.pbxNativeTargetSection();
    const existingTarget = Object.values(targets).find(
      (t) => t && typeof t === 'object' && t.name === `"${WIDGET_NAME}"`
    );

    if (existingTarget) {
      console.log('⚠️ Widget target already exists, skipping...');
      return config;
    }

    // --- Add the widget target ---
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

    // --- Add source files to widget target ---
    const groupKey = project.findPBXGroupKey({ name: WIDGET_NAME });
    if (groupKey) {
      project.addSourceFile(
        `${WIDGET_NAME}/SukoonWidget.swift`,
        { target: target.uuid },
        groupKey
      );
      project.addSourceFile(
        `${WIDGET_NAME}/SukoonWidgetBundle.swift`,
        { target: target.uuid },
        groupKey
      );
    }

    // --- Add bridge files to main app target ---
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

    // --- Configure build settings for widget target ---
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

    // --- Add SwiftUI and WidgetKit frameworks to widget target ---
    project.addFramework('SwiftUI.framework', {
      target: target.uuid,
      link: true,
    });
    project.addFramework('WidgetKit.framework', {
      target: target.uuid,
      link: true,
    });

    // --- Embed the widget extension in the main app ---
    const mainTargetObj = project.getFirstTarget();
    if (mainTargetObj) {
      // Add "Embed Foundation Extensions" build phase
      const embedPhase = project.addBuildPhase(
        [],
        'PBXCopyFilesBuildPhase',
        'Embed Foundation Extensions',
        mainTargetObj.firstTarget.uuid,
        'app_extension'
      );
      if (embedPhase && embedPhase.buildPhase) {
        embedPhase.buildPhase.dstSubfolderSpec = 13; // PlugIns folder
        embedPhase.buildPhase.dstPath = '""';
      }
    }

    // --- Set bridging header for main target ---
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
