import WidgetKit
import SwiftUI

// MARK: - Snapshot Model

struct WidgetNextPrayer: Codable {
    let name: String
    let arabicName: String
    let timeISO: String
    let remainingMinutes: Int
}

struct WidgetPrayer: Codable, Identifiable {
    let name: String
    let arabicName: String
    let timeISO: String
    let status: String
    let accentKey: String

    var id: String { name }
}

struct WidgetHijri: Codable {
    let day: Int
    let monthEn: String
    let monthAr: String
    let year: Int
    let shortLabel: String
}

struct WidgetSnapshot: Codable {
    let version: Int
    let themeMode: String
    let nextPrayer: WidgetNextPrayer?
    let prayers: [WidgetPrayer]
    let hijri: WidgetHijri
    let supportiveLine: String
    let lastUpdatedISO: String
}

struct SukoonEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot
}

// MARK: - Theme

struct WidgetPalette {
    let backgroundTop: Color
    let backgroundBottom: Color
    let border: Color
    let label: Color
    let primaryText: Color
    let secondaryText: Color
    let mutedText: Color
    let timer: Color
    let chipBackground: Color
    let chipText: Color
    let ringTrack: Color

    static func resolve(_ mode: String) -> WidgetPalette {
        switch mode {
        case "light":
            return WidgetPalette(
                backgroundTop: Color(red: 0.11, green: 0.23, blue: 0.18),
                backgroundBottom: Color(red: 0.07, green: 0.16, blue: 0.13),
                border: Color.white.opacity(0.22),
                label: Color(red: 0.47, green: 0.90, blue: 0.83),
                primaryText: Color(red: 0.97, green: 0.95, blue: 0.91),
                secondaryText: Color.white.opacity(0.74),
                mutedText: Color.white.opacity(0.48),
                timer: Color(red: 0.91, green: 0.80, blue: 0.47),
                chipBackground: Color.white.opacity(0.12),
                chipText: Color(red: 0.98, green: 0.94, blue: 0.84),
                ringTrack: Color.white.opacity(0.12)
            )
        case "dark":
            return WidgetPalette(
                backgroundTop: Color(red: 0.15, green: 0.17, blue: 0.28),
                backgroundBottom: Color(red: 0.09, green: 0.11, blue: 0.20),
                border: Color.white.opacity(0.16),
                label: Color(red: 0.29, green: 0.62, blue: 0.46),
                primaryText: Color(red: 0.94, green: 0.96, blue: 1.0),
                secondaryText: Color.white.opacity(0.72),
                mutedText: Color.white.opacity(0.46),
                timer: Color(red: 0.29, green: 0.83, blue: 0.75),
                chipBackground: Color.white.opacity(0.08),
                chipText: Color(red: 0.92, green: 0.87, blue: 0.67),
                ringTrack: Color.white.opacity(0.10)
            )
        default:
            return WidgetPalette(
                backgroundTop: Color(red: 0.04, green: 0.05, blue: 0.11),
                backgroundBottom: Color(red: 0.02, green: 0.03, blue: 0.08),
                border: Color.white.opacity(0.14),
                label: Color(red: 0.79, green: 0.66, blue: 0.30),
                primaryText: Color(red: 0.95, green: 0.93, blue: 0.89),
                secondaryText: Color.white.opacity(0.72),
                mutedText: Color.white.opacity(0.42),
                timer: Color(red: 0.91, green: 0.79, blue: 0.48),
                chipBackground: Color.white.opacity(0.08),
                chipText: Color(red: 0.91, green: 0.84, blue: 0.63),
                ringTrack: Color.white.opacity(0.08)
            )
        }
    }
}

enum PrayerAccent {
    static func color(for key: String) -> Color {
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
            return Color(red: 0.79, green: 0.66, blue: 0.30)
        }
    }
}

// MARK: - Provider

struct SukoonProvider: TimelineProvider {
    private let appGroup = "group.com.talukders.sukoon"

    func placeholder(in context: Context) -> SukoonEntry {
        SukoonEntry(date: Date(), snapshot: Self.sampleSnapshot)
    }

