package com.talukders.sukoon

import android.content.Context
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceModifier
import androidx.glance.ImageProvider
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.Text
import androidx.glance.text.FontWeight
import androidx.glance.text.TextStyle
import androidx.glance.Image
import androidx.glance.unit.ColorProvider

class SukoonMediumWidget : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = PrayerDashboardWidget()
}

private class PrayerDashboardWidget : GlanceAppWidget() {
    override val sizeMode = SizeMode.Single

    override suspend fun provideGlance(context: Context, id: androidx.glance.GlanceId) {
        val snapshot = SukoonWidgetSnapshotStore.load(context)
        val palette = SukoonWidgetTheme.palette(snapshot.themeMode)
        val accent = SukoonWidgetTheme.prayerAccent(snapshot.nextPrayer?.name?.lowercase() ?: "asr")
        val progress = if (snapshot.nextPrayer == null) {
            0.12f
        } else {
            ((180 - snapshot.nextPrayer.remainingMinutes.coerceAtMost(180)).coerceAtLeast(18) / 180f)
        }
        val ringBitmap = SukoonWidgetBitmaps.countdownRing(progress, accent, palette.ringTrack)

        provideContent {
            Column(
                modifier = GlanceModifier
                    .fillMaxSize()
                    .background(ColorProvider(palette.background))
                    .cornerRadius(24.dp)
                    .clickable(actionStartActivity(SukoonWidgetIntents.openApp(context)))
                    .padding(16.dp),
            ) {
                Row(
                    modifier = GlanceModifier.fillMaxWidth(),
                    verticalAlignment = Alignment.Vertical.CenterVertically,
                ) {
                    Text(
                        text = "Sukoon",
                        style = TextStyle(
                            color = ColorProvider(palette.label),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Medium,
                        )
                    )

                    Spacer(modifier = GlanceModifier.width(12.dp))

                    Text(
                        text = snapshot.hijri.shortLabel.ifBlank { "Today" },
                        style = TextStyle(
                            color = ColorProvider(palette.chipText),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Medium,
                        ),
                        modifier = GlanceModifier
                            .background(ColorProvider(palette.chipBackground))
                            .cornerRadius(14.dp)
                            .padding(8.dp, 4.dp, 8.dp, 4.dp),
                        maxLines = 1
                    )
                }

                Spacer(modifier = GlanceModifier.height(12.dp))

                Row(
                    modifier = GlanceModifier.fillMaxWidth(),
                    verticalAlignment = Alignment.Vertical.CenterVertically,
                ) {
                    Column {
                        Text(
                            text = snapshot.nextPrayer?.name ?: "—",
                            style = TextStyle(
                                color = ColorProvider(palette.primaryText),
                                fontSize = 28.sp,
                                fontWeight = FontWeight.Bold,
                            ),
                            maxLines = 1
                        )

                        Spacer(modifier = GlanceModifier.height(3.dp))

                        Text(
                            text = snapshot.nextPrayer?.arabicName ?: "—",
                            style = TextStyle(
                                color = ColorProvider(palette.secondaryText),
                                fontSize = 13.sp,
                            ),
                            maxLines = 1
                        )

                        Spacer(modifier = GlanceModifier.height(8.dp))

                        Text(
                            text = snapshot.supportiveLine,
                            style = TextStyle(
                                color = ColorProvider(palette.secondaryText),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                            ),
                            maxLines = 2
                        )
                    }

                    Spacer(modifier = GlanceModifier.width(12.dp))

                    Box(
                        modifier = GlanceModifier.size(92.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Image(
                            provider = ImageProvider(ringBitmap),
                            contentDescription = null,
                            modifier = GlanceModifier.size(92.dp)
                        )

                        Column(
                            horizontalAlignment = Alignment.Horizontal.CenterHorizontally,
                            verticalAlignment = Alignment.Vertical.CenterVertically,
                        ) {
                            Text(
                                text = formatRemaining(snapshot.nextPrayer?.remainingMinutes),
                                style = TextStyle(
                                    color = ColorProvider(palette.primaryText),
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                )
                            )
                            Spacer(modifier = GlanceModifier.height(2.dp))
                            Text(
                                text = formatTime(snapshot.nextPrayer?.timeISO),
                                style = TextStyle(
                                    color = ColorProvider(palette.secondaryText),
                                    fontSize = 10.sp,
                                )
                            )
                        }
                    }
                }

                Spacer(modifier = GlanceModifier.height(12.dp))

                Row(
                    modifier = GlanceModifier.fillMaxWidth(),
                    verticalAlignment = Alignment.Vertical.CenterVertically,
                ) {
                    snapshot.prayers.forEachIndexed { index, prayer ->
                        PrayerStateColumn(prayer = prayer, palette = palette)
                        if (index < snapshot.prayers.lastIndex) {
                            Spacer(modifier = GlanceModifier.width(10.dp))
                        }
                    }
                }
            }
        }
    }
}

@androidx.compose.runtime.Composable
private fun PrayerStateColumn(prayer: AndroidWidgetPrayer, palette: AndroidWidgetPalette) {
    val accent = SukoonWidgetTheme.prayerAccent(prayer.accentKey)
    val dotColor = when (prayer.status) {
        "prayed" -> accent
        "current", "next" -> accent
        "upcoming" -> accent.copy(alpha = 0.26f)
        "missed" -> accent.copy(alpha = 0.18f)
        else -> palette.mutedText
    }
    val labelColor = if (prayer.status == "current" || prayer.status == "next") accent else palette.secondaryText

    Column(horizontalAlignment = Alignment.Horizontal.CenterHorizontally) {
        Box(
            modifier = GlanceModifier
                .size(9.dp)
                .background(ColorProvider(dotColor))
                .cornerRadius(99.dp)
        ) {}

        Spacer(modifier = GlanceModifier.height(4.dp))

        Text(
            text = prayer.name,
            style = TextStyle(
                color = ColorProvider(labelColor),
                fontSize = 10.sp,
                fontWeight = if (prayer.status == "current" || prayer.status == "next") FontWeight.Bold else FontWeight.Medium,
            ),
            maxLines = 1
        )
    }
}

private fun formatRemaining(remainingMinutes: Int?): String {
    if (remainingMinutes == null) return "—"
    if (remainingMinutes <= 0) return "Now"
    val hours = remainingMinutes / 60
    val minutes = remainingMinutes % 60
    return if (hours > 0) "${hours}h ${minutes}m" else "${minutes}m"
}

private fun formatTime(iso: String?): String {
    if (iso.isNullOrEmpty()) return "--:--"
    val date = parseIso(iso) ?: return "--:--"
    return SimpleDateFormat("h:mm a", Locale.getDefault()).format(date)
}

private fun parseIso(iso: String): Date? {
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
