package com.talukders.sukoon

import android.content.Context
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceModifier
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider

class SukoonSmallWidget : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = HijriDateWidget()
}

private class HijriDateWidget : GlanceAppWidget() {
    override val sizeMode = SizeMode.Single

    override suspend fun provideGlance(context: Context, id: androidx.glance.GlanceId) {
        val snapshot = SukoonWidgetSnapshotStore.load(context)
        val palette = SukoonWidgetTheme.palette(snapshot.themeMode)

        provideContent {
            Column(
                modifier = GlanceModifier
                    .fillMaxSize()
                    .background(ColorProvider(palette.background))
                    .cornerRadius(22.dp)
                    .clickable(actionStartActivity(SukoonWidgetIntents.openApp(context)))
                    .padding(14.dp),
                horizontalAlignment = Alignment.Start,
                verticalAlignment = Alignment.Vertical.Top,
            ) {
                Text(
                    text = "Hijri Date",
                    style = TextStyle(
                        color = ColorProvider(palette.label),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Medium,
                    )
                )

                Spacer(modifier = GlanceModifier.height(12.dp))

                Text(
                    text = snapshot.hijri.day.takeIf { it > 0 }?.toString() ?: "—",
                    style = TextStyle(
                        color = ColorProvider(palette.primaryText),
                        fontSize = 38.sp,
                        fontWeight = FontWeight.Bold,
                    )
                )

                Spacer(modifier = GlanceModifier.height(4.dp))

                Text(
                    text = snapshot.hijri.monthAr.ifBlank { "—" },
                    style = TextStyle(
                        color = ColorProvider(palette.chipText),
                        fontSize = 16.sp,
                    )
                )

                Spacer(modifier = GlanceModifier.height(4.dp))

                Text(
                    text = snapshot.hijri.shortLabel.ifBlank { "Today" },
                    style = TextStyle(
                        color = ColorProvider(palette.secondaryText),
                        fontSize = 11.sp,
                    ),
                    maxLines = 1
                )

                Spacer(modifier = GlanceModifier.height(10.dp))

                Text(
                    text = "Quietly keep today close",
                    style = TextStyle(
                        color = ColorProvider(palette.mutedText),
                        fontSize = 10.sp,
                        textAlign = TextAlign.Start,
                    ),
                    modifier = GlanceModifier.fillMaxWidth(),
                    maxLines = 2
                )
            }
        }
    }
}
