import ActivityKit
import WidgetKit
import SwiftUI

struct SukoonPrayerAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var prayerName: String
        var prayerArabicName: String
        var activePrayerName: String
        var hijriShortLabel: String
        var countdownTargetISO: String
        var countdownTargetPrayerName: String
        var phase: String
        var countdownMode: String
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
    static let text = Color(red: 0.95, green: 0.93, blue: 0.89)
    static let secondary = Color.white.opacity(0.74)
    static let muted = Color.white.opacity(0.34)
    static let border = Color.white.opacity(0.11)
    static let track = Color.white.opacity(0.11)
    static let backgroundTop = Color(red: 0.05, green: 0.08, blue: 0.16)
    static let backgroundBottom = Color(red: 0.03, green: 0.05, blue: 0.10)
    static let buttonFill = Color.white.opacity(0.05)

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
            return Color(red: 0.83, green: 0.69, blue: 0.22)
        }
    }
}

private struct PrayerProgressBar: View {
    let progress: Double
    let accent: Color

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(
                        LinearGradient(
                            colors: [
                                Color.white.opacity(0.10),
                                LAColors.track.opacity(0.88),
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .frame(height: 2.5)

                Capsule()
                    .fill(
                        LinearGradient(
                            colors: [
                                accent.opacity(0.62),
                                accent.opacity(0.86),
                                accent.opacity(1.0),
                            ],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(width: geo.size.width * CGFloat(min(max(progress, 0), 1)), height: 2.5)
            }
        }
        .frame(height: 2.5)
    }
}

private struct LockScreenPrayerDot: View {
    let label: String
    let status: String
    let accentKey: String

    private var accent: Color { LAColors.accent(for: accentKey) }
    private var isActive: Bool { status == "current" || status == "next" }
    private var isPrayed: Bool { status == "prayed" }
    private var dotSize: CGFloat { isActive ? 10 : 7 }
    private var labelColor: Color {
        if isActive { return accent.opacity(0.9) }
        if isPrayed { return LAColors.secondary.opacity(0.62) }
        return LAColors.secondary.opacity(0.34)
    }

    var body: some View {
        VStack(spacing: 2.5) {
            Group {
                if status == "missed" {
                    Circle()
                        .stroke(accent.opacity(0.28), lineWidth: 1)
                        .frame(width: 7, height: 7)
                } else {
                    Circle()
                        .fill(dotFill)
                        .frame(width: dotSize, height: dotSize)
                        .shadow(color: accent.opacity(isActive ? 0.35 : 0), radius: 4)
                }
            }
            .frame(height: 11)

            Text(shortPrayerLabel(label))
                .font(.system(size: 7.5, weight: isActive ? .semibold : .regular, design: .rounded))
                .foregroundColor(labelColor)
                .lineLimit(1)
        }
    }

    private var dotFill: Color {
        if isActive { return accent.opacity(0.95) }
        if isPrayed { return accent.opacity(0.5) }
        return accent.opacity(0.24)
    }
}

private struct PrayerDotLabel: View {
    let label: String
    let status: String
    let accentKey: String

    private var accent: Color { LAColors.accent(for: accentKey) }
    private var isActive: Bool { status == "current" || status == "next" }

    var body: some View {
        VStack(spacing: 4) {
            ZStack {
                if status == "missed" {
                    Circle()
                        .stroke(accent.opacity(0.34), lineWidth: 1.1)
                        .frame(width: 8, height: 8)
                } else {
                    Circle()
                        .fill(fillColor)
                        .frame(width: isActive ? 10 : 7, height: isActive ? 10 : 7)
                        .shadow(color: accent.opacity(isActive ? 0.35 : 0), radius: 4)
                }
            }
            .frame(height: 12)

            Text(shortPrayerLabel(label))
                .font(.system(size: 8, weight: isActive ? .semibold : .regular, design: .rounded))
                .foregroundColor(isActive ? accent.opacity(0.96) : LAColors.secondary.opacity(0.6))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity)
    }

    private var fillColor: Color {
        switch status {
        case "prayed":
            return accent.opacity(0.9)
        case "current", "next":
            return accent.opacity(0.96)
        case "upcoming":
            return accent.opacity(0.26)
        default:
            return accent.opacity(0.18)
        }
    }
}

private struct CompactPrayerDot: View {
    let status: String
    let accentKey: String

    private var accent: Color { LAColors.accent(for: accentKey) }

    var body: some View {
        if status == "missed" {
            Circle()
                .stroke(accent.opacity(0.34), lineWidth: 1.1)
                .frame(width: 8, height: 8)
        } else {
            Circle()
                .fill(fillColor)
                .frame(width: status == "current" || status == "next" ? 8 : 6, height: status == "current" || status == "next" ? 8 : 6)
        }
    }

    private var fillColor: Color {
        switch status {
        case "prayed":
            return accent.opacity(0.9)
        case "current", "next":
            return accent.opacity(0.96)
        case "upcoming":
            return accent.opacity(0.26)
        default:
            return accent.opacity(0.18)
        }
    }
}

private struct ActivityActionLabel: View {
    let title: String
    let accent: Color
    let secondary: Bool

    var body: some View {
        Text(title)
            .font(.system(size: 13, weight: .semibold, design: .rounded))
            .foregroundColor(secondary ? LAColors.secondary : accent.opacity(0.98))
            .padding(.horizontal, 13)
            .padding(.vertical, 6)
            .background(
                Capsule()
                    .fill(secondary ? LAColors.buttonFill : accent.opacity(0.18))
            )
            .overlay(
                Capsule()
                    .stroke(secondary ? LAColors.border : accent.opacity(0.35), lineWidth: 1)
            )
    }
}

private func shortPrayerLabel(_ prayerName: String) -> String {
    prayerName == "Maghrib" ? "Magh." : prayerName
}

private func windowLabel(for countdownMode: String, phase: String) -> String {
    switch countdownMode {
    case "current_prayer_end":
        return "Prayer Window"
    case "next_prayer_start":
        return phase == "pre_adhan" ? "Countdown" : "Next Prayer"
    default:
        return "Countdown"
    }
}

private func targetLabel(for countdownMode: String) -> String {
    countdownMode == "current_prayer_end" ? "Ends at" : "Starts at"
}

@available(iOS 16.2, *)
private func rowMessage(
    for context: ActivityViewContext<SukoonPrayerAttributes>
) -> String {
    switch context.state.phase {
    case "fiqh_window":
        return context.state.countdownMode == "current_prayer_end"
            ? "Still in His remembrance"
            : "\(context.state.countdownTargetPrayerName) is approaching"
    case "prayed":
        return "Return with the next prayer"
    default:
        return "Prepare your heart quietly"
    }
}

@available(iOS 16.2, *)
private func actionPrayerName(
    for context: ActivityViewContext<SukoonPrayerAttributes>
) -> String {
    context.state.activePrayerName.isEmpty ? context.state.prayerName : context.state.activePrayerName
}

@available(iOS 16.2, *)
private func accentKey(
    for prayerName: String,
    in context: ActivityViewContext<SukoonPrayerAttributes>
) -> String {
    if let index = context.attributes.prayerNames.firstIndex(of: prayerName),
       index < context.state.prayerAccentKeys.count {
        return context.state.prayerAccentKeys[index]
    }

    if let activeIndex = context.state.prayerStatuses.firstIndex(where: { $0 == "current" || $0 == "next" }),
       activeIndex < context.state.prayerAccentKeys.count {
        return context.state.prayerAccentKeys[activeIndex]
    }

    return "dhuhr"
}

@available(iOS 16.2, *)
private func accent(
    for context: ActivityViewContext<SukoonPrayerAttributes>
) -> Color {
    LAColors.accent(for: accentKey(for: context.state.prayerName, in: context))
}

@available(iOS 16.2, *)
private func hasFutureTarget(_ context: ActivityViewContext<SukoonPrayerAttributes>) -> Bool {
    guard let target = LADateHelper.parse(context.state.countdownTargetISO) else { return false }
    return target > Date()
}

@available(iOS 16.2, *)
struct SukoonLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SukoonPrayerAttributes.self) { context in
            lockScreenView(context: context)
                .activityBackgroundTint(nil)
                .activitySystemActionForegroundColor(LAColors.text)
        } dynamicIsland: { context in
            let prayerAccent = accent(for: context)
            let targetDate = LADateHelper.parse(context.state.countdownTargetISO)
            let hasTarget = hasFutureTarget(context)

            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(context.state.prayerName)
                            .font(.system(size: 16, weight: .semibold, design: .rounded))
                            .foregroundColor(LAColors.text)

                        Text(context.state.prayerArabicName)
                            .font(.system(size: 11, weight: .medium, design: .serif))
                            .foregroundColor(prayerAccent.opacity(0.72))
                    }
                }

                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(windowLabel(for: context.state.countdownMode, phase: context.state.phase))
                            .font(.system(size: 10, weight: .medium, design: .rounded))
                            .foregroundColor(prayerAccent.opacity(0.72))
                            .textCase(.uppercase)

                        if let targetDate, hasTarget {
                            Text(targetDate, style: .timer)
                                .font(.system(size: 14, weight: .medium, design: .rounded))
                                .foregroundColor(prayerAccent)
                                .multilineTextAlignment(.trailing)
                        } else {
                            Text("Now")
                                .font(.system(size: 14, weight: .semibold, design: .rounded))
                                .foregroundColor(prayerAccent)
                        }
                    }
                }

                DynamicIslandExpandedRegion(.center) {
                    VStack(spacing: 8) {
                        PrayerProgressBar(progress: context.state.progress, accent: prayerAccent)

                        HStack(spacing: 8) {
                            ForEach(Array(context.state.prayerStatuses.enumerated()), id: \.offset) { index, status in
                                CompactPrayerDot(
                                    status: status,
                                    accentKey: index < context.state.prayerAccentKeys.count ? context.state.prayerAccentKeys[index] : "dhuhr"
                                )
                            }
                        }
                    }
                    .padding(.top, 4)
                }

                DynamicIslandExpandedRegion(.bottom) {
                    if context.state.phase == "fiqh_window" {
                        let actionPrayer = actionPrayerName(for: context)
                        HStack(spacing: 10) {
                            Link(destination: URL(string: "sukoon://prepare?prayer=\(actionPrayer)")!) {
                                ActivityActionLabel(title: "Prepare", accent: prayerAccent, secondary: false)
                            }

                            Link(destination: URL(string: "sukoon://prayed?prayer=\(actionPrayer)")!) {
                                ActivityActionLabel(title: "Prayed", accent: prayerAccent, secondary: true)
                            }
                        }
                        .padding(.top, 4)
                    }
                }
            } compactLeading: {
                HStack(spacing: 4) {
                    Circle()
                        .fill(prayerAccent)
                        .frame(width: 6, height: 6)
                        .shadow(color: prayerAccent.opacity(0.55), radius: 2.5)

                    Text(shortPrayerLabel(context.state.prayerName))
                        .font(.system(size: 11.5, weight: .semibold, design: .rounded))
                        .foregroundColor(LAColors.text)
                        .lineLimit(1)
                }
            } compactTrailing: {
                if let targetDate, hasTarget {
                    Text(targetDate, style: .timer)
                        .font(.system(size: 12, weight: .medium, design: .rounded))
                        .foregroundColor(prayerAccent)
                } else {
                    Text("Now")
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundColor(prayerAccent)
                }
            } minimal: {
                Circle()
                    .fill(prayerAccent)
                    .frame(width: 8, height: 8)
                    .shadow(color: prayerAccent.opacity(0.8), radius: 4)
            }
        }
    }

    @ViewBuilder
    private func lockScreenView(context: ActivityViewContext<SukoonPrayerAttributes>) -> some View {
        let prayerAccent = accent(for: context)
        let targetDate = LADateHelper.parse(context.state.countdownTargetISO)
        let hasTarget = hasFutureTarget(context)
        let message = rowMessage(for: context)
        ZStack {
            LinearGradient(
                colors: [
                    LAColors.backgroundTop.opacity(0.12),
                    LAColors.backgroundBottom.opacity(0.07),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .overlay(
                RadialGradient(
                    colors: [
                        prayerAccent.opacity(0.14),
                        prayerAccent.opacity(0.04),
                        .clear,
                    ],
                    center: .topLeading,
                    startRadius: 6,
                    endRadius: 240
                )
            )
            .overlay(
                LinearGradient(
                    colors: [
                        Color.white.opacity(0.10),
                        Color.white.opacity(0.03),
                        .clear,
                    ],
                    startPoint: .top,
                    endPoint: .center
                )
            )

            VStack(spacing: 0) {
                HStack(alignment: .center, spacing: 0) {
                    HStack(alignment: .firstTextBaseline, spacing: 7) {
                        Text(context.state.prayerName)
                            .font(.system(size: 22, weight: .regular, design: .serif))
                            .foregroundColor(LAColors.text)
                            .lineLimit(1)
                            .minimumScaleFactor(0.75)

                        Text(context.state.prayerArabicName)
                            .font(.system(size: 12, weight: .medium, design: .serif))
                            .foregroundColor(prayerAccent.opacity(0.66))
                            .lineLimit(1)
                            .minimumScaleFactor(0.75)

                        if let targetDate, hasTarget {
                            Text(targetDate, style: .timer)
                                .font(.system(size: 22, weight: .light, design: .serif))
                                .foregroundColor(prayerAccent)
                                .monospacedDigit()
                                .lineLimit(1)
                                .minimumScaleFactor(0.68)
                                .padding(.leading, 8)
                        }
                    }

                    Spacer(minLength: 8)

                    VStack(alignment: .trailing, spacing: 1) {
                        Text(context.state.countdownMode == "current_prayer_end"
                            ? targetLabel(for: context.state.countdownMode)
                            : ((context.state.countdownTargetPrayerName.isEmpty ? context.state.prayerName : context.state.countdownTargetPrayerName) + " at"))
                            .font(.system(size: 8.5, weight: .medium, design: .rounded))
                            .foregroundColor(LAColors.secondary.opacity(0.32))
                            .textCase(.uppercase)

                        if let targetDate, hasTarget {
                            Text(LADateHelper.timeFmt.string(from: targetDate))
                                .font(.system(size: 14, weight: .regular, design: .serif))
                                .foregroundColor(LAColors.secondary.opacity(0.6))
                                .lineLimit(1)
                        } else {
                            Text("Now")
                                .font(.system(size: 14, weight: .medium, design: .rounded))
                                .foregroundColor(LAColors.secondary.opacity(0.6))
                        }
                    }
                }

                PrayerProgressBar(progress: context.state.progress, accent: prayerAccent)
                    .padding(.top, 8)

                HStack(alignment: .center, spacing: 10) {
                    Text(message)
                        .font(.system(size: 12, weight: .light, design: .serif))
                        .italic()
                        .foregroundColor(LAColors.secondary.opacity(0.44))
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)

                    Spacer(minLength: 0)
                }
                .padding(.top, 7)

                HStack(alignment: .bottom, spacing: 10) {
                    HStack(spacing: 8) {
                        ForEach(Array(context.state.prayerStatuses.enumerated()), id: \.offset) { index, status in
                            LockScreenPrayerDot(
                                label: index < context.attributes.prayerNames.count ? context.attributes.prayerNames[index] : "",
                                status: status,
                                accentKey: index < context.state.prayerAccentKeys.count ? context.state.prayerAccentKeys[index] : "dhuhr"
                            )
                        }
                    }

                    Spacer(minLength: 10)

                    if context.state.phase == "fiqh_window" {
                        let actionPrayer = actionPrayerName(for: context)
                        HStack(spacing: 7) {
                            Link(destination: URL(string: "sukoon://prepare?prayer=\(actionPrayer)")!) {
                                ActivityActionLabel(title: "Prepare", accent: prayerAccent, secondary: false)
                            }

                            Link(destination: URL(string: "sukoon://prayed?prayer=\(actionPrayer)")!) {
                                ActivityActionLabel(title: "Prayed", accent: prayerAccent, secondary: true)
                            }
                        }
                        .fixedSize(horizontal: true, vertical: false)
                    }
                }
                .padding(.top, 8)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
        }
    }
}
