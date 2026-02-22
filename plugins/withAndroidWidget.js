// plugins/withAndroidWidget.js
// Expo config plugin to add Android home screen widgets for prayer times

const {
  withAndroidManifest,
  withMainApplication,
  withDangerousMod,
} = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const PKG = 'com.talukders.sukoon';
const JAVA_PATH_SEGMENTS = ['android', 'app', 'src', 'main', 'java', 'com', 'talukders', 'sukoon'];
const RES_PATH_SEGMENTS  = ['android', 'app', 'src', 'main', 'res'];

// ─────────────────────────────────────────────
// JAVA: Native bridge (SharedPreferences + update trigger)
// ─────────────────────────────────────────────

const BRIDGE_JAVA = `package ${PKG};

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import com.facebook.react.bridge.*;

public class SukoonWidgetBridge extends ReactContextBaseJavaModule {

    public SukoonWidgetBridge(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "SukoonWidgetBridge";
    }

    @ReactMethod
    public void setWidgetData(String jsonString, Promise promise) {
        try {
            SharedPreferences prefs = getReactApplicationContext()
                .getSharedPreferences("sukoon_widget", Context.MODE_PRIVATE);
            prefs.edit().putString("widgetData", jsonString).apply();
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to write widget data: " + e.getMessage());
        }
    }

    @ReactMethod
    public void reloadWidgets(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            AppWidgetManager mgr = AppWidgetManager.getInstance(context);

            int[] smallIds = mgr.getAppWidgetIds(
                new ComponentName(context, SukoonSmallWidget.class));
            if (smallIds.length > 0) {
                Intent i = new Intent(context, SukoonSmallWidget.class);
                i.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
                i.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, smallIds);
                context.sendBroadcast(i);
            }

            int[] medIds = mgr.getAppWidgetIds(
                new ComponentName(context, SukoonMediumWidget.class));
            if (medIds.length > 0) {
                Intent i = new Intent(context, SukoonMediumWidget.class);
                i.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
                i.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, medIds);
                context.sendBroadcast(i);
            }

            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to reload widgets: " + e.getMessage());
        }
    }
}
`;

const BRIDGE_PACKAGE_JAVA = `package ${PKG};

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class SukoonWidgetPackage implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext ctx) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new SukoonWidgetBridge(ctx));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext ctx) {
        return Collections.emptyList();
    }
}
`;

// ─────────────────────────────────────────────
// JAVA: Shared helper for both widget sizes
// ─────────────────────────────────────────────