    func getSnapshot(in context: Context, completion: @escaping (SukoonEntry) -> Void) {
        completion(SukoonEntry(date: Date(), snapshot: loadSnapshot() ?? Self.sampleSnapshot))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SukoonEntry>) -> Void) {
        let entry = SukoonEntry(date: Date(), snapshot: loadSnapshot() ?? Self.sampleSnapshot)
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date().addingTimeInterval(900)
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }

    private func loadSnapshot() -> WidgetSnapshot? {
        guard let defaults = UserDefaults(suiteName: appGroup),
              let json = defaults.string(forKey: "widgetData"),
              let raw = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(WidgetSnapshot.self, from: raw)
    }

    static let sampleSnapshot = WidgetSnapshot(
        version: 2,
        themeMode: "midnight",
        nextPrayer: WidgetNextPrayer(
            name: "Asr",
            arabicName: "العصر",
            timeISO: "2026-03-27T10:38:00Z",
            remainingMinutes: 83
        ),
        prayers: [
            WidgetPrayer(name: "Fajr", arabicName: "الفجر", timeISO: "2026-03-27T00:12:00Z", status: "prayed", accentKey: "fajr"),
            WidgetPrayer(name: "Dhuhr", arabicName: "الظهر", timeISO: "2026-03-27T07:02:00Z", status: "prayed", accentKey: "dhuhr"),
            WidgetPrayer(name: "Asr", arabicName: "العصر", timeISO: "2026-03-27T10:38:00Z", status: "next", accentKey: "asr"),
            WidgetPrayer(name: "Maghrib", arabicName: "المغرب", timeISO: "2026-03-27T13:14:00Z", status: "upcoming", accentKey: "maghrib"),
            WidgetPrayer(name: "Isha", arabicName: "العشاء", timeISO: "2026-03-27T14:47:00Z", status: "upcoming", accentKey: "isha")
        ],
        hijri: WidgetHijri(day: 27, monthEn: "Rajab", monthAr: "رجب", year: 1447, shortLabel: "27 Rajab"),
        supportiveLine: "Prepare for the next salah",
        lastUpdatedISO: "2026-03-27T09:15:00Z"
    )
}

// MARK: - Date Helpers

enum WidgetDateHelper {
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

    static let timeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter
    }()

    static func parse(_ isoString: String) -> Date? {
        if isoString.isEmpty { return nil }
        return isoFrac.date(from: isoString) ?? iso.date(from: isoString)
    }

    static func formatTime(_ isoString: String) -> String {
        guard let date = parse(isoString) else { return "--:--" }
        return timeFormatter.string(from: date)
    }
}

enum WidgetCountdownCopy {
    static func compact(_ remainingMinutes: Int?) -> String {
        guard let remainingMinutes else { return "Now" }
        let minutes = max(remainingMinutes, 0)
        if minutes <= 0 { return "Now" }
        if minutes < 60 { return "\(minutes)m" }

        let hours = minutes / 60
        let remainder = minutes % 60
        if remainder == 0 { return "\(hours)h" }
        return "\(hours)h \(remainder)m"
    }

    static func circular(_ remainingMinutes: Int?) -> String {
        guard let remainingMinutes else { return "Now" }
        let minutes = max(remainingMinutes, 0)
        if minutes <= 0 { return "Now" }
        if minutes < 60 { return "\(minutes)m" }
        return "\(minutes / 60)h"
    }

    static func prefixed(_ remainingMinutes: Int?) -> String {
        let compactValue = compact(remainingMinutes)
        return compactValue == "Now" ? compactValue : "in \(compactValue)"
    }
}

// MARK: - Shared Views

struct WidgetCardBackground: View {
    let palette: WidgetPalette

    var body: some View {
        LinearGradient(
            colors: [palette.backgroundTop, palette.backgroundBottom],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .overlay(
            RoundedRectangle(cornerRadius: 24)
                .stroke(palette.border, lineWidth: 1)
        )
    }
}

struct PrayerStatusDot: View {
    let prayer: WidgetPrayer

    private var accent: Color { PrayerAccent.color(for: prayer.accentKey) }

    var body: some View {
        ZStack {
            if prayer.status == "missed" {
                Circle()
                    .stroke(accent.opacity(0.34), lineWidth: 1.3)
                    .frame(width: 9, height: 9)
            } else {
                Circle()
                    .fill(fillColor)
                    .frame(width: 9, height: 9)
                    .overlay(
                        Circle()
                            .stroke(accent.opacity(prayer.status == "current" || prayer.status == "next" ? 0.9 : 0), lineWidth: 1.2)
                    )
                    .shadow(color: accent.opacity(prayer.status == "current" || prayer.status == "next" ? 0.36 : 0), radius: 4)
            }
        }
    }

