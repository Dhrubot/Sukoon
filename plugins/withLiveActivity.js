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
// iOS: LIVE ACTIVITY SWIFT CODE (added to widget extension)
// ═══════════════════════════════════════════════════════════════════

const LIVE_ACTIVITY_SWIFT = `import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Activity Attributes

struct SukoonPrayerAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var prayerName: String
        var countdownTargetISO: String
        var phase: String              // "pre_adhan" | "fiqh_window" | "prayed"
        var progress: Double           // 0.0–1.0
        var prayerStatuses: [String]   // 5 statuses: "prayed"|"current"|"upcoming"|"missed"
    }

    var prayerNames: [String]
}

// MARK: - Helpers

private struct LADateHelper {
    static let isoFrac: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
    static let iso: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()
    static let timeFmt: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "h:mm a"
        return f
    }()
    static func parse(_ s: String) -> Date? {
        if s.isEmpty { return nil }
        return isoFrac.date(from: s) ?? iso.date(from: s)
    }
}

private struct LAColors {
    static let sage = Color(red: 0.176, green: 0.545, blue: 0.435)
    static let gold = Color(red: 0.831, green: 0.686, blue: 0.216)
    static let missedRed = Color(red: 0.562, green: 0.160, blue: 0.160)
    static let teal = Color(red: 0.176, green: 0.831, blue: 0.749)
}

// MARK: - Prayer Status Dot

private struct PrayerDot: View {
    let status: String
    var body: some View {
        Group {
            if status == "prayed" {
                Circle().fill(LAColors.sage).frame(width: 8, height: 8)
            } else if status == "current" {
                Circle().fill(LAColors.gold).frame(width: 8, height: 8)
            } else if status == "missed" {
                Circle().stroke(LAColors.missedRed, lineWidth: 1.5).frame(width: 8, height: 8)
            } else {
                Circle().fill(Color.gray.opacity(0.3)).frame(width: 8, height: 8)
            }
        }
    }
}

// MARK: - Progress Bar

private struct PrayerProgressBar: View {
    let progress: Double
    var height: CGFloat = 4

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: height / 2)
                    .fill(Color.white.opacity(0.15))
                    .frame(height: height)
                RoundedRectangle(cornerRadius: height / 2)
                    .fill(LAColors.teal)
                    .frame(width: geo.size.width * min(max(CGFloat(progress), 0), 1), height: height)
            }
        }
        .frame(height: height)
    }
}

// MARK: - Live Activity Widget

@available(iOS 16.2, *)
struct SukoonLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SukoonPrayerAttributes.self) { context in
            // Lock Screen / Banner view
            lockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded regions
                DynamicIslandExpandedRegion(.leading) {
                    Text(context.state.prayerName)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    if let target = LADateHelper.parse(context.state.countdownTargetISO), target > Date() {
                        Text(target, style: .timer)
                            .font(.system(size: 14, weight: .medium, design: .monospaced))
                            .foregroundColor(LAColors.teal)
                            .multilineTextAlignment(.trailing)
                    } else {
                        Text("Now")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(LAColors.gold)
                    }
                }
                DynamicIslandExpandedRegion(.center) {
                    VStack(spacing: 8) {
                        PrayerProgressBar(progress: context.state.progress)

                        HStack(spacing: 6) {
                            ForEach(Array(context.state.prayerStatuses.enumerated()), id: \\.offset) { _, status in
                                PrayerDot(status: status)
                            }
                        }
                    }
                    .padding(.top, 4)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    if context.state.phase == "fiqh_window" {
                        HStack(spacing: 12) {
                            Link(destination: URL(string: "sukoon://prepare?prayer=\\(context.state.prayerName)")!) {
                                Text("Prepare")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 6)
                                    .background(LAColors.sage)
                                    .clipShape(Capsule())
                            }
                            Link(destination: URL(string: "sukoon://prayed?prayer=\\(context.state.prayerName)")!) {
                                Text("Prayed")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 6)
                                    .background(LAColors.teal)
                                    .clipShape(Capsule())
                            }
                        }
                        .padding(.top, 4)
                    }
                }
            } compactLeading: {
                Text(context.state.prayerName)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.white)
            } compactTrailing: {
                if let target = LADateHelper.parse(context.state.countdownTargetISO), target > Date() {
                    Text(target, style: .timer)
                        .font(.system(size: 13, weight: .medium, design: .monospaced))
                        .foregroundColor(LAColors.teal)
                } else {
                    Text("Now")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(LAColors.gold)
                }
            } minimal: {
                Image(systemName: "moon.stars.fill")
                    .font(.system(size: 12))
                    .foregroundColor(LAColors.teal)
            }
        }
    }

    @ViewBuilder
    private func lockScreenView(context: ActivityViewContext<SukoonPrayerAttributes>) -> some View {
        VStack(spacing: 8) {
            // Top row: prayer name + countdown
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "moon.stars.fill")
                        .font(.system(size: 14))
                        .foregroundColor(LAColors.gold)
                    Text(context.state.prayerName)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(.white)
                }

                Spacer()

                if let target = LADateHelper.parse(context.state.countdownTargetISO), target > Date() {
                    HStack(spacing: 4) {
                        Text(target, style: .timer)
                            .font(.system(size: 15, weight: .medium, design: .monospaced))
                            .foregroundColor(LAColors.teal)
                        Text(context.state.phase == "fiqh_window" ? "to pray" : "")
                            .font(.system(size: 12))
                            .foregroundColor(Color.white.opacity(0.6))
                    }
                } else {
                    Text("Time to Pray")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(LAColors.gold)
                }
            }

            // Progress bar
            PrayerProgressBar(progress: context.state.progress)

            // Bottom row: prayer dots + action buttons
            HStack {
                HStack(spacing: 6) {
                    ForEach(Array(context.state.prayerStatuses.enumerated()), id: \\.offset) { _, status in
                        PrayerDot(status: status)
                    }
                }

                Spacer()

                if context.state.phase == "fiqh_window" {
                    HStack(spacing: 8) {
                        Link(destination: URL(string: "sukoon://prepare?prayer=\\(context.state.prayerName)")!) {
                            Text("Prepare")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 4)
                                .background(LAColors.sage)
                                .clipShape(Capsule())
                        }
                        Link(destination: URL(string: "sukoon://prayed?prayer=\\(context.state.prayerName)")!) {
                            Text("Prayed")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 4)
                                .background(LAColors.teal)
                                .clipShape(Capsule())
                        }
                    }
                }
            }
        }
        .padding(16)
        .background(Color.black.opacity(0.85))
    }
}
`;