const WIDGET_HELPER_JAVA = `package ${PKG};

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class SukoonWidgetHelper {

    private static final String[] VERSES = {
        "Indeed, prayer prohibits immorality and wrongdoing|29:45",
        "And seek help through patience and prayer|2:45",
        "Indeed, Allah is with the patient|2:153",
        "So remember Me; I will remember you|2:152",
        "In the remembrance of Allah do hearts find rest|13:28",
        "And He is with you wherever you are|57:4",
        "Allah does not burden a soul beyond that it can bear|2:286",
        "Whoever puts their trust in Allah, He will be enough for them|65:3",
        "And whoever fears Allah, He will make for them a way out|65:2",
        "My mercy encompasses all things|7:156",
        "Call upon Me; I will respond to you|40:60",
        "Do not lose hope in the mercy of Allah|39:53",
    };

    public static JSONObject loadData(Context context) {
        SharedPreferences prefs = context.getSharedPreferences("sukoon_widget", Context.MODE_PRIVATE);
        String json = prefs.getString("widgetData", null);
        if (json == null) return null;
        try {
            return new JSONObject(json);
        } catch (Exception e) {
            return null;
        }
    }

    // Sky-inspired prayer identity colors (from prayerColors.dark)
    public static int getPrayerColor(String name) {
        switch (name) {
            case "Fajr":    return 0xFF7986CB;  // soft indigo — pre-dawn
            case "Dhuhr":   return 0xFF81C784;  // soft green — midday
            case "Asr":     return 0xFFDCE775;  // olive-gold — afternoon
            case "Maghrib": return 0xFFCE93D8;  // soft plum — sunset
            case "Isha":    return 0xFF9FA8DA;  // soft lavender — night
            default:        return 0xFF2D8B6F;  // sage green500
        }
    }

    // 4-state dot drawable selector
    public static int getDotDrawable(String status) {
        switch (status) {
            case "prayed":  return R.drawable.widget_dot_active;
            case "current": return R.drawable.widget_dot_current;
            case "missed":  return R.drawable.widget_dot_missed;
            default:        return R.drawable.widget_dot_inactive;
        }
    }

    // 4-state text color for prayer names in medium widget
    public static int getDotTextColor(String status) {
        switch (status) {
            case "prayed":  return 0xFF2D8B6F;  // sage
            case "current": return 0xFFD4AF37;  // gold
            case "missed":  return 0x66EF4444;  // soft red 40%
            default:        return 0xFF64748B;  // slate500
        }
    }

    public static String formatTime(String iso) {
        Date date = parseISO(iso);
        if (date == null) return "--:--";
        SimpleDateFormat fmt = new SimpleDateFormat("h:mm a", Locale.getDefault());
        return fmt.format(date);
    }

    public static String getCountdown(String iso) {
        Date date = parseISO(iso);
        if (date == null) return "";
        long diff = date.getTime() - System.currentTimeMillis();
        if (diff <= 0) return "Now";
        long mins = diff / (1000 * 60);
        if (mins < 60) return "in " + mins + " min";
        return "in " + (mins / 60) + "h " + (mins % 60) + "m";
    }

    public static String[] getDailyVerse() {
        int day = Calendar.getInstance().get(Calendar.DAY_OF_YEAR);
        String entry = VERSES[day % VERSES.length];
        return entry.split("\\\\|");
    }

    private static Date parseISO(String iso) {
        if (iso == null || iso.isEmpty()) return null;
        String[] patterns = {
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
        };
        for (String p : patterns) {
            try {
                SimpleDateFormat f = new SimpleDateFormat(p, Locale.US);
                f.setTimeZone(TimeZone.getTimeZone("UTC"));
                Date d = f.parse(iso);
                if (d != null) return d;
            } catch (Exception ignored) {}
        }
        return null;
    }
}
`;

// ─────────────────────────────────────────────
// JAVA: Small widget provider (2×2)
// ─────────────────────────────────────────────

const SMALL_WIDGET_JAVA = `package ${PKG};

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

public class SukoonSmallWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) update(ctx, mgr, id);
    }

    static void update(Context ctx, AppWidgetManager mgr, int id) {
        try {
            RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_small);
            JSONObject data = SukoonWidgetHelper.loadData(ctx);

            if (data != null) {
                try {
                    String name = data.optString("nextPrayerName", "");
                    String time = data.optString("nextPrayerTime", "");
                    JSONArray prayers = data.optJSONArray("prayerTimes");

                    v.setTextViewText(R.id.prayer_name, name);
                    v.setTextColor(R.id.prayer_name, 0xFFFFFFFF);
                    v.setTextViewText(R.id.prayer_time, SukoonWidgetHelper.formatTime(time));
                    v.setTextViewText(R.id.countdown, SukoonWidgetHelper.getCountdown(time));

                    int[] dots = {R.id.dot1, R.id.dot2, R.id.dot3, R.id.dot4, R.id.dot5};
                    if (prayers != null) {
                        for (int i = 0; i < Math.min(prayers.length(), 5); i++) {
                            String status = prayers.getJSONObject(i).optString("status", "upcoming");
                            v.setImageViewResource(dots[i], SukoonWidgetHelper.getDotDrawable(status));
                        }
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

            // Tap → open app
            Intent launch = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
            if (launch != null) {
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
                v.setOnClickPendingIntent(R.id.widget_root,
                    PendingIntent.getActivity(ctx, 0, launch, flags));
            }

            mgr.updateAppWidget(id, v);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
`;

// ─────────────────────────────────────────────
// JAVA: Medium widget provider (4×2)
// ─────────────────────────────────────────────

