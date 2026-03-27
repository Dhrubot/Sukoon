package com.talukders.sukoon;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.SystemClock;
import android.util.Log;
import android.widget.RemoteViews;

import androidx.core.app.NotificationCompat;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class LiveActivityModule extends ReactContextBaseJavaModule {
    private static final String TAG = "LiveActivityModule";
    private static final String MODULE_NAME = "LiveActivityModule";
    private static final String CHANNEL_ID = "sukoon-live-activity";
    private static final int NOTIFICATION_ID = 8001;

    public LiveActivityModule(ReactApplicationContext reactContext) {
        super(reactContext);
        createNotificationChannel(reactContext);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    private void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Prayer Countdown",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Shows current prayer countdown on your lock screen");
            channel.setSound(null, null);
            channel.enableVibration(false);
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

            NotificationManager nm = context.getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    @ReactMethod
    public void startLiveActivity(String dataJson, Promise promise) {
        try {
            Context context = getReactApplicationContext();
            JSONObject payload = new JSONObject(dataJson);
            Notification notification = buildNotification(context, payload);
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(NOTIFICATION_ID, notification);
            }
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start live activity: " + e.getMessage());
            promise.reject("START_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void updateLiveActivity(String dataJson, Promise promise) {
        // Same as start — just updates the notification
        startLiveActivity(dataJson, promise);
    }

    @ReactMethod
    public void endLiveActivity(Promise promise) {
        try {
            Context context = getReactApplicationContext();
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(NOTIFICATION_ID);
            }
            promise.resolve(true);
        } catch (Exception e) {
            promise.resolve(true);
        }
    }

    private Notification buildNotification(Context context, JSONObject payload) throws Exception {
        String prayerName = payload.optString("prayerName", "Prayer");
        String phase = payload.optString("phase", "pre_adhan");
        String countdownTargetISO = payload.optString("countdownTargetISO", "");
        double progress = payload.optDouble("progress", 0.0);
        JSONArray statuses = payload.optJSONArray("prayerStatuses");

        // Parse target time for chronometer
        long targetMs = 0;
        if (!countdownTargetISO.isEmpty()) {
            try {
                SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
                Date targetDate = sdf.parse(countdownTargetISO);
                if (targetDate != null) {
                    targetMs = targetDate.getTime();
                }
            } catch (Exception e) {
                // Try without fractional seconds
                try {
                    SimpleDateFormat sdf2 = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US);
                    sdf2.setTimeZone(TimeZone.getTimeZone("UTC"));
                    Date targetDate = sdf2.parse(countdownTargetISO);
                    if (targetDate != null) {
                        targetMs = targetDate.getTime();
                    }
                } catch (Exception e2) {
                    Log.w(TAG, "Failed to parse countdown target: " + countdownTargetISO);
                }
            }
        }

        // Build quiet, prayer-first text
        String titleText;
        String bodyText;
        if (phase.equals("fiqh_window")) {
            long remainingMs = targetMs - System.currentTimeMillis();
            titleText = "Return with the next prayer";
            bodyText = prayerName + " \u00b7 " + formatDuration(remainingMs) + " remaining";
        } else if (phase.equals("prayed")) {
            titleText = "Rest in remembrance until the next prayer";
            bodyText = prayerName + " \u00b7 next window ahead";
        } else {
            long remainingMs = targetMs - System.currentTimeMillis();
            titleText = "Prepare for the next salah";
            bodyText = prayerName + " \u00b7 in " + formatDuration(remainingMs);
        }

        // Build dots text
        StringBuilder dots = new StringBuilder();
        if (statuses != null) {
            for (int i = 0; i < statuses.length(); i++) {
                String s = statuses.optString(i, "upcoming");
                if (i > 0) dots.append(" ");
                if (s.equals("prayed")) dots.append("\u25cf");      // ●
                else if (s.equals("current") || s.equals("next")) dots.append("\u25c9"); // ◉
                else if (s.equals("missed")) dots.append("\u25cb");  // ○
                else dots.append("\u25cb");                           // ○
            }
        }

        // Tap intent — opens app
        Intent tapIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (tapIntent == null) {
            tapIntent = new Intent();
        }
        if (phase.equals("fiqh_window")) {
            tapIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("sukoon://prepare?prayer=" + prayerName));
            tapIntent.setPackage(context.getPackageName());
        }
        tapIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        int tapFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            tapFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent tapPending = PendingIntent.getActivity(context, 0, tapIntent, tapFlags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_recent_history)
            .setContentTitle(titleText)
            .setContentText(bodyText + (dots.length() > 0 ? "  " + dots : ""))
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(tapPending)
            .setProgress(100, (int) (progress * 100), false);

        // Action buttons during fiqh window
        if (phase.equals("fiqh_window")) {
            // Prepare action
            Intent prepareIntent = new Intent(Intent.ACTION_VIEW,
                Uri.parse("sukoon://prepare?prayer=" + prayerName));
            prepareIntent.setPackage(context.getPackageName());
            PendingIntent preparePending = PendingIntent.getActivity(context, 1, prepareIntent, tapFlags);
            builder.addAction(0, "Prepare", preparePending);

            // Prayed action
            Intent prayedIntent = new Intent(Intent.ACTION_VIEW,
                Uri.parse("sukoon://prayed?prayer=" + prayerName));
            prayedIntent.setPackage(context.getPackageName());
            PendingIntent prayedPending = PendingIntent.getActivity(context, 2, prayedIntent, tapFlags);
            builder.addAction(0, "Prayed", prayedPending);
        }

        // Use chronometer for countdown if target is in the future
        if (targetMs > System.currentTimeMillis()) {
            long elapsedRealtime = SystemClock.elapsedRealtime();
            long diff = targetMs - System.currentTimeMillis();
            builder.setUsesChronometer(true);
            builder.setChronometerCountDown(true);
            builder.setWhen(System.currentTimeMillis() + diff);
        }

        return builder.build();
    }

    private String formatDuration(long ms) {
        if (ms <= 0) return "now";
        long totalMinutes = ms / (1000 * 60);
        long hours = totalMinutes / 60;
        long minutes = totalMinutes % 60;
        if (hours > 0) {
            return hours + "h " + minutes + "m";
        }
        return minutes + "m";
    }
}
