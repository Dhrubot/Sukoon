package com.talukders.sukoon

import android.content.Context
import androidx.compose.ui.graphics.Color
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
import androidx.glance.background
import androidx.glance.appwidget.cornerRadius
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
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider

class SukoonMediumWidget : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = PrayerDashboardWidget()
}

private class PrayerDashboardWidget : GlanceAppWidget() {
    override val sizeMode = SizeMode.Responsive(mediumWidgetSizes)

    override suspend fun provideGlance(context: Context, id: androidx.glance.GlanceId) {
        val snapshot = SukoonWidgetSnapshotStore.load(context)
        val palette = SukoonWidgetTheme.palette(snapshot.themeMode)
        val accent = SukoonWidgetTheme.prayerAccent(snapshot.nextPrayer?.name?.lowercase() ?: "asr")
        val chromeAccent = palette.timer
        val progress = widgetCountdownProgress(snapshot.nextPrayer)

        provideContent {
            val size = LocalSize.current
            val layout = mediumWidgetLayout(size)
            val hijriText = hijriChipText(snapshot)
            val footerItemWidth = mediumFooterItemWidth(size, layout)
            val ringBitmap = SukoonWidgetBitmaps.countdownRing(
                progress = progress,
                accent = chromeAccent,
                track = palette.ringTrack,
                sizePx = layout.ringBitmapSizePx,
                strokeRatio = layout.ringStrokeRatio,
                minProgress = 0.04f,
            )
            val cardBitmap = SukoonWidgetBitmaps.cardBackground(
                widthPx = layout.cardWidthPx,
                heightPx = layout.cardHeightPx,
                palette = palette,
                accent = chromeAccent,
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
                ) {
                    Row(
                        modifier = GlanceModifier.fillMaxWidth(),
                        verticalAlignment = Alignment.Vertical.CenterVertically,
                    ) {
                        Text(
                            text = "Next Prayer",
                            style = TextStyle(
                                color = ColorProvider(palette.label),
                                fontSize = layout.headerFontSize.sp,
                                fontWeight = FontWeight.Medium,
                            ),
                            maxLines = 1,
                        )

                        Box(
                            modifier = GlanceModifier.fillMaxWidth(),
                            contentAlignment = Alignment.CenterEnd,
                        ) {
                            Text(
                                text = hijriText,
                                style = TextStyle(
                                    color = ColorProvider(palette.primaryText.copy(alpha = 0.66f)),
                                    fontSize = layout.chipFontSize.sp,
                                    fontWeight = FontWeight.Medium,
                                ),
                                modifier = GlanceModifier
                                    .background(ColorProvider(palette.chipBackground))
                                    .cornerRadius(layout.chipCornerRadius)
                                    .padding(
                                        layout.chipHorizontalPadding,
                                        layout.chipVerticalPadding,
                                        layout.chipHorizontalPadding,
                                        layout.chipVerticalPadding,
                                    ),
                                maxLines = 1,
                            )
                        }
                    }

                    Spacer(modifier = GlanceModifier.height(layout.heroTopSpacing))

                    Row(
                        modifier = GlanceModifier.fillMaxWidth(),
                        verticalAlignment = Alignment.Vertical.CenterVertically,
                    ) {
                        Column(
                            modifier = GlanceModifier.width(layout.leftColumnWidth),
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

                            Spacer(modifier = GlanceModifier.height(layout.timeTopSpacing))

                            Text(
                                text = formatWidgetTime(snapshot.nextPrayer?.timeISO),
                                style = TextStyle(
                                    color = ColorProvider(palette.secondaryText.copy(alpha = 0.9f)),
                                    fontSize = layout.timeFontSize.sp,
                                    fontWeight = FontWeight.Medium,
                                ),
                                maxLines = 1,
                            )

                            Spacer(modifier = GlanceModifier.height(layout.arabicTopSpacing))

                            Text(
                                text = snapshot.nextPrayer?.arabicName ?: "—",
                                style = TextStyle(
                                    color = ColorProvider(palette.mutedText.copy(alpha = 0.9f)),
                                    fontSize = layout.arabicFontSize.sp,
                                ),
                                maxLines = 1,
                            )
                        }

                        Box(
                            modifier = GlanceModifier.fillMaxWidth(),
                            contentAlignment = Alignment.CenterEnd,
                        ) {
                            Box(
                                modifier = GlanceModifier
                                    .size(layout.ringSize),
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
                                        text = formatWidgetCountdownLiteral(snapshot.nextPrayer?.remainingMinutes),
                                        style = TextStyle(
                                            color = ColorProvider(palette.primaryText),
                                            fontSize = layout.remainingFontSize.sp,
                                            fontWeight = FontWeight.Bold,
                                        ),
                                        maxLines = 1,
                                    )

                                    Spacer(modifier = GlanceModifier.height(1.dp))

                                    Text(
                                        text = "remaining",
                                        style = TextStyle(
                                            color = ColorProvider(palette.secondaryText.copy(alpha = 0.8f)),
                                            fontSize = layout.ringLabelFontSize.sp,
                                        ),
                                        maxLines = 1,
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = GlanceModifier.height(layout.dividerTopSpacing))

                    Box(
                        modifier = GlanceModifier
                            .fillMaxWidth()
                            .height(1.dp)
                            .background(ColorProvider(palette.border)),
                    ) {}

                    Spacer(modifier = GlanceModifier.height(layout.dividerBottomSpacing))

                    Row(
                        modifier = GlanceModifier.fillMaxWidth(),
                        verticalAlignment = Alignment.Top,
                    ) {
                        snapshot.prayers.take(5).forEachIndexed { index, prayer ->
                            PrayerRhythmItem(
                                prayer = prayer,
                                palette = palette,
                                baseSize = layout.footerDotSize,
                                activeSize = layout.footerActiveDotSize,
                                innerPadding = layout.footerDotInnerPadding,
                                labelFontSize = layout.footerLabelFontSize,
                                itemWidth = footerItemWidth,
                            )
                            if (index < 4) {
                                Spacer(modifier = GlanceModifier.width(layout.footerItemGap))
                            }
                        }
                    }
                }
            }
        }
    }
}

@androidx.compose.runtime.Composable
private fun PrayerRhythmItem(
    prayer: AndroidWidgetPrayer,
    palette: AndroidWidgetPalette,
    baseSize: androidx.compose.ui.unit.Dp,
    activeSize: androidx.compose.ui.unit.Dp,
    innerPadding: androidx.compose.ui.unit.Dp,
    labelFontSize: Int,
    itemWidth: androidx.compose.ui.unit.Dp,
) {
    val accent = SukoonWidgetTheme.prayerAccent(prayer.accentKey)
    val isActive = prayer.status == "current" || prayer.status == "next"
    val isMissed = prayer.status == "missed"
    val dotSize = if (isActive) activeSize else baseSize
    val haloColor = when {
        isActive -> accent.copy(alpha = 0.18f)
        isMissed -> accent.copy(alpha = 0.3f)
        else -> Color.Transparent
    }
    val fillColor = when (prayer.status) {
        "prayed" -> accent.copy(alpha = 0.48f)
        "current", "next" -> accent
        "upcoming" -> accent.copy(alpha = 0.38f)
        "missed" -> palette.surface.copy(alpha = 0.92f)
        else -> palette.mutedText.copy(alpha = 0.3f)
    }
    val labelColor = if (isActive) accent else palette.mutedText
    val dotInnerPadding = if (isMissed) innerPadding + 1.dp else innerPadding

    Column(
        modifier = GlanceModifier.width(itemWidth),
        horizontalAlignment = Alignment.Horizontal.CenterHorizontally,
        verticalAlignment = Alignment.Top,
    ) {
        Box(
            modifier = GlanceModifier
                .size(dotSize)
                .background(ColorProvider(haloColor))
                .cornerRadius(99.dp)
                .padding(dotInnerPadding),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                modifier = GlanceModifier
                    .fillMaxSize()
                    .background(ColorProvider(fillColor))
                    .cornerRadius(99.dp),
            ) {}
        }

        Spacer(modifier = GlanceModifier.height(6.dp))

        Text(
            text = shortPrayerLabel(prayer),
            style = TextStyle(
                color = ColorProvider(labelColor.copy(alpha = if (isActive) 1f else 0.72f)),
                fontSize = labelFontSize.sp,
                fontWeight = if (isActive) FontWeight.Medium else FontWeight.Normal,
            ),
            maxLines = 1,
        )
    }
}