const MEDIUM_WIDGET_JAVA = `package ${PKG};

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

public class SukoonMediumWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) update(ctx, mgr, id);
    }

    static void update(Context ctx, AppWidgetManager mgr, int id) {
        try {
            RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_medium);
            JSONObject data = SukoonWidgetHelper.loadData(ctx);

            if (data != null) {
                try {
                    String name = data.optString("nextPrayerName", "");
                    String time = data.optString("nextPrayerTime", "");
                    JSONArray prayers = data.optJSONArray("prayerTimes");

                    v.setTextViewText(R.id.prayer_name, name);
                    v.setTextColor(R.id.prayer_name, 0xFFFFFFFF);
                    v.setTextViewText(R.id.prayer_time, SukoonWidgetHelper.formatTime(time));
                    v.setTextViewText(R.id.countdown, SukoonWidgetHelper.getCountdown(time));

                    // Dots (4-state)
                    int[] dots = {R.id.dot1, R.id.dot2, R.id.dot3, R.id.dot4, R.id.dot5};
                    if (prayers != null) {
                        for (int i = 0; i < Math.min(prayers.length(), 5); i++) {
                            String status = prayers.getJSONObject(i).optString("status", "upcoming");
                            v.setImageViewResource(dots[i], SukoonWidgetHelper.getDotDrawable(status));
                        }
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }

            // Daily verse (from RN data, with fallback) + hijri date
            try {
                String verse = data != null ? data.optString("dailyVerse", "") : "";
                String verseRef = data != null ? data.optString("dailyVerseRef", "") : "";
                String hijri = data != null ? data.optString("hijriDate", "") : "";
                if (!verse.isEmpty()) {
                    v.setTextViewText(R.id.verse_text, "\u201C" + verse + "\u201D");
                    String refLine = "\u2014 " + verseRef;
                    if (!hijri.isEmpty()) refLine += " \u00B7 " + hijri;
                    v.setTextViewText(R.id.verse_ref, refLine);
                } else {
                    String[] fallback = SukoonWidgetHelper.getDailyVerse();
                    if (fallback != null && fallback.length >= 2) {
                        v.setTextViewText(R.id.verse_text, "\u201C" + fallback[0] + "\u201D");
                        String refLine = "\u2014 " + fallback[1];
                        if (!hijri.isEmpty()) refLine += " \u00B7 " + hijri;
                        v.setTextViewText(R.id.verse_ref, refLine);
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
            }

            // Tap → open app
            Intent launch = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
            if (launch != null) {
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
                v.setOnClickPendingIntent(R.id.widget_root,
                    PendingIntent.getActivity(ctx, 0, launch, flags));
            }

            mgr.updateAppWidget(id, v);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
`;

// ─────────────────────────────────────────────
// XML: Drawables
// ─────────────────────────────────────────────

const DRAWABLE_BG = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#CC1A1A2E"/>
    <corners android:radius="24dp"/>
</shape>
`;

// Prayed — filled sage green
const DRAWABLE_DOT_ACTIVE = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval">
    <solid android:color="#2D8B6F"/>
    <size android:width="8dp" android:height="8dp"/>
</shape>
`;

// Current/Next — filled gold
const DRAWABLE_DOT_CURRENT = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval">
    <solid android:color="#D4AF37"/>
    <size android:width="8dp" android:height="8dp"/>
</shape>
`;

// Missed — hollow red ring
const DRAWABLE_DOT_MISSED = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval">
    <solid android:color="#00000000"/>
    <stroke android:width="1.5dp" android:color="#66EF4444"/>
    <size android:width="8dp" android:height="8dp"/>
</shape>
`;

// Upcoming — hollow slate ring
const DRAWABLE_DOT_INACTIVE = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="oval">
    <solid android:color="#00000000"/>
    <stroke android:width="1dp" android:color="#64748B"/>
    <size android:width="8dp" android:height="8dp"/>