    private var fillColor: Color {
        switch prayer.status {
        case "prayed":
            return accent.opacity(0.96)
        case "current", "next":
            return accent.opacity(0.95)
        case "upcoming":
            return accent.opacity(0.24)
        default:
            return accent.opacity(0.18)
        }
    }
}

struct CountdownLabel: View {
    let targetISO: String
    let color: Color
    let font: Font

    private var targetDate: Date? { WidgetDateHelper.parse(targetISO) }

    var body: some View {
        if let targetDate, targetDate > Date() {
            Text(targetDate, style: .timer)
                .font(font)
                .foregroundColor(color)
                .monospacedDigit()
        } else {
            Text("Now")
                .font(font)
                .foregroundColor(color)
        }
    }
}

struct CountdownRing: View {
    let palette: WidgetPalette
    let accent: Color
    let progress: Double
    let title: String
    let subtitle: String

    var body: some View {
        ZStack {
            Circle()
                .stroke(palette.ringTrack, lineWidth: 3.5)

            Circle()
                .trim(from: 0, to: min(max(progress, 0.06), 1.0))
                .stroke(accent.opacity(0.18), style: StrokeStyle(lineWidth: 8, lineCap: .round))
                .rotationEffect(.degrees(-90))

            Circle()
                .trim(from: 0, to: min(max(progress, 0.06), 1.0))
                .stroke(
                    AngularGradient(colors: [accent.opacity(0.65), accent, accent.opacity(0.82)], center: .center),
                    style: StrokeStyle(lineWidth: 3.5, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))

            VStack(spacing: 2) {
                Text(title)
                    .font(.system(size: 15, weight: .semibold, design: .serif))
                    .foregroundColor(palette.primaryText)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)

                Text(subtitle)
                    .font(.system(size: 10.5, weight: .medium))
                    .foregroundColor(palette.secondaryText)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
        }
    }
}

// MARK: - Small

struct SmallWidgetView: View {
    let snapshot: WidgetSnapshot

    private var palette: WidgetPalette { WidgetPalette.resolve(snapshot.themeMode) }
    private var accent: Color { PrayerAccent.color(for: snapshot.nextPrayer?.name.lowercased() ?? "asr") }
    private var timeLabel: String { WidgetDateHelper.formatTime(snapshot.nextPrayer?.timeISO ?? "") }

    private var ringProgress: Double {
        guard let nextPrayer = snapshot.nextPrayer else { return 0.18 }
        let minutes = max(nextPrayer.remainingMinutes, 0)
        return min(max(Double(180 - min(minutes, 180)) / 180.0, 0.16), 1.0)
    }

    private var countdownText: String {
        guard let nextPrayer = snapshot.nextPrayer else { return "Now" }
        let minutes = max(nextPrayer.remainingMinutes, 0)
        if minutes <= 0 { return "Now" }
        let hours = minutes / 60
        let remaining = minutes % 60
        if hours > 0 {
            return remaining == 0 ? "\(hours)h" : "\(hours)h \(remaining)m"
        }
        return "\(minutes)m"
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Next Prayer")
                    .font(.system(size: 10, weight: .semibold))
                    .textCase(.uppercase)
                    .foregroundColor(palette.label)
                Spacer(minLength: 0)
            }

            Spacer(minLength: 8)

            ZStack {
                CountdownRing(
                    palette: palette,
                    accent: accent,
                    progress: ringProgress,
                    title: snapshot.nextPrayer?.name ?? "—",
                    subtitle: countdownText
                )
                .frame(width: 88, height: 88)
            }
            .frame(maxWidth: .infinity)

            Spacer(minLength: 8)

            Text(timeLabel)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(palette.secondaryText)
                .frame(maxWidth: .infinity)
        }
        .padding(13)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Medium

struct PrayerScheduleRow: View {
    let prayer: WidgetPrayer
    let palette: WidgetPalette
    let isNext: Bool

    private var accent: Color { PrayerAccent.color(for: prayer.accentKey) }
    private var rowOpacity: Double {
        switch prayer.status {
        case "upcoming":
            return 0.48
        case "missed":
            return 0.62
        default:
            return 1.0
        }
    }

