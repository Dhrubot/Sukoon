package com.talukders.sukoon

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import org.json.JSONArray
import org.json.JSONObject

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
                label = Color(0xFF79E5D4),
                primaryText = Color(0xFFF5F0E7),
                secondaryText = Color(0xCCFFFFFF),
                mutedText = Color(0x88FFFFFF),
                timer = Color(0xFFE8C97A),
                chipBackground = Color(0x1FFFFFFF),
                chipText = Color(0xFFF6EAC7),
                ringTrack = Color(0x26FFFFFF),
            )
            "dark" -> AndroidWidgetPalette(
                background = Color(0xFF232941),
                surface = Color(0xFF181D33),
                border = Color(0x29FFFFFF),
                label = Color(0xFF4A9E76),
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
                label = Color(0xFFC9A84C),
                primaryText = Color(0xFFF0ECE4),
                secondaryText = Color(0xCCFFFFFF),
                mutedText = Color(0x75FFFFFF),
                timer = Color(0xFFE8C97A),
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
    fun countdownRing(progress: Float, accent: Color, track: Color, sizePx: Int = 220): Bitmap {
        val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val strokeWidth = sizePx * 0.08f
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
        canvas.drawArc(rect, -90f, (progress.coerceIn(0.08f, 1f) * 360f), false, accentPaint)
        return bitmap
    }
}