</shape>
`;

// ─────────────────────────────────────────────
// XML: Small widget layout
// ─────────────────────────────────────────────

const LAYOUT_SMALL = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_bg"
    android:gravity="center_horizontal"
    android:orientation="vertical"
    android:padding="16dp">

    <FrameLayout android:layout_width="0dp" android:layout_height="0dp" android:layout_weight="1"/>

    <TextView android:id="@+id/prayer_name"
        android:layout_width="wrap_content" android:layout_height="wrap_content"
        android:text="Fajr" android:textColor="#FFFFFF"
        android:textSize="26sp" android:textStyle="bold"/>

    <TextView android:id="@+id/prayer_time"
        android:layout_width="wrap_content" android:layout_height="wrap_content"
        android:text="5:15 AM" android:textColor="#B0BEC5"
        android:textSize="15sp" android:layout_marginTop="2dp"/>

    <TextView android:id="@+id/countdown"
        android:layout_width="wrap_content" android:layout_height="wrap_content"
        android:text="" android:textColor="#2D8B6F"
        android:textSize="13sp" android:layout_marginTop="4dp"/>

    <FrameLayout android:layout_width="0dp" android:layout_height="0dp" android:layout_weight="1"/>

    <!-- Progress dots at bottom -->
    <LinearLayout
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:gravity="center">

        <ImageView android:id="@+id/dot1" android:layout_width="8dp" android:layout_height="8dp"
            android:src="@drawable/widget_dot_inactive" android:layout_marginEnd="6dp"/>
        <ImageView android:id="@+id/dot2" android:layout_width="8dp" android:layout_height="8dp"
            android:src="@drawable/widget_dot_inactive" android:layout_marginEnd="6dp"/>
        <ImageView android:id="@+id/dot3" android:layout_width="8dp" android:layout_height="8dp"
            android:src="@drawable/widget_dot_inactive" android:layout_marginEnd="6dp"/>
        <ImageView android:id="@+id/dot4" android:layout_width="8dp" android:layout_height="8dp"
            android:src="@drawable/widget_dot_inactive" android:layout_marginEnd="6dp"/>
        <ImageView android:id="@+id/dot5" android:layout_width="8dp" android:layout_height="8dp"
            android:src="@drawable/widget_dot_inactive"/>
    </LinearLayout>
</LinearLayout>
`;

// ─────────────────────────────────────────────
// XML: Medium widget layout
// ─────────────────────────────────────────────

const LAYOUT_MEDIUM = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_bg"
    android:orientation="vertical"
    android:padding="16dp">

    <!-- Top: prayer info + inline dots -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:gravity="center_vertical"
        android:orientation="horizontal">

        <!-- Left: prayer info -->
        <LinearLayout
            android:layout_width="0dp" android:layout_height="wrap_content"
            android:layout_weight="1" android:orientation="vertical">

            <TextView android:id="@+id/prayer_name"
                android:layout_width="wrap_content" android:layout_height="wrap_content"
                android:text="Asr" android:textColor="#FFFFFF"
                android:textSize="26sp" android:textStyle="bold"/>

            <LinearLayout
                android:layout_width="wrap_content" android:layout_height="wrap_content"
                android:gravity="center_vertical" android:layout_marginTop="2dp">

                <TextView android:id="@+id/prayer_time"
                    android:layout_width="wrap_content" android:layout_height="wrap_content"
                    android:text="3:45 PM" android:textColor="#FFFFFF" android:textSize="14sp"/>

                <TextView android:id="@+id/countdown"
                    android:layout_width="wrap_content" android:layout_height="wrap_content"
                    android:text="" android:textColor="#2D8B6F"
                    android:textSize="13sp" android:layout_marginStart="6dp"/>
            </LinearLayout>
        </LinearLayout>

        <!-- Right: inline progress dots -->
        <LinearLayout
            android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:gravity="center_vertical">

            <ImageView android:id="@+id/dot1" android:layout_width="9dp" android:layout_height="9dp"
                android:src="@drawable/widget_dot_inactive" android:layout_marginEnd="5dp"/>
            <ImageView android:id="@+id/dot2" android:layout_width="9dp" android:layout_height="9dp"
                android:src="@drawable/widget_dot_inactive" android:layout_marginEnd="5dp"/>
            <ImageView android:id="@+id/dot3" android:layout_width="9dp" android:layout_height="9dp"
                android:src="@drawable/widget_dot_inactive" android:layout_marginEnd="5dp"/>
            <ImageView android:id="@+id/dot4" android:layout_width="9dp" android:layout_height="9dp"
                android:src="@drawable/widget_dot_inactive" android:layout_marginEnd="5dp"/>
            <ImageView android:id="@+id/dot5" android:layout_width="9dp" android:layout_height="9dp"
                android:src="@drawable/widget_dot_inactive"/>
        </LinearLayout>
    </LinearLayout>

    <!-- Divider -->
    <FrameLayout android:layout_width="match_parent" android:layout_height="1px"
        android:background="#20FFFFFF" android:layout_marginTop="6dp" android:layout_marginBottom="6dp"/>

    <!-- Verse -->
    <TextView android:id="@+id/verse_text"
        android:layout_width="match_parent" android:layout_height="wrap_content"
        android:textColor="#B0BEC5" android:textSize="12sp"
        android:gravity="center" android:maxLines="2" android:ellipsize="end"/>

    <TextView android:id="@+id/verse_ref"
        android:layout_width="match_parent" android:layout_height="wrap_content"
        android:textColor="#78909C" android:textSize="10sp"
        android:gravity="center" android:layout_marginTop="3dp"/>