    var body: some View {
        HStack(spacing: 7) {
            PrayerStatusDot(prayer: prayer)

            Text(prayer.name)
                .font(.system(size: 12, weight: isNext ? .semibold : .medium))
                .foregroundColor(isNext ? accent : palette.primaryText)
                .lineLimit(1)

            if isNext {
                Text("NEXT")
                    .font(.system(size: 8, weight: .semibold))
                    .foregroundColor(palette.chipText)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(accent.opacity(0.18))
                    .clipShape(Capsule())
            }

            Spacer(minLength: 6)

            Text(WidgetDateHelper.formatTime(prayer.timeISO))
                .font(.system(size: 10.5, weight: isNext ? .semibold : .medium))
                .foregroundColor(isNext ? accent.opacity(0.92) : palette.secondaryText)
                .lineLimit(1)
        }
        .padding(.vertical, 4)
        .opacity(rowOpacity)
    }
}

struct PrayerRowDivider: View {
    let palette: WidgetPalette

    var body: some View {
        Rectangle()
            .fill(palette.border.opacity(0.45))
            .frame(height: 1)
            .frame(maxWidth: .infinity)
    }
}

struct MediumWidgetView: View {
    let snapshot: WidgetSnapshot

    private var palette: WidgetPalette { WidgetPalette.resolve(snapshot.themeMode) }
    private var nextPrayerName: String { snapshot.nextPrayer?.name ?? "" }
    private var hijriChipLabel: String {
        guard snapshot.hijri.day > 0, !snapshot.hijri.monthEn.isEmpty, snapshot.hijri.year > 0 else {
            return snapshot.hijri.shortLabel
        }
        return "\(snapshot.hijri.day) \(snapshot.hijri.monthEn) \(snapshot.hijri.year)"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Today’s Prayers")
                    .font(.system(size: 10, weight: .semibold))
                    .textCase(.uppercase)
                    .foregroundColor(palette.label)

                Spacer(minLength: 8)

                Text(hijriChipLabel)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(palette.chipText)
                    .lineLimit(1)
                    .minimumScaleFactor(0.84)
                    .padding(.horizontal, 9)
                    .padding(.vertical, 4)
                    .background(palette.chipBackground)
                    .clipShape(Capsule())
            }
            .padding(.bottom, 4)

            VStack(spacing: 0) {
                ForEach(Array(snapshot.prayers.enumerated()), id: \.element.id) { index, prayer in
                    if index > 0 {
                        PrayerRowDivider(palette: palette)
                    }

                    PrayerScheduleRow(
                        prayer: prayer,
                        palette: palette,
                        isNext: prayer.name == nextPrayerName
                    )
                }
            }
        }
        .padding(.horizontal, 13)
        .padding(.vertical, 11)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

// MARK: - Lock Screen Accessories

struct AccessoryInlineView: View {
    let snapshot: WidgetSnapshot

    private var accent: Color { PrayerAccent.color(for: snapshot.nextPrayer?.name.lowercased() ?? "asr") }
    private var prayerLabel: String { snapshot.nextPrayer?.name ?? "—" }
    private var timeLabel: String { WidgetDateHelper.formatTime(snapshot.nextPrayer?.timeISO ?? "") }
    private var countdownLabel: String { WidgetCountdownCopy.compact(snapshot.nextPrayer?.remainingMinutes) }

    var body: some View {
        HStack(spacing: 5) {
            Circle()
                .fill(accent)
                .frame(width: 6, height: 6)
            Text("\(prayerLabel) · \(timeLabel)")
                .font(.system(size: 10.5, weight: .medium))
                .lineLimit(1)
            Text("·")
                .foregroundColor(.secondary.opacity(0.7))
            Text(countdownLabel)
                .font(.system(size: 9.5, weight: .medium))
                .foregroundColor(.secondary)
                .lineLimit(1)
        }
    }
}

struct AccessoryCircularView: View {
    let snapshot: WidgetSnapshot

