package com.talukders.sukoon;

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