</LinearLayout>
`;

// ─────────────────────────────────────────────
// XML: Widget info metadata
// ─────────────────────────────────────────────

const INFO_SMALL = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="110dp"
    android:minHeight="110dp"
    android:targetCellWidth="2"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_small"
    android:previewLayout="@layout/widget_small"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:description="@string/widget_small_desc" />
`;

const INFO_MEDIUM = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp"
    android:minHeight="110dp"
    android:targetCellWidth="4"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_medium"
    android:previewLayout="@layout/widget_medium"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:description="@string/widget_medium_desc" />
`;

// ─────────────────────────────────────────────
// XML: String resources for widget descriptions
// ─────────────────────────────────────────────

const STRINGS_XML = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="widget_small_desc">Next prayer time and daily progress</string>
    <string name="widget_medium_desc">Prayer times, progress, and Quranic verse</string>
</resources>
`;

// ─────────────────────────────────────────────
// Plugin: Write all files
// ─────────────────────────────────────────────

const withAndroidWidgetFiles = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const root = config.modRequest.projectRoot;
      const javaDir = path.join(root, ...JAVA_PATH_SEGMENTS);
      const resDir  = path.join(root, ...RES_PATH_SEGMENTS);

      const dirs = [
        javaDir,
        path.join(resDir, 'layout'),
        path.join(resDir, 'drawable'),
        path.join(resDir, 'xml'),
        path.join(resDir, 'values'),
      ];
      dirs.forEach((d) => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

      // Java
      const javaFiles = [
        ['SukoonWidgetBridge.java',  BRIDGE_JAVA],
        ['SukoonWidgetPackage.java', BRIDGE_PACKAGE_JAVA],
        ['SukoonWidgetHelper.java',  WIDGET_HELPER_JAVA],
        ['SukoonSmallWidget.java',   SMALL_WIDGET_JAVA],
        ['SukoonMediumWidget.java',  MEDIUM_WIDGET_JAVA],
      ];
      javaFiles.forEach(([name, content]) => {
        fs.writeFileSync(path.join(javaDir, name), content, 'utf-8');
        console.log('✅ Created', name);
      });

      // Drawables
      fs.writeFileSync(path.join(resDir, 'drawable', 'widget_bg.xml'), DRAWABLE_BG, 'utf-8');
      fs.writeFileSync(path.join(resDir, 'drawable', 'widget_dot_active.xml'), DRAWABLE_DOT_ACTIVE, 'utf-8');
      fs.writeFileSync(path.join(resDir, 'drawable', 'widget_dot_current.xml'), DRAWABLE_DOT_CURRENT, 'utf-8');
      fs.writeFileSync(path.join(resDir, 'drawable', 'widget_dot_missed.xml'), DRAWABLE_DOT_MISSED, 'utf-8');
      fs.writeFileSync(path.join(resDir, 'drawable', 'widget_dot_inactive.xml'), DRAWABLE_DOT_INACTIVE, 'utf-8');

      // Layouts
      fs.writeFileSync(path.join(resDir, 'layout', 'widget_small.xml'), LAYOUT_SMALL, 'utf-8');
      fs.writeFileSync(path.join(resDir, 'layout', 'widget_medium.xml'), LAYOUT_MEDIUM, 'utf-8');

      // Widget info
      fs.writeFileSync(path.join(resDir, 'xml', 'widget_small_info.xml'), INFO_SMALL, 'utf-8');
      fs.writeFileSync(path.join(resDir, 'xml', 'widget_medium_info.xml'), INFO_MEDIUM, 'utf-8');

      // Strings (merge with existing if present)
      const stringsPath = path.join(resDir, 'values', 'widget_strings.xml');
      fs.writeFileSync(stringsPath, STRINGS_XML, 'utf-8');

      console.log('✅ All Android widget resources written');
      return config;
    },
  ]);
};