// ═══════════════════════════════════════════════════════════════════
// iOS: RN BRIDGE (added to MAIN app target)
// ═══════════════════════════════════════════════════════════════════

const BRIDGE_SWIFT = `import Foundation
import ActivityKit

// Duplicated from widget extension — must stay in sync
struct SukoonPrayerAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var prayerName: String
        var countdownTargetISO: String
        var phase: String
        var progress: Double
        var prayerStatuses: [String]
    }
    var prayerNames: [String]
}

struct LiveActivityPayload: Codable {
    let prayerName: String
    let countdownTargetISO: String
    let phase: String
    let progress: Double
    let prayerStatuses: [String]
    let prayerNames: [String]
}

@objc(SukoonLiveActivityBridge)
class SukoonLiveActivityBridge: NSObject {

    @objc
    func startLiveActivity(_ dataJson: String,
                           resolve: @escaping RCTPromiseResolveBlock,
                           reject: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 16.2, *) {
            guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                reject("NOT_ENABLED", "Live Activities are not enabled", nil)
                return
            }
            guard let data = dataJson.data(using: .utf8),
                  let payload = try? JSONDecoder().decode(LiveActivityPayload.self, from: data) else {
                reject("PARSE_ERROR", "Invalid JSON payload", nil)
                return
            }

            // End any existing activities first
            Task {
                for activity in Activity<SukoonPrayerAttributes>.activities {
                    await activity.end(nil, dismissalPolicy: .immediate)
                }

                let attributes = SukoonPrayerAttributes(prayerNames: payload.prayerNames)
                let state = SukoonPrayerAttributes.ContentState(
                    prayerName: payload.prayerName,
                    countdownTargetISO: payload.countdownTargetISO,
                    phase: payload.phase,
                    progress: payload.progress,
                    prayerStatuses: payload.prayerStatuses
                )

                do {
                    let content = ActivityContent(state: state, staleDate: nil)
                    let activity = try Activity.request(attributes: attributes, content: content, pushType: nil)
                    resolve(activity.id)
                } catch {
                    reject("START_ERROR", error.localizedDescription, error)
                }
            }
        } else {
            reject("UNSUPPORTED", "Live Activities require iOS 16.2+", nil)
        }
    }

    @objc
    func updateLiveActivity(_ dataJson: String,
                            resolve: @escaping RCTPromiseResolveBlock,
                            reject: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 16.2, *) {
            guard let data = dataJson.data(using: .utf8),
                  let payload = try? JSONDecoder().decode(LiveActivityPayload.self, from: data) else {
                reject("PARSE_ERROR", "Invalid JSON payload", nil)
                return
            }

            let state = SukoonPrayerAttributes.ContentState(
                prayerName: payload.prayerName,
                countdownTargetISO: payload.countdownTargetISO,
                phase: payload.phase,
                progress: payload.progress,
                prayerStatuses: payload.prayerStatuses
            )

            Task {
                let activities = Activity<SukoonPrayerAttributes>.activities
                if activities.isEmpty {
                    // No active activity — start one instead
                    let attributes = SukoonPrayerAttributes(prayerNames: payload.prayerNames)
                    do {
                        let content = ActivityContent(state: state, staleDate: nil)
                        let activity = try Activity.request(attributes: attributes, content: content, pushType: nil)
                        resolve(activity.id)
                    } catch {
                        reject("START_ERROR", error.localizedDescription, error)
                    }
                } else {
                    for activity in activities {
                        await activity.update(ActivityContent(state: state, staleDate: nil))
                    }
                    resolve(true)
                }
            }
        } else {
            reject("UNSUPPORTED", "Live Activities require iOS 16.2+", nil)
        }
    }

    @objc
    func endLiveActivity(_ resolve: @escaping RCTPromiseResolveBlock,
                         reject: @escaping RCTPromiseRejectBlock) {
        if #available(iOS 16.2, *) {
            Task {
                for activity in Activity<SukoonPrayerAttributes>.activities {
                    await activity.end(nil, dismissalPolicy: .immediate)
                }
                resolve(true)
            }
        } else {
            resolve(true)
        }
    }

    @objc
    static func requiresMainQueueSetup() -> Bool { false }
}
`;

