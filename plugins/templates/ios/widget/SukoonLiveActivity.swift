import ActivityKit
import WidgetKit
import SwiftUI

struct SukoonPrayerAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var prayerName: String
        var countdownTargetISO: String
        var phase: String
        var progress: Double
        var prayerStatuses: [String]
        var prayerAccentKeys: [String]
    }

    var prayerNames: [String]
}

private struct LADateHelper {
    static let isoFrac: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    static let iso: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    static let timeFmt: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter
    }()

    static func parse(_ value: String) -> Date? {
        if value.isEmpty { return nil }
        return isoFrac.date(from: value) ?? iso.date(from: value)
    }
}

private struct LAColors {
    static let gold = Color(red: 0.831, green: 0.686, blue: 0.216)
    static let teal = Color(red: 0.176, green: 0.831, blue: 0.749)
    static let text = Color(red: 0.95, green: 0.93, blue: 0.89)
    static let secondary = Color.white.opacity(0.72)
    static let backgroundTop = Color(red: 0.07, green: 0.11, blue: 0.19)
    static let backgroundBottom = Color(red: 0.03, green: 0.05, blue: 0.10)
    static let border = Color.white.opacity(0.10)

    static func accent(for key: String) -> Color {
        switch key {
        case "fajr":
            return Color(red: 0.47, green: 0.53, blue: 0.80)
        case "dhuhr":
            return Color(red: 0.51, green: 0.78, blue: 0.52)
        case "asr":
            return Color(red: 0.86, green: 0.91, blue: 0.46)
        case "maghrib":
            return Color(red: 0.81, green: 0.58, blue: 0.85)
        case "isha":
            return Color(red: 0.62, green: 0.66, blue: 0.85)
        default:
            return gold
        }
    }
}

private struct PrayerDot: View {
    let status: String
    let accentKey: String

    private var accent: Color { LAColors.accent(for: accentKey) }

    var body: some View {
        ZStack {
            if status == "missed" {
                Circle()
                    .stroke(accent.opacity(0.28), lineWidth: 1.2)
                    .frame(width: 8, height: 8)
            } else {
                Circle()
                    .fill(fillColor)
                    .frame(width: 8, height: 8)
                    .overlay(
                        Circle()
                            .stroke(accent.opacity(status == "current" || status == "next" ? 0.92 : 0), lineWidth: 1.1)
                    )
                    .shadow(color: accent.opacity(status == "current" || status == "next" ? 0.35 : 0), radius: 3)
            }
        }
    }

    private var fillColor: Color {
        switch status {
        case "prayed":
            return accent.opacity(0.96)
        case "current", "next":
            return accent.opacity(0.96)
        case "upcoming":
            return accent.opacity(0.24)
        default:
            return accent.opacity(0.18)
        }
    }
}

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
                    .fill(LAColors.gold)
                    .frame(width: geo.size.width * min(max(CGFloat(progress), 0), 1), height: height)
            }
        }
        .frame(height: height)
    }
}

private struct ActivitySupportiveCopy {
    static func line(for phase: String) -> String {
        switch phase {
        case "fiqh_window":
            return "Return with the next prayer"
        case "prayed":
            return "Rest in remembrance until the next prayer"
        default:
            return "Prepare for the next salah"
        }
    }
}

@available(iOS 16.2, *)
struct SukoonLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SukoonPrayerAttributes.self) { context in
            lockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text(context.state.prayerName)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(LAColors.text)
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
                            ForEach(Array(context.state.prayerStatuses.enumerated()), id: \.offset) { index, status in
                                PrayerDot(status: status, accentKey: accentKey(for: index, in: context))
                            }
                        }
                    }
                    .padding(.top, 4)
                }

                DynamicIslandExpandedRegion(.bottom) {
                    if context.state.phase == "fiqh_window" {
                        HStack(spacing: 12) {
                            Link(destination: URL(string: "sukoon://prepare?prayer=\(context.state.prayerName)")!) {
                                Text("Prepare")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 6)
                                    .background(LAColors.gold.opacity(0.78))
                                    .clipShape(Capsule())
                            }

                            Link(destination: URL(string: "sukoon://prayed?prayer=\(context.state.prayerName)")!) {
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
                    .foregroundColor(LAColors.text)
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
                    .foregroundColor(LAColors.gold)
            }
        }
    }

    @ViewBuilder
    private func lockScreenView(context: ActivityViewContext<SukoonPrayerAttributes>) -> some View {
        VStack(spacing: 8) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "moon.stars.fill")
                        .font(.system(size: 14))
                        .foregroundColor(LAColors.gold)

                    Text(context.state.prayerName)
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(LAColors.text)
                }

                Spacer()

                if let target = LADateHelper.parse(context.state.countdownTargetISO), target > Date() {
                    HStack(spacing: 4) {
                        Text(target, style: .timer)
                            .font(.system(size: 15, weight: .medium, design: .monospaced))
                            .foregroundColor(LAColors.teal)

                        Text(context.state.phase == "fiqh_window" ? "remaining" : "")
                            .font(.system(size: 12))
                            .foregroundColor(LAColors.secondary)
                    }
                } else {
                    Text(ActivitySupportiveCopy.line(for: context.state.phase))
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(LAColors.gold)
                }
            }

            PrayerProgressBar(progress: context.state.progress)

            HStack {
                Text(ActivitySupportiveCopy.line(for: context.state.phase))
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(LAColors.secondary)
                    .lineLimit(1)

                Spacer()

                if let target = LADateHelper.parse(context.state.countdownTargetISO) {
                    Text(LADateHelper.timeFmt.string(from: target))
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(LAColors.text)
                }
            }

            HStack {
                HStack(spacing: 6) {
                    ForEach(Array(context.state.prayerStatuses.enumerated()), id: \.offset) { index, status in
                        PrayerDot(status: status, accentKey: accentKey(for: index, in: context))
                    }
                }

                Spacer()

                if context.state.phase == "fiqh_window" {
                    HStack(spacing: 8) {
                        Link(destination: URL(string: "sukoon://prepare?prayer=\(context.state.prayerName)")!) {
                            Text("Prepare")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 4)
                                .background(LAColors.gold.opacity(0.78))
                                .clipShape(Capsule())
                        }

                        Link(destination: URL(string: "sukoon://prayed?prayer=\(context.state.prayerName)")!) {
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
        .background(
            LinearGradient(
                colors: [LAColors.backgroundTop, LAColors.backgroundBottom],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(LAColors.border, lineWidth: 1)
        )
    }

    private func accentKey(
        for index: Int,
        in context: ActivityViewContext<SukoonPrayerAttributes>
    ) -> String {
        if index < context.state.prayerAccentKeys.count {
            return context.state.prayerAccentKeys[index]
        }
        if index < context.attributes.prayerNames.count {
            return context.attributes.prayerNames[index].lowercased()
        }
        return "asr"
    }
}