// ─────────────────────────────────────────────
// Plugin: AndroidManifest — register receivers
// ─────────────────────────────────────────────

const withAndroidWidgetManifest = (config) => {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application[0];
    const receivers = app.receiver || [];

    const widgetReceivers = [
      {
        name: '.SukoonSmallWidget',
        resource: '@xml/widget_small_info',
      },
      {
        name: '.SukoonMediumWidget',
        resource: '@xml/widget_medium_info',
      },
    ];

    widgetReceivers.forEach(({ name, resource }) => {
      const exists = receivers.some((r) => r?.$?.['android:name'] === name);
      if (!exists) {
        receivers.push({
          $: {
            'android:name': name,
            'android:exported': 'true',
          },
          'intent-filter': [
            {
              action: [
                { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
              ],
            },
          ],
          'meta-data': [
            {
              $: {
                'android:name': 'android.appwidget.provider',
                'android:resource': resource,
              },
            },
          ],
        });
        console.log('✅ Registered', name, 'in AndroidManifest');
      }
    });

    app.receiver = receivers;
    return config;
  });
};

// ─────────────────────────────────────────────
// Plugin: Register SukoonWidgetPackage in MainApplication
// ─────────────────────────────────────────────

const withAndroidWidgetPackageRegistration = (config) => {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;
    const isKotlin = contents.includes('fun getPackages()');

    if (isKotlin) {
      const imp = 'import com.talukders.sukoon.SukoonWidgetPackage';
      if (!contents.includes(imp)) {
        contents = contents.replace(
          /(import expo\.modules\.ReactNativeHostWrapper)/,
          `$1\n${imp}`
        );
      }
      const add = 'packages.add(SukoonWidgetPackage())';
      if (!contents.includes(add)) {
        contents = contents.replace(
          /(val packages = PackageList\(this\)\.packages)/,
          `$1\n            ${add}`
        );
      }
    } else {
      const imp = 'import com.talukders.sukoon.SukoonWidgetPackage;';
      if (!contents.includes(imp)) {
        contents = contents.replace(
          /(import com\.facebook\.react\.defaults\.DefaultReactNativeHost;)/,
          `$1\n${imp}`
        );
      }
      const add = 'packages.add(new SukoonWidgetPackage());';
      if (!contents.includes(add)) {
        contents = contents.replace(
          /(protected List<ReactPackage> getPackages\(\) {[\s\S]*?return packages;)/,
          (m) => m.replace('return packages;', `          ${add}\n          return packages;`)
        );
      }
    }

    config.modResults.contents = contents;
    console.log('✅ Registered SukoonWidgetPackage in MainApplication');
    return config;
  });
};

// ─────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────

module.exports = function withAndroidWidget(config) {
  config = withAndroidWidgetFiles(config);
  config = withAndroidWidgetManifest(config);
  config = withAndroidWidgetPackageRegistration(config);
  return config;
};
