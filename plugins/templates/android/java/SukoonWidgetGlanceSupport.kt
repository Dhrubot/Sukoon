package com.talukders.sukoon

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

data class AndroidWidgetNextPrayer(
    val name: String,
    val arabicName: String,
    val timeISO: String,
    val remainingMinutes: Int,
)

data class AndroidWidgetPrayer(
    val name: String,
    val arabicName: String,
    val timeISO: String,
    val status: String,
    val accentKey: String,
)

data class AndroidWidgetHijri(
    val day: Int,
    val monthEn: String,
    val monthAr: String,
    val year: Int,
    val shortLabel: String,
)

data class AndroidWidgetSnapshot(
    val themeMode: String,
    val nextPrayer: AndroidWidgetNextPrayer?,
    val prayers: List<AndroidWidgetPrayer>,
    val hijri: AndroidWidgetHijri,
    val supportiveLine: String,
    val lastUpdatedISO: String,
)

data class AndroidWidgetPalette(
    val background: Color,
    val surface: Color,
    val border: Color,
    val highlight: Color,
    val label: Color,
    val primaryText: Color,
    val secondaryText: Color,
    val mutedText: Color,
    val timer: Color,
    val chipBackground: Color,
    val chipText: Color,
    val ringTrack: Color,
)

object SukoonWidgetSnapshotStore {
    private const val PREFS_NAME = "sukoon_widget"
    private const val SNAPSHOT_KEY = "widgetData"

    fun load(context: Context): AndroidWidgetSnapshot {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val raw = prefs.getString(SNAPSHOT_KEY, null) ?: return sample()
        return try {
            parse(JSONObject(raw))
        } catch (_: Exception) {
            sample()
        }
    }

    private fun parse(root: JSONObject): AndroidWidgetSnapshot {
        val nextPrayerObject = root.optJSONObject("nextPrayer")
        val nextPrayer = if (nextPrayerObject != null) {
            AndroidWidgetNextPrayer(
                name = nextPrayerObject.optString("name", ""),
                arabicName = nextPrayerObject.optString("arabicName", ""),
                timeISO = nextPrayerObject.optString("timeISO", ""),
                remainingMinutes = nextPrayerObject.optInt("remainingMinutes", 0),
            )
        } else {
            null
        }

        val prayersArray = root.optJSONArray("prayers") ?: JSONArray()
        val prayers = buildList {
            for (index in 0 until prayersArray.length()) {
                val item = prayersArray.optJSONObject(index) ?: continue
                add(
                    AndroidWidgetPrayer(
                        name = item.optString("name", ""),
                        arabicName = item.optString("arabicName", ""),
                        timeISO = item.optString("timeISO", ""),
                        status = item.optString("status", "upcoming"),
                        accentKey = item.optString("accentKey", item.optString("name", "").lowercase()),
                    )
                )
            }
        }

        val hijriObject = root.optJSONObject("hijri")
        val hijri = AndroidWidgetHijri(
            day = hijriObject?.optInt("day", 0) ?: 0,
            monthEn = hijriObject?.optString("monthEn", "") ?: "",
            monthAr = hijriObject?.optString("monthAr", "") ?: "",
            year = hijriObject?.optInt("year", 0) ?: 0,
            shortLabel = hijriObject?.optString("shortLabel", "") ?: "",
        )

        return AndroidWidgetSnapshot(
            themeMode = root.optString("themeMode", "midnight"),
            nextPrayer = nextPrayer,
            prayers = prayers,
            hijri = hijri,
            supportiveLine = root.optString("supportiveLine", "Prepare for the next salah"),
            lastUpdatedISO = root.optString("lastUpdatedISO", ""),
        )
    }

