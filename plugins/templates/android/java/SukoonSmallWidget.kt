package com.talukders.sukoon

import android.content.Context
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalSize
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider

class SukoonSmallWidget : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = NextPrayerCompactWidget()
}

private class NextPrayerCompactWidget : GlanceAppWidget() {
    override val sizeMode = SizeMode.Responsive(smallWidgetSizes)

    override suspend fun provideGlance(context: Context, id: androidx.glance.GlanceId) {
        val snapshot = SukoonWidgetSnapshotStore.load(context)
        val palette = SukoonWidgetTheme.palette(snapshot.themeMode)
        val accent = SukoonWidgetTheme.prayerAccent(snapshot.nextPrayer?.name?.lowercase() ?: "asr")
        val progress = widgetCountdownProgress(snapshot.nextPrayer)

        provideContent {
            val size = LocalSize.current
            val layout = smallWidgetLayout(size)
            val ringBitmap = SukoonWidgetBitmaps.countdownRing(
                progress = progress,
                accent = accent,
                track = palette.ringTrack,
                sizePx = layout.ringBitmapSizePx,
            )
            val cardBitmap = SukoonWidgetBitmaps.cardBackground(
                widthPx = layout.cardWidthPx,
                heightPx = layout.cardHeightPx,
                palette = palette,
                accent = accent,
            )

            Box(
                modifier = GlanceModifier
                    .fillMaxSize()
                    .clickable(actionStartActivity(SukoonWidgetIntents.openApp(context))),
                contentAlignment = Alignment.TopStart,
            ) {
                Image(
                    provider = ImageProvider(cardBitmap),
                    contentDescription = null,
                    modifier = GlanceModifier.fillMaxSize(),
                )

                Column(
                    modifier = GlanceModifier
                        .fillMaxSize()
                        .padding(
                            start = layout.contentPadding,
                            top = layout.topSafeInset,
                            end = layout.contentPadding,
                            bottom = layout.contentPadding,
                        ),
                    horizontalAlignment = Alignment.Horizontal.CenterHorizontally,
                    verticalAlignment = Alignment.Vertical.Top,
                ) {
                    Text(
                        text = "Next Prayer",
                        style = TextStyle(
                            color = ColorProvider(accent),
                            fontSize = layout.labelFontSize.sp,
                            fontWeight = FontWeight.Medium,
                        ),
                        modifier = GlanceModifier.fillMaxWidth(),
                        maxLines = 1,
                    )

                    Spacer(modifier = GlanceModifier.height(layout.ringTopSpacing))

                    Box(
                        modifier = GlanceModifier
                            .fillMaxWidth()
                            .padding(top = 2.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Box(
                            modifier = GlanceModifier.size(layout.ringSize),
                            contentAlignment = Alignment.Center,
                        ) {
                            Image(
                                provider = ImageProvider(ringBitmap),
                                contentDescription = null,
                                modifier = GlanceModifier.size(layout.ringSize),
                            )

                            Column(
                                horizontalAlignment = Alignment.Horizontal.CenterHorizontally,
                                verticalAlignment = Alignment.Vertical.CenterVertically,
                            ) {
                                Text(
                                    text = snapshot.nextPrayer?.name ?: "—",
                                    style = TextStyle(
                                        color = ColorProvider(palette.primaryText),
                                        fontSize = layout.prayerFontSize.sp,
                                        fontWeight = FontWeight.Bold,
                                    ),
                                    maxLines = 1,
                                )

                                Spacer(modifier = GlanceModifier.height(1.dp))

                                Text(
                                    text = formatWidgetRemaining(snapshot.nextPrayer?.remainingMinutes),
                                    style = TextStyle(
                                        color = ColorProvider(palette.secondaryText),
                                        fontSize = layout.remainingFontSize.sp,
                                        fontWeight = FontWeight.Medium,
                                    ),
                                    maxLines = 1,
                                )
                            }
                        }
                    }

                    Spacer(modifier = GlanceModifier.height(layout.timeTopSpacing))

                    Text(
                        text = formatWidgetTime(snapshot.nextPrayer?.timeISO),
                        style = TextStyle(
                            color = ColorProvider(palette.primaryText),
                            fontSize = layout.timeFontSize.sp,
                            fontWeight = FontWeight.Medium,
                        ),
                        maxLines = 1,
                    )
                }
            }
        }
    }
}
