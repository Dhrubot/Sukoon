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
    let hijriDate: String
    let dailyVerse: String
    let dailyVerseRef: String
    let lastUpdated: String

    enum CodingKeys: String, CodingKey {
        case prayerTimes, nextPrayerName, nextPrayerTime
        case completedCount, totalPrayers, streak
        case hijriDate, dailyVerse, dailyVerseRef, lastUpdated
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        prayerTimes = try c.decode([PrayerInfo].self, forKey: .prayerTimes)
        nextPrayerName = try c.decode(String.self, forKey: .nextPrayerName)
        nextPrayerTime = try c.decode(String.self, forKey: .nextPrayerTime)
        completedCount = try c.decode(Int.self, forKey: .completedCount)
        totalPrayers = try c.decode(Int.self, forKey: .totalPrayers)
        streak = try c.decode(Int.self, forKey: .streak)
        hijriDate = (try? c.decode(String.self, forKey: .hijriDate)) ?? ""
        dailyVerse = (try? c.decode(String.self, forKey: .dailyVerse)) ?? ""
        dailyVerseRef = (try? c.decode(String.self, forKey: .dailyVerseRef)) ?? ""
        lastUpdated = try c.decode(String.self, forKey: .lastUpdated)
    }

    init(prayerTimes: [PrayerInfo], nextPrayerName: String, nextPrayerTime: String,
         completedCount: Int, totalPrayers: Int, streak: Int,
         hijriDate: String = "", dailyVerse: String = "", dailyVerseRef: String = "",
         lastUpdated: String) {
        self.prayerTimes = prayerTimes
        self.nextPrayerName = nextPrayerName
        self.nextPrayerTime = nextPrayerTime
        self.completedCount = completedCount
        self.totalPrayers = totalPrayers
        self.streak = streak
        self.hijriDate = hijriDate
        self.dailyVerse = dailyVerse
        self.dailyVerseRef = dailyVerseRef
        self.lastUpdated = lastUpdated
    }
}

// MARK: - Colors

struct SukoonColors {
    // Primary accent — sage green500 (#2D8B6F) warm, organic, Jannah green
    static let sage       = Color(red: 0.176, green: 0.545, blue: 0.435)
    // Gold accent — gold400 (#D4AF37) for current/active state
    static let gold       = Color(red: 0.831, green: 0.686, blue: 0.216)
    // Missed state — pre-baked RGBA to avoid .opacity() issues in widget extensions
    static let missedRed  = Color(red: 0.562, green: 0.160, blue: 0.160)
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
            hijriDate: "15 Rajab 1447",
            dailyVerse: "Indeed, prayer prohibits immorality and wrongdoing",
            dailyVerseRef: "29:45",
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

struct DateHelper {
    static let isoFormatterFrac: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    static let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    static let timeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "h:mm a"
        return f
    }()

    static func parseISO(_ iso: String) -> Date? {
        if iso.isEmpty { return nil }
        if let d = isoFormatterFrac.date(from: iso) { return d }
        return isoFormatter.date(from: iso)
    }

    static func formatTime(_ iso: String) -> String {
        guard let date = parseISO(iso) else { return "--:--" }
        return timeFormatter.string(from: date)
    }
}

// MARK: - Small Widget

struct SmallWidgetView: View {
    let data: WidgetPrayerData

    private var nextDate: Date? { DateHelper.parseISO(data.nextPrayerTime) }