    private fun sample(): AndroidWidgetSnapshot {
        return AndroidWidgetSnapshot(
            themeMode = "midnight",
            nextPrayer = AndroidWidgetNextPrayer(
                name = "Asr",
                arabicName = "العصر",
                timeISO = "2026-03-27T10:38:00Z",
                remainingMinutes = 83,
            ),
            prayers = listOf(
                AndroidWidgetPrayer("Fajr", "الفجر", "2026-03-27T00:12:00Z", "prayed", "fajr"),
                AndroidWidgetPrayer("Dhuhr", "الظهر", "2026-03-27T07:02:00Z", "prayed", "dhuhr"),
                AndroidWidgetPrayer("Asr", "العصر", "2026-03-27T10:38:00Z", "next", "asr"),
                AndroidWidgetPrayer("Maghrib", "المغرب", "2026-03-27T13:14:00Z", "upcoming", "maghrib"),
                AndroidWidgetPrayer("Isha", "العشاء", "2026-03-27T14:47:00Z", "upcoming", "isha"),
            ),
            hijri = AndroidWidgetHijri(27, "Rajab", "رجب", 1447, "27 Rajab"),
            supportiveLine = "Prepare for the next salah",
            lastUpdatedISO = "2026-03-27T09:15:00Z",
        )
    }
}

object SukoonWidgetTheme {
    fun palette(mode: String): AndroidWidgetPalette {
        return when (mode) {
            "light" -> AndroidWidgetPalette(
                background = Color(0xFF16392D),
                surface = Color(0xFF10281F),
                border = Color(0x33FFFFFF),
                highlight = Color(0x26FFFFFF),
                label = Color(0xFF79E5D4),
                primaryText = Color(0xFFF5F0E7),
                secondaryText = Color(0xCCFFFFFF),
                mutedText = Color(0x88FFFFFF),
                timer = Color(0xFF38E0D0),
                chipBackground = Color(0x1FFFFFFF),
                chipText = Color(0xFFF6EAC7),
                ringTrack = Color(0x26FFFFFF),
            )
            "dark" -> AndroidWidgetPalette(
                background = Color(0xFF232941),
                surface = Color(0xFF181D33),
                border = Color(0x29FFFFFF),
                highlight = Color(0x2BFFFFFF),
                label = Color(0xFF2DD4BF),
                primaryText = Color(0xFFF0F4FF),
                secondaryText = Color(0xCCFFFFFF),
                mutedText = Color(0x80FFFFFF),
                timer = Color(0xFF2DD4BF),
                chipBackground = Color(0x14FFFFFF),
                chipText = Color(0xFFE5D9AE),
                ringTrack = Color(0x1FFFFFFF),
            )
            else -> AndroidWidgetPalette(
                background = Color(0xFF090D18),
                surface = Color(0xFF060914),
                border = Color(0x24FFFFFF),
                highlight = Color(0x24FFFFFF),
                label = Color(0xFF2EE3D2),
                primaryText = Color(0xFFF0ECE4),
                secondaryText = Color(0xCCFFFFFF),
                mutedText = Color(0x75FFFFFF),
                timer = Color(0xFF2DD4BF),
                chipBackground = Color(0x14FFFFFF),
                chipText = Color(0xFFE8D7A1),
                ringTrack = Color(0x14FFFFFF),
            )
        }
    }

    fun prayerAccent(key: String): Color {
        return when (key) {
            "fajr" -> Color(0xFF7986CB)
            "dhuhr" -> Color(0xFF81C784)
            "asr" -> Color(0xFFDCE775)
            "maghrib" -> Color(0xFFCE93D8)
            "isha" -> Color(0xFF9FA8DA)
            else -> Color(0xFFC9A84C)
        }
    }
}

object SukoonWidgetIntents {
    fun openApp(context: Context): Intent {
        return context.packageManager.getLaunchIntentForPackage(context.packageName)
            ?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            ?: Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
    }
}

