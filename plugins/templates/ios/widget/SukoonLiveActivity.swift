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
    static let night = Color(red: 0.035, green: 0.051, blue: 0.094)
    static let text = Color(red: 0.95, green: 0.93, blue: 0.89)
    static let secondary = Color.white.opacity(0.72)
    static let mutedText = Color(red: 0.478, green: 0.518, blue: 0.600)
    static let backgroundTop = Color(red: 0.07, green: 0.11, blue: 0.19)
    static let backgroundBottom = Color(red: 0.03, green: 0.05, blue: 0.10)
    static let border = Color.white.opacity(0.10)
    static let buttonBorder = Color.white.opacity(0.12)
    static let prepareFill = teal
    static let prepareText = night
    static let prayedFill = night
    static let prayedText = mutedText

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
                    .fill(LAColors.prepareFill)
                    .frame(width: geo.size.width * min(max(CGFloat(progress), 0), 1), height: height)
            }
        }
        .frame(height: height)
    }
}

private struct ActivityActionLabel: View {
    let title: String
    let variant: Variant

    enum Variant {
        case primary
        case secondary
    }

    var body: some View {
        Text(title)
            .font(.system(size: 13, weight: .semibold))
            .foregroundColor(variant == .primary ? LAColors.prepareText : LAColors.prayedText)
            .padding(.horizontal, 16)
            .padding(.vertical, 6)
            .background(variant == .primary ? LAColors.prepareFill : LAColors.prayedFill)
            .overlay(
                Capsule()
                    .stroke(variant == .secondary ? LAColors.buttonBorder : Color.clear, lineWidth: 1)
            )
            .clipShape(Capsule())
    }
}

private struct CompactActivityActionLabel: View {
    let title: String
    let variant: ActivityActionLabel.Variant

    var body: some View {
        Text(title)
            .font(.system(size: 11, weight: .semibold))
            .foregroundColor(variant == .primary ? LAColors.prepareText : LAColors.prayedText)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(variant == .primary ? LAColors.prepareFill : LAColors.prayedFill)
            .overlay(
                Capsule()
                    .stroke(variant == .secondary ? LAColors.buttonBorder : Color.clear, lineWidth: 1)
            )
            .clipShape(Capsule())
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

private struct ActivityTopStatusCopy {
    static func line(prayerName: String, hasFutureTarget: Bool) -> String {
        if hasFutureTarget {
            return ""
        }

        if prayerName == "Isha" {
            return "Until Fajr tomorrow"
        }

        return "Now"
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
                                ActivityActionLabel(title: "Prepare", variant: .primary)
                            }

                            Link(destination: URL(string: "sukoon://prayed?prayer=\(context.state.prayerName)")!) {
                                ActivityActionLabel(title: "Prayed", variant: .secondary)
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
                    Text(
                        ActivityTopStatusCopy.line(
                            prayerName: context.state.prayerName,
                            hasFutureTarget: false
                        )
                    )
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
                            CompactActivityActionLabel(title: "Prepare", variant: .primary)
                        }

                        Link(destination: URL(string: "sukoon://prayed?prayer=\(context.state.prayerName)")!) {
                            CompactActivityActionLabel(title: "Prayed", variant: .secondary)
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