    var body: some View {
        VStack(spacing: 4) {
            Spacer(minLength: 0)

            // Prayer name
            Text(data.nextPrayerName.isEmpty ? "\u2014" : data.nextPrayerName)
                .font(.system(size: 26, weight: .semibold, design: .rounded))
                .foregroundColor(.primary)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            // Time
            Text(DateHelper.formatTime(data.nextPrayerTime))
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(.secondary)

            Spacer().frame(height: 2)

            // Countdown
            if let nd = nextDate, nd > Date() {
                Text(nd, style: .relative)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(SukoonColors.sage)
            } else {
                Text("Now")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(SukoonColors.sage)
            }

            Spacer(minLength: 0)

            // Progress dots at bottom
            HStack(spacing: 6) {
                ForEach(data.prayerTimes) { p in
                    prayerDot(status: p.status)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ViewBuilder
    private func prayerDot(status: String) -> some View {
        if status == "prayed" {
            Circle().fill(SukoonColors.sage)
                .frame(width: 8, height: 8)
        } else if status == "current" {
            Circle().fill(SukoonColors.gold)
                .frame(width: 8, height: 8)
        } else if status == "missed" {
            Circle().stroke(SukoonColors.missedRed, lineWidth: 1.5)
                .frame(width: 8, height: 8)
        } else {
            Circle().stroke(.secondary, lineWidth: 1)
                .frame(width: 8, height: 8)
        }
    }
}

// MARK: - Medium Widget

struct MediumWidgetView: View {
    let data: WidgetPrayerData

    private var nextDate: Date? { DateHelper.parseISO(data.nextPrayerTime) }

    var body: some View {
        VStack(spacing: 0) {
            // Top: prayer info + dots
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(data.nextPrayerName.isEmpty ? "\u2014" : data.nextPrayerName)
                        .font(.system(size: 26, weight: .semibold, design: .rounded))
                        .foregroundColor(SukoonColors.sage)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)

                    HStack(spacing: 6) {
                        Text(DateHelper.formatTime(data.nextPrayerTime))
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.primary)

                        if let nd = nextDate, nd > Date() {
                            Text(nd, style: .relative)
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(SukoonColors.sage)
                        } else {
                            Text("Now")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(SukoonColors.sage)
                        }
                    }
                }

                Spacer()

                // Inline progress dots
                HStack(spacing: 5) {
                    ForEach(data.prayerTimes) { p in
                        mediumDot(status: p.status)
                    }
                }
            }

            Spacer(minLength: 6)

            // Divider
            Rectangle()
                .fill(.quaternary)
                .frame(height: 0.5)

            Spacer(minLength: 6)

            // Verse (from RN data, with fallback)
            VStack(spacing: 3) {
                if !data.dailyVerse.isEmpty {
                    Text("“\\(data.dailyVerse)”")
                        .font(.system(size: 12, weight: .regular))
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                        .multilineTextAlignment(.center)

                    HStack(spacing: 4) {
                        Text("— \\(data.dailyVerseRef)")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(Color.secondary.opacity(0.6))
                        if !data.hijriDate.isEmpty {
                            Text("· \\(data.hijriDate)")
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(Color.secondary.opacity(0.6))
                        }
                    }
                } else {
                    Text("“In the remembrance of Allah do hearts find rest”")
                        .font(.system(size: 12, weight: .regular))
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                        .multilineTextAlignment(.center)

                    Text("— 13:28")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(Color.secondary.opacity(0.6))
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ViewBuilder
    private func mediumDot(status: String) -> some View {
        if status == "prayed" {
            Circle().fill(SukoonColors.sage)
                .frame(width: 9, height: 9)
        } else if status == "current" {
            Circle().fill(SukoonColors.gold)
                .frame(width: 9, height: 9)
        } else if status == "missed" {
            Circle().stroke(SukoonColors.missedRed, lineWidth: 1.5)
                .frame(width: 9, height: 9)
        } else {
            Circle().stroke(.secondary, lineWidth: 1)
                .frame(width: 9, height: 9)
        }
    }
}

// MARK: - Lock Screen: Inline

struct AccessoryInlineView: View {
    let data: WidgetPrayerData

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "moon.stars.fill")
            Text(data.nextPrayerName.isEmpty ? "—" : "\\(data.nextPrayerName) · \\(DateHelper.formatTime(data.nextPrayerTime))")
        }
    }
}

// MARK: - Lock Screen: Circular

struct AccessoryCircularView: View {
    let data: WidgetPrayerData

    private var progress: Double {
        guard data.totalPrayers > 0 else { return 0 }
        return Double(data.completedCount) / Double(data.totalPrayers)
    }

    var body: some View {
        Gauge(value: progress) {
            Image(systemName: "moon.stars.fill")
        } currentValueLabel: {
            Text("\\(data.completedCount)")
                .font(.system(size: 20, weight: .bold, design: .rounded))
        }
        .gaugeStyle(.accessoryCircular)
    }
}

// MARK: - Lock Screen: Rectangular

struct AccessoryRectangularView: View {
    let data: WidgetPrayerData

    private var nextDate: Date? { DateHelper.parseISO(data.nextPrayerTime) }

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("NEXT PRAYER")
                .font(.system(size: 10, weight: .semibold))
                .textCase(.uppercase)
                .opacity(0.6)

            HStack(spacing: 6) {
                Text(data.nextPrayerName.isEmpty ? "\u2014" : data.nextPrayerName)
                    .font(.system(size: 16, weight: .bold, design: .serif))
                    .lineLimit(1)

                Text(DateHelper.formatTime(data.nextPrayerTime))
                    .font(.system(size: 14, weight: .medium))
                    .opacity(0.8)
            }