object SukoonWidgetBitmaps {
    fun cardBackground(
        widthPx: Int,
        heightPx: Int,
        palette: AndroidWidgetPalette,
        accent: Color,
    ): Bitmap {
        val bitmap = Bitmap.createBitmap(widthPx, heightPx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val rect = RectF(0f, 0f, widthPx.toFloat(), heightPx.toFloat())
        val radius = minOf(widthPx, heightPx) * 0.14f

        val basePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = LinearGradient(
                0f,
                0f,
                widthPx.toFloat(),
                heightPx.toFloat(),
                intArrayOf(palette.background.toArgb(), palette.surface.toArgb()),
                floatArrayOf(0f, 1f),
                Shader.TileMode.CLAMP,
            )
        }
        canvas.drawRoundRect(rect, radius, radius, basePaint)

        val accentPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = RadialGradient(
                widthPx * 0.22f,
                heightPx * 0.18f,
                widthPx * 0.55f,
                intArrayOf(
                    accent.copy(alpha = 0.22f).toArgb(),
                    accent.copy(alpha = 0.08f).toArgb(),
                    Color.Transparent.toArgb(),
                ),
                floatArrayOf(0f, 0.38f, 1f),
                Shader.TileMode.CLAMP,
            )
        }
        canvas.drawRoundRect(rect, radius, radius, accentPaint)

        val highlightPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = LinearGradient(
                0f,
                0f,
                0f,
                heightPx * 0.4f,
                intArrayOf(
                    palette.highlight.toArgb(),
                    Color.Transparent.toArgb(),
                ),
                floatArrayOf(0f, 1f),
                Shader.TileMode.CLAMP,
            )
        }
        canvas.drawRoundRect(rect, radius, radius, highlightPaint)

        val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = (widthPx.coerceAtMost(heightPx) * 0.008f).coerceAtLeast(1.5f)
            color = palette.border.toArgb()
        }
        val inset = borderPaint.strokeWidth / 2f
        canvas.drawRoundRect(
            RectF(inset, inset, widthPx - inset, heightPx - inset),
            radius,
            radius,
            borderPaint,
        )

        return bitmap
    }

    fun countdownRing(
        progress: Float,
        accent: Color,
        track: Color,
        sizePx: Int = 220,
        strokeRatio: Float = 0.08f,
        minProgress: Float = 0.08f,
    ): Bitmap {
        val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val strokeWidth = sizePx * strokeRatio
        val inset = strokeWidth * 1.2f
        val rect = RectF(inset, inset, sizePx - inset, sizePx - inset)

        val trackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeCap = Paint.Cap.ROUND
            this.strokeWidth = strokeWidth
            color = track.toArgb()
        }

        val accentPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeCap = Paint.Cap.ROUND
            this.strokeWidth = strokeWidth
            color = accent.toArgb()
        }

        canvas.drawArc(rect, 0f, 360f, false, trackPaint)
        canvas.drawArc(rect, -90f, (progress.coerceIn(minProgress, 1f) * 360f), false, accentPaint)
        return bitmap
    }
}

data class SmallWidgetLayoutSpec(
    val contentPadding: Dp,
    val topSafeInset: Dp,
    val ringTopSpacing: Dp,
    val ringSize: Dp,
    val ringBitmapSizePx: Int,
    val labelFontSize: Int,
    val prayerFontSize: Int,
    val remainingFontSize: Int,
    val timeFontSize: Int,
    val timeTopSpacing: Dp,
    val cardWidthPx: Int,
    val cardHeightPx: Int,
)

data class MediumWidgetLayoutSpec(
    val contentPadding: Dp,
    val topSafeInset: Dp,
    val headerFontSize: Int,
    val chipFontSize: Int,
    val chipHorizontalPadding: Dp,
    val chipVerticalPadding: Dp,
    val chipCornerRadius: Dp,
    val headerSpacerMin: Dp,
    val headerRightBias: Dp,
    val heroTopSpacing: Dp,
    val leftColumnWidth: Dp,
    val prayerFontSize: Int,
    val timeFontSize: Int,
    val arabicFontSize: Int,
    val timeTopSpacing: Dp,
    val arabicTopSpacing: Dp,
    val heroGap: Dp,
    val heroExtraRightBias: Dp,
    val ringSize: Dp,
    val ringBitmapSizePx: Int,
    val ringStrokeRatio: Float,
    val remainingFontSize: Int,
    val ringLabelFontSize: Int,
    val dividerTopSpacing: Dp,
    val dividerBottomSpacing: Dp,
    val footerDotSize: Dp,
    val footerActiveDotSize: Dp,
    val footerDotInnerPadding: Dp,
    val footerItemGap: Dp,
    val footerLabelFontSize: Int,
    val footerItemWidth: Dp,
    val cardWidthPx: Int,
    val cardHeightPx: Int,
)