    private var accent: Color { PrayerAccent.color(for: snapshot.nextPrayer?.name.lowercased() ?? "asr") }
    private var progress: Double {
        guard let nextPrayer = snapshot.nextPrayer else { return 0.12 }
        let minutes = max(nextPrayer.remainingMinutes, 0)
        return min(max(Double(180 - min(minutes, 180)) / 180.0, 0.12), 1.0)
    }
    private var countdownLabel: String { WidgetCountdownCopy.circular(snapshot.nextPrayer?.remainingMinutes) }

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.primary.opacity(0.16), lineWidth: 2.5)
            Circle()
                .trim(from: 0, to: progress)
                .stroke(accent.opacity(0.16), style: StrokeStyle(lineWidth: 6, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Circle()
                .trim(from: 0, to: progress)
                .stroke(accent, style: StrokeStyle(lineWidth: 2.8, lineCap: .round))
                .rotationEffect(.degrees(-90))

            Text(countdownLabel)
                .font(.system(size: 9.5, weight: .semibold))
                .foregroundColor(.primary)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
    }
}

struct AccessoryRectangularView: View {
    let snapshot: WidgetSnapshot

    private var accent: Color { PrayerAccent.color(for: snapshot.nextPrayer?.name.lowercased() ?? "asr") }
    private var prayerLabel: String { snapshot.nextPrayer?.name ?? "—" }
    private var headline: String { "\(prayerLabel) · \(WidgetCountdownCopy.prefixed(snapshot.nextPrayer?.remainingMinutes))" }

    private var nextTwoPrayers: [WidgetPrayer] {
        guard let nextPrayer = snapshot.nextPrayer,
              let idx = snapshot.prayers.firstIndex(where: { $0.name == nextPrayer.name }) else {
            return Array(snapshot.prayers.prefix(2))
        }

        let start = min(idx + 1, snapshot.prayers.count)
        let end = min(start + 2, snapshot.prayers.count)
        return Array(snapshot.prayers[start..<end])
    }

    private var nextTwoSummary: String {
        let value = nextTwoPrayers.map { "\($0.name) \(WidgetDateHelper.formatTime($0.timeISO))" }.joined(separator: " · ")
        if !value.isEmpty { return value }
        return WidgetDateHelper.formatTime(snapshot.nextPrayer?.timeISO ?? "")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 7) {
                Circle()
                    .fill(accent)
                    .frame(width: 7, height: 7)

                Text(headline)
                    .font(.system(size: 11, weight: .semibold))
                    .lineLimit(1)
                    .foregroundColor(.primary)

                Spacer(minLength: 4)

                Text("NEXT")
                    .font(.system(size: 8.5, weight: .medium))
                    .tracking(0.4)
                    .foregroundColor(.secondary)
            }

            Text(nextTwoSummary)
                .font(.system(size: 9.5, weight: .medium))
                .foregroundColor(.secondary)
                .lineLimit(1)
        }
    }
}

// MARK: - Widget Entry View

struct HomeWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SukoonEntry

    var body: some View {
        switch family {
        case .systemMedium:
            MediumWidgetView(snapshot: entry.snapshot)
        default:
            SmallWidgetView(snapshot: entry.snapshot)
        }
    }
}

struct LockWidgetEntryView: View {
    @Environment(\.widgetFamily) private var family
    let entry: SukoonEntry

    var body: some View {
        switch family {
        case .accessoryInline:
            AccessoryInlineView(snapshot: entry.snapshot)
        case .accessoryCircular:
            AccessoryCircularView(snapshot: entry.snapshot)
        default:
            AccessoryRectangularView(snapshot: entry.snapshot)
        }
    }
}

// MARK: - Widget

struct SukoonWidget: Widget {
    let kind = "SukoonWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SukoonProvider()) { entry in
            if #available(iOS 17.0, *) {
                HomeWidgetEntryView(entry: entry)
                    .containerBackground(for: .widget) {
                        WidgetCardBackground(palette: WidgetPalette.resolve(entry.snapshot.themeMode))
                    }
            } else {
                HomeWidgetEntryView(entry: entry)
                    .background(WidgetCardBackground(palette: WidgetPalette.resolve(entry.snapshot.themeMode)))
            }
        }
        .configurationDisplayName("Prayer Rhythm")
        .description("Quietly keep the next prayer and today’s times close at hand.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct SukoonAccessoryWidget: Widget {
    let kind = "SukoonAccessoryWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: SukoonProvider()) { entry in
            if #available(iOS 17.0, *) {
                LockWidgetEntryView(entry: entry)
                    .containerBackground(for: .widget) {
                        Color.clear
                    }
            } else {
                LockWidgetEntryView(entry: entry)
            }
        }
        .configurationDisplayName("Prayer Rhythm Lock")
        .description("See the next prayer quietly from your Lock Screen.")
        .supportedFamilies([.accessoryInline, .accessoryCircular, .accessoryRectangular])
    }
}