            HStack(spacing: 4) {
                ForEach(data.prayerTimes) { p in
                    lockScreenDot(status: p.status)
                }

                Spacer(minLength: 0)

                if let nd = nextDate, nd > Date() {
                    Text(nd, style: .relative)
                        .font(.system(size: 10, weight: .medium))
                        .opacity(0.6)
                        .lineLimit(1)
                }
            }
        }
    }

    @ViewBuilder
    private func lockScreenDot(status: String) -> some View {
        if status == "prayed" {
            Circle().fill(.primary)
                .frame(width: 6, height: 6)
        } else if status == "current" {
            Circle().fill(.primary)
                .frame(width: 6, height: 6)
                .opacity(0.8)
        } else if status == "missed" {
            Circle().stroke(.primary, lineWidth: 1.5)
                .frame(width: 6, height: 6)
                .opacity(0.5)
        } else {
            Circle().stroke(.primary, lineWidth: 1)
                .frame(width: 6, height: 6)
                .opacity(0.3)
        }
    }
}

// MARK: - Widget Definition

struct SukoonWidget: Widget {
    let kind = "SukoonWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SukoonProvider()) { entry in
            if #available(iOS 17.0, *) {
                WidgetEntryView(entry: entry)
                    .containerBackground(for: .widget) { }
            } else {
                WidgetEntryView(entry: entry)
                    .background(.ultraThinMaterial)
            }
        }
        .configurationDisplayName("Prayer Times")
        .description("Your next prayer, daily progress, and a Quranic reminder.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

struct WidgetEntryView: View {
    @Environment(\\.widgetFamily) var family
    let entry: SukoonEntry

    var body: some View {
        switch family {
        case .systemMedium:
            MediumWidgetView(data: entry.data)
        case .accessoryInline:
            AccessoryInlineView(data: entry.data)
        case .accessoryCircular:
            AccessoryCircularView(data: entry.data)
        case .accessoryRectangular:
            AccessoryRectangularView(data: entry.data)
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
    const iosPath = config.modRequest.platformProjectRoot;
    const objects = project.hash.project.objects;
    const genUuid = () => project.generateUuid();
    const liveActivityPath = path.join(iosPath, WIDGET_NAME, 'SukoonLiveActivity.swift');
    const hasLiveActivitySource = fs.existsSync(liveActivityPath);
    const appVersion = config.version || '1.0.0';
    const appBuildNumber =
      (config.ios && config.ios.buildNumber) ||
      (config.android && config.android.versionCode && String(config.android.versionCode)) ||
      '1';

    const nativeTargets = objects['PBXNativeTarget'] || {};
    let widgetTargetUuid = null;
    let widgetTargetObj = null;

    for (const key of Object.keys(nativeTargets)) {
      if (key.endsWith('_comment')) continue;
      const target = nativeTargets[key];
      if (
        target &&
        typeof target === 'object' &&
        (target.name === `"${WIDGET_NAME}"` || target.name === WIDGET_NAME)
      ) {
        widgetTargetUuid = key;
        widgetTargetObj = target;
        break;
      }
    }

    // --- 1. Add the widget target (creates empty Sources + Frameworks phases) ---
    let target = null;
    if (!widgetTargetUuid) {
      target = project.addTarget(
        WIDGET_NAME,
        'app_extension',
        WIDGET_NAME,
        WIDGET_BUNDLE_ID
      );

      if (!target) {
        console.error('❌ Failed to add widget target');
        return config;
      }

      widgetTargetUuid = target.uuid;
      widgetTargetObj = target.pbxNativeTarget;
      console.log('✅ Added widget target:', WIDGET_NAME);
    } else {
      console.log('⚠️ Widget target already exists, reconciling configuration...');
    }

    // --- 2. Locate the widget target's Sources build phase ---
    let widgetSourcesPhaseUuid = null;
    const sourcePhasesSection = objects['PBXSourcesBuildPhase'] || {};
    if (widgetTargetObj && widgetTargetObj.buildPhases) {
      for (const bp of widgetTargetObj.buildPhases) {
        const uuid = bp.value || bp;
        const phase = sourcePhasesSection[uuid];
        if (phase && typeof phase === 'object') {
          widgetSourcesPhaseUuid = uuid;
          break;
        }
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
      if (widgetTargetObj && widgetTargetObj.buildPhases) {
        widgetTargetObj.buildPhases.push({
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
    ];
    if (hasLiveActivitySource) {
      widgetSourceFiles.push({ name: 'SukoonLiveActivity.swift', path: 'SukoonLiveActivity.swift' });
    }

    for (const file of widgetSourceFiles) {
      const phase = widgetSourcesPhaseUuid
        ? objects['PBXSourcesBuildPhase'][widgetSourcesPhaseUuid]
        : null;
      const group = objects['PBXGroup'][widgetGroupKey];
      const alreadyInPhase = !!(phase && phase.files && phase.files.some((entry) =>
        (entry.comment || '').includes(file.name)
      ));
      const alreadyInGroup = !!(group && group.children && group.children.some((entry) =>
        (entry.comment || '').includes(file.name)
      ));

      if (alreadyInPhase && alreadyInGroup) {
        continue;
      }

      const fileRefUuid = genUuid();

      // PBXFileReference
      objects['PBXFileReference'][fileRefUuid] = {
        isa: 'PBXFileReference',
        lastKnownFileType: 'sourcecode.swift',
        name: `"${file.name}"`,
        path: `"${file.path}"`,
        sourceTree: '"<group>"',
      };
      objects['PBXFileReference'][`${fileRefUuid}_comment`] = file.name;

      // Add to widget Sources build phase
      if (!alreadyInPhase && phase && phase.files) {
        const buildFileUuid = genUuid();
        // PBXBuildFile → links file ref to widget target compile
        objects['PBXBuildFile'][buildFileUuid] = {
          isa: 'PBXBuildFile',
          fileRef: fileRefUuid,
          fileRef_comment: file.name,
        };
        objects['PBXBuildFile'][`${buildFileUuid}_comment`] = `${file.name} in Sources`;

          phase.files.push({
            value: buildFileUuid,
            comment: `${file.name} in Sources`,
          });
      }

      // Add file ref to widget PBXGroup
      if (!alreadyInGroup && group && group.children) {
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
        (cfg.buildSettings.PRODUCT_NAME === `"${WIDGET_NAME}"` ||
         cfg.buildSettings.PRODUCT_NAME === WIDGET_NAME)
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
        cfg.buildSettings.CURRENT_PROJECT_VERSION = `"${appBuildNumber}"`;
        cfg.buildSettings.MARKETING_VERSION = `"${appVersion}"`;
        cfg.buildSettings.SKIP_INSTALL = '"YES"';
      }
    }

    // --- 7. Create Frameworks build phase for widget target ---
    // addFramework() silently fails because addTarget() doesn't reliably
    // create a Frameworks build phase. We create it manually.
    let fwPhaseUuid = null;
    if (widgetTargetObj && widgetTargetObj.buildPhases) {
      for (const bp of widgetTargetObj.buildPhases) {
        const uuid = bp.value || bp;
        const phase = (objects['PBXFrameworksBuildPhase'] || {})[uuid];
        if (phase && typeof phase === 'object') {
          fwPhaseUuid = uuid;
          break;
        }
      }
    }

    if (!objects['PBXFrameworksBuildPhase']) objects['PBXFrameworksBuildPhase'] = {};
    if (!fwPhaseUuid) {
      fwPhaseUuid = genUuid();
      objects['PBXFrameworksBuildPhase'][fwPhaseUuid] = {
        isa: 'PBXFrameworksBuildPhase',
        buildActionMask: 2147483647,
        files: [],
        runOnlyForDeploymentPostprocessing: 0,
      };
      objects['PBXFrameworksBuildPhase'][`${fwPhaseUuid}_comment`] = 'Frameworks';

      if (widgetTargetObj && widgetTargetObj.buildPhases) {
        widgetTargetObj.buildPhases.push({
          value: fwPhaseUuid,
          comment: 'Frameworks',
        });
      }
    }

    const frameworksToEnsure = [
      {
        name: 'SwiftUI.framework',
        path: 'System/Library/Frameworks/SwiftUI.framework',
      },
      {
        name: 'WidgetKit.framework',
        path: 'System/Library/Frameworks/WidgetKit.framework',
      },
    ];
    if (hasLiveActivitySource) {
      frameworksToEnsure.push({
        name: 'ActivityKit.framework',
        path: 'System/Library/Frameworks/ActivityKit.framework',
      });
    }

    const frameworksGroupKey = project.findPBXGroupKey({ name: 'Frameworks' });
    const frameworksPhase = objects['PBXFrameworksBuildPhase'][fwPhaseUuid];
    for (const framework of frameworksToEnsure) {
      const alreadyInPhase = !!(frameworksPhase && frameworksPhase.files && frameworksPhase.files.some((entry) =>
        (entry.comment || '').includes(framework.name)
      ));
      const alreadyInGroup = !!(
        frameworksGroupKey &&
        objects['PBXGroup'][frameworksGroupKey] &&
        objects['PBXGroup'][frameworksGroupKey].children &&
        objects['PBXGroup'][frameworksGroupKey].children.some((entry) =>
          (entry.comment || '').includes(framework.name)
        )
      );

      if (!alreadyInPhase) {
        const frameworkRefUuid = genUuid();

        if (!objects['PBXFileReference']) objects['PBXFileReference'] = {};
        objects['PBXFileReference'][frameworkRefUuid] = {
          isa: 'PBXFileReference',
          lastKnownFileType: 'wrapper.framework',
          name: framework.name,
          path: framework.path,
          sourceTree: 'SDKROOT',
        };
        objects['PBXFileReference'][`${frameworkRefUuid}_comment`] = framework.name;

        const frameworkBuildFileUuid = genUuid();
        objects['PBXBuildFile'][frameworkBuildFileUuid] = {
          isa: 'PBXBuildFile',
          fileRef: frameworkRefUuid,
          fileRef_comment: framework.name,
        };
        objects['PBXBuildFile'][`${frameworkBuildFileUuid}_comment`] = `${framework.name} in Frameworks`;

        frameworksPhase.files.push({
          value: frameworkBuildFileUuid,
          comment: `${framework.name} in Frameworks`,
        });

        if (
          !alreadyInGroup &&
          frameworksGroupKey &&
          objects['PBXGroup'][frameworksGroupKey] &&
          objects['PBXGroup'][frameworksGroupKey].children
        ) {
          objects['PBXGroup'][frameworksGroupKey].children.push({
            value: frameworkRefUuid,
            comment: framework.name,
          });
        }
      }
    }

    console.log(
      hasLiveActivitySource
        ? '✅ Ensured widget frameworks build phase with SwiftUI + WidgetKit + ActivityKit'
        : '✅ Ensured widget frameworks build phase with SwiftUI + WidgetKit'
    );

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
      // Add to main app target's dependencies
      // Find main app target by name (UUID hash lookup is unreliable)
      let mainNativeTarget = null;
      let mainNativeTargetUuid = null;
      for (const key of Object.keys(nativeTargets)) {
        if (key.endsWith('_comment')) continue;
        const t = nativeTargets[key];
        if (t && typeof t === 'object' &&
            (t.name === `"${projectName}"` || t.name === projectName)) {
          mainNativeTarget = t;
          mainNativeTargetUuid = key;
          break;
        }
      }

      const hasDependency = !!(
        mainNativeTarget &&
        mainNativeTarget.dependencies &&
        mainNativeTarget.dependencies.some((dep) => {
          const depUuid = dep.value || dep;
          const depObj = (objects['PBXTargetDependency'] || {})[depUuid];
          return depObj && depObj.target === widgetTargetUuid;
        })
      );

      if (!hasDependency && mainNativeTarget && mainNativeTarget.dependencies && mainNativeTargetUuid) {
        const proxyUuid = genUuid();
        const depUuid = genUuid();
        const projectRootUuid = project.hash.project.rootObject;

        if (!objects['PBXContainerItemProxy']) objects['PBXContainerItemProxy'] = {};
        objects['PBXContainerItemProxy'][proxyUuid] = {
          isa: 'PBXContainerItemProxy',
          containerPortal: projectRootUuid,
          containerPortal_comment: 'Project object',
          proxyType: 1,
          remoteGlobalIDString: widgetTargetUuid,
          remoteInfo: `"${WIDGET_NAME}"`,
        };
        objects['PBXContainerItemProxy'][`${proxyUuid}_comment`] = 'PBXContainerItemProxy';

        if (!objects['PBXTargetDependency']) objects['PBXTargetDependency'] = {};
        objects['PBXTargetDependency'][depUuid] = {
          isa: 'PBXTargetDependency',
          target: widgetTargetUuid,
          target_comment: WIDGET_NAME,
          targetProxy: proxyUuid,
          targetProxy_comment: 'PBXContainerItemProxy',
        };
        objects['PBXTargetDependency'][`${depUuid}_comment`] = 'PBXTargetDependency';

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