val smallWidgetSizes = setOf(
    DpSize(110.dp, 110.dp),
    DpSize(110.dp, 180.dp),
    DpSize(180.dp, 180.dp),
)

val mediumWidgetSizes = setOf(
    DpSize(250.dp, 110.dp),
    DpSize(250.dp, 180.dp),
    DpSize(320.dp, 180.dp),
    DpSize(320.dp, 220.dp),
)

fun smallWidgetLayout(size: DpSize): SmallWidgetLayoutSpec {
    val isTall = size.height >= 170.dp
    val isWide = size.width >= 170.dp

    return if (isTall || isWide) {
        SmallWidgetLayoutSpec(
            contentPadding = 16.dp,
            topSafeInset = 14.dp,
            ringTopSpacing = 14.dp,
            ringSize = 124.dp,
            ringBitmapSizePx = 252,
            labelFontSize = 11,
            prayerFontSize = 20,
            remainingFontSize = 11,
            timeFontSize = 16,
            timeTopSpacing = 12.dp,
            cardWidthPx = 520,
            cardHeightPx = 620,
        )
    } else {
        SmallWidgetLayoutSpec(
            contentPadding = 14.dp,
            topSafeInset = 12.dp,
            ringTopSpacing = 12.dp,
            ringSize = 112.dp,
            ringBitmapSizePx = 228,
            labelFontSize = 10,
            prayerFontSize = 18,
            remainingFontSize = 10,
            timeFontSize = 15,
            timeTopSpacing = 10.dp,
            cardWidthPx = 420,
            cardHeightPx = 420,
        )
    }
}

fun mediumWidgetLayout(size: DpSize): MediumWidgetLayoutSpec {
    val isTall = size.height >= 170.dp
    val isWide = size.width >= 300.dp

    return if (isTall || isWide) {
        MediumWidgetLayoutSpec(
            contentPadding = 18.dp,
            topSafeInset = 16.dp,
            headerFontSize = 11,
            chipFontSize = 10,
            chipHorizontalPadding = 12.dp,
            chipVerticalPadding = 6.dp,
            chipCornerRadius = 16.dp,
            headerSpacerMin = 14.dp,
            headerRightBias = 10.dp,
            heroTopSpacing = 12.dp,
            leftColumnWidth = 134.dp,
            prayerFontSize = 34,
            timeFontSize = 15,
            arabicFontSize = 11,
            timeTopSpacing = 6.dp,
            arabicTopSpacing = 7.dp,
            heroGap = 10.dp,
            heroExtraRightBias = 10.dp,
            ringSize = 72.dp,
            ringBitmapSizePx = 188,
            ringStrokeRatio = 0.066f,
            remainingFontSize = 15,
            ringLabelFontSize = 9,
            dividerTopSpacing = 10.dp,
            dividerBottomSpacing = 10.dp,
            footerDotSize = 8.dp,
            footerActiveDotSize = 11.dp,
            footerDotInnerPadding = 2.dp,
            footerItemGap = 9.dp,
            footerLabelFontSize = 9,
            footerItemWidth = 46.dp,
            cardWidthPx = 820,
            cardHeightPx = 440,
        )
    } else {
        MediumWidgetLayoutSpec(
            contentPadding = 16.dp,
            topSafeInset = 15.dp,
            headerFontSize = 10,
            chipFontSize = 9,
            chipHorizontalPadding = 10.dp,
            chipVerticalPadding = 5.dp,
            chipCornerRadius = 15.dp,
            headerSpacerMin = 12.dp,
            headerRightBias = 8.dp,
            heroTopSpacing = 11.dp,
            leftColumnWidth = 126.dp,
            prayerFontSize = 30,
            timeFontSize = 14,
            arabicFontSize = 10,
            timeTopSpacing = 6.dp,
            arabicTopSpacing = 6.dp,
            heroGap = 8.dp,
            heroExtraRightBias = 8.dp,
            ringSize = 66.dp,
            ringBitmapSizePx = 172,
            ringStrokeRatio = 0.066f,
            remainingFontSize = 14,
            ringLabelFontSize = 8,
            dividerTopSpacing = 9.dp,
            dividerBottomSpacing = 8.dp,
            footerDotSize = 7.dp,
            footerActiveDotSize = 10.dp,
            footerDotInnerPadding = 2.dp,
            footerItemGap = 7.dp,
            footerLabelFontSize = 8,
            footerItemWidth = 40.dp,
            cardWidthPx = 680,
            cardHeightPx = 340,
        )
    }
}