const BRIDGE_OBJC = `#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SukoonLiveActivityBridge, NSObject)

RCT_EXTERN_METHOD(startLiveActivity:(NSString *)dataJson
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(updateLiveActivity:(NSString *)dataJson
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(endLiveActivity:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
`;

// ═══════════════════════════════════════════════════════════════════
// ANDROID: JAVA FILES
// ═══════════════════════════════════════════════════════════════════

const LIVE_ACTIVITY_MODULE_JAVA = `package com.talukders.sukoon;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.SystemClock;
import android.util.Log;
import android.widget.RemoteViews;

import androidx.core.app.NotificationCompat;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class LiveActivityModule extends ReactContextBaseJavaModule {
    private static final String TAG = "LiveActivityModule";
    private static final String MODULE_NAME = "LiveActivityModule";
    private static final String CHANNEL_ID = "sukoon-live-activity";
    private static final int NOTIFICATION_ID = 8001;

    public LiveActivityModule(ReactApplicationContext reactContext) {
        super(reactContext);
        createNotificationChannel(reactContext);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    private void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Prayer Countdown",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Shows current prayer countdown on your lock screen");
            channel.setSound(null, null);
            channel.enableVibration(false);
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

            NotificationManager nm = context.getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    @ReactMethod
    public void startLiveActivity(String dataJson, Promise promise) {
        try {
            Context context = getReactApplicationContext();
            JSONObject payload = new JSONObject(dataJson);
            Notification notification = buildNotification(context, payload);
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(NOTIFICATION_ID, notification);
            }
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start live activity: " + e.getMessage());
            promise.reject("START_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void updateLiveActivity(String dataJson, Promise promise) {
        // Same as start — just updates the notification
        startLiveActivity(dataJson, promise);
    }

    @ReactMethod
    public void endLiveActivity(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(NOTIFICATION_ID);
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.resolve(true);
        }
    }

    private Notification buildNotification(Context context, JSONObject payload) throws Exception {
        String prayerName = payload.optString("prayerName", "Prayer");
        String phase = payload.optString("phase", "pre_adhan");
        String countdownTargetISO = payload.optString("countdownTargetISO", "");
        double progress = payload.optDouble("progress", 0.0);
        JSONArray statuses = payload.optJSONArray("prayerStatuses");

        // Parse target time for chronometer
        long targetMs = 0;
        if (!countdownTargetISO.isEmpty()) {
            try {
                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
                Date targetDate = sdf.parse(countdownTargetISO);
                if (targetDate != null) {
                    targetMs = targetDate.getTime();
                }
            } catch (Exception e) {
                // Try without fractional seconds
                try {
                    SimpleDateFormat sdf2 = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US);
                    sdf2.setTimeZone(TimeZone.getTimeZone("UTC"));
                    Date targetDate = sdf2.parse(countdownTargetISO);
                    if (targetDate != null) {
                        targetMs = targetDate.getTime();
                    }
                } catch (Exception e2) {
                    Log.w(TAG, "Failed to parse countdown target: " + countdownTargetISO);
                }
            }
        }

        // Build status text
        String statusText;
        if (phase.equals("fiqh_window")) {
            long remainingMs = targetMs - System.currentTimeMillis();
            statusText = prayerName + " \\u00b7 " + formatDuration(remainingMs) + " to pray";
        } else if (phase.equals("prayed")) {
            statusText = prayerName + " \\u2713";
        } else {
            long remainingMs = targetMs - System.currentTimeMillis();
            statusText = prayerName + " \\u00b7 in " + formatDuration(remainingMs);
        }

        // Build dots text
        StringBuilder dots = new StringBuilder();
        if (statuses != null) {
            for (int i = 0; i < statuses.length(); i++) {
                String s = statuses.optString(i, "upcoming");
                if (i > 0) dots.append(" ");
                if (s.equals("prayed")) dots.append("\\u25cf");      // ●
                else if (s.equals("current")) dots.append("\\u25c9"); // ◉
                else if (s.equals("missed")) dots.append("\\u25cb");  // ○
                else dots.append("\\u25cb");                           // ○
            }
        }

        // Tap intent — opens app
        Intent tapIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (tapIntent == null) {
            tapIntent = new Intent();
        }
        if (phase.equals("fiqh_window")) {
            tapIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("sukoon://prepare?prayer=" + prayerName));
            tapIntent.setPackage(context.getPackageName());
        }
        tapIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        int tapFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            tapFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent tapPending = PendingIntent.getActivity(context, 0, tapIntent, tapFlags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_recent_history)
            .setContentTitle(statusText)
            .setContentText(dots.toString())
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(tapPending)
            .setProgress(100, (int) (progress * 100), false);

        // Action buttons during fiqh window
        if (phase.equals("fiqh_window")) {
            // Prepare action
            Intent prepareIntent = new Intent(Intent.ACTION_VIEW,
                Uri.parse("sukoon://prepare?prayer=" + prayerName));
            prepareIntent.setPackage(context.getPackageName());
            PendingIntent preparePending = PendingIntent.getActivity(context, 1, prepareIntent, tapFlags);
            builder.addAction(0, "Prepare", preparePending);

            // Prayed action
            Intent prayedIntent = new Intent(Intent.ACTION_VIEW,
                Uri.parse("sukoon://prayed?prayer=" + prayerName));
            prayedIntent.setPackage(context.getPackageName());
            PendingIntent prayedPending = PendingIntent.getActivity(context, 2, prayedIntent, tapFlags);
            builder.addAction(0, "Prayed", prayedPending);
        }

        // Use chronometer for countdown if target is in the future
        if (targetMs > System.currentTimeMillis()) {
            long elapsedRealtime = SystemClock.elapsedRealtime();
            long diff = targetMs - System.currentTimeMillis();
            builder.setUsesChronometer(true);
            builder.setChronometerCountDown(true);
            builder.setWhen(System.currentTimeMillis() + diff);
        }

        return builder.build();
    }

    private String formatDuration(long ms) {
        if (ms <= 0) return "now";
        long totalMinutes = ms / (1000 * 60);
        long hours = totalMinutes / 60;
        long minutes = totalMinutes % 60;
        if (hours > 0) {
            return hours + "h " + minutes + "m";
        }
        return minutes + "m";
    }
}
`;

const LIVE_ACTIVITY_PACKAGE_JAVA = `package com.talukders.sukoon;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class LiveActivityPackage implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new LiveActivityModule(reactContext));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
`;

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
      console.log('ℹ️ Widget target not found yet — withWidget will attach Live Activity sources after the widget target is created');
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
        LIVE_ACTIVITY_MODULE_JAVA,
        'utf-8'
      );
      console.log('✅ Created LiveActivityModule.java');

      fs.writeFileSync(
        path.join(javaPath, 'LiveActivityPackage.java'),
        LIVE_ACTIVITY_PACKAGE_JAVA,
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