fun mediumHeroGap(size: DpSize, layout: MediumWidgetLayoutSpec): Dp {
    val computed = size.width - layout.contentPadding - layout.contentPadding - layout.leftColumnWidth - layout.ringSize - layout.heroExtraRightBias
    return if (computed > layout.heroGap) computed else layout.heroGap
}

fun mediumHeaderGap(size: DpSize, layout: MediumWidgetLayoutSpec, chipText: String): Dp {
    val estimatedChipWidth = layout.chipHorizontalPadding + layout.chipHorizontalPadding + (chipText.length * (layout.chipFontSize * 0.50f)).dp
    val computed = size.width - layout.contentPadding - layout.contentPadding - estimatedChipWidth - 72.dp - layout.headerRightBias
    return if (computed > layout.headerSpacerMin) computed else layout.headerSpacerMin
}

fun mediumFooterItemWidth(size: DpSize, layout: MediumWidgetLayoutSpec): Dp {
    val available = (
        size.width.value -
            (layout.contentPadding.value * 2f) -
            (layout.footerItemGap.value * 4f)
    ).coerceAtLeast(140f)
    return (available / 5f).dp
}

fun widgetCountdownProgress(nextPrayer: AndroidWidgetNextPrayer?): Float {
    if (nextPrayer == null) return 0.12f
    return (nextPrayer.remainingMinutes.coerceIn(0, 180) / 180f).coerceAtLeast(0.06f)
}

fun formatWidgetRemaining(remainingMinutes: Int?): String {
    if (remainingMinutes == null) return "—"
    if (remainingMinutes <= 0) return "Now"
    val hours = remainingMinutes / 60
    val minutes = remainingMinutes % 60
    return if (hours > 0) "${hours}h ${minutes}m" else "${minutes}m"
}

fun formatWidgetCountdownLiteral(remainingMinutes: Int?): String {
    if (remainingMinutes == null) return "—"
    return "${remainingMinutes.coerceAtLeast(0)}m"
}

fun shortPrayerLabel(prayer: AndroidWidgetPrayer): String {
    return when (prayer.name.lowercase()) {
        "maghrib" -> "Magh."
        else -> prayer.name
    }
}

fun formatWidgetTime(iso: String?): String {
    if (iso.isNullOrEmpty()) return "--:--"
    val date = parseWidgetIso(iso) ?: return "--:--"
    return SimpleDateFormat("h:mm a", Locale.getDefault()).format(date)
}

fun hijriChipText(snapshot: AndroidWidgetSnapshot): String {
    return when {
        snapshot.hijri.day > 0 && snapshot.hijri.monthEn.isNotBlank() && snapshot.hijri.year > 0 ->
            "${snapshot.hijri.day} ${snapshot.hijri.monthEn} ${snapshot.hijri.year}"
        snapshot.hijri.shortLabel.isNotBlank() -> snapshot.hijri.shortLabel
        else -> "Today"
    }
}

private fun parseWidgetIso(iso: String): Date? {
    val patterns = arrayOf(
        "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
        "yyyy-MM-dd'T'HH:mm:ss'Z'",
    )

    patterns.forEach { pattern ->
        try {
            val formatter = SimpleDateFormat(pattern, Locale.US)
            formatter.timeZone = TimeZone.getTimeZone("UTC")
            return formatter.parse(iso)
        } catch (_: Exception) {
        }
    }

    return null
}
