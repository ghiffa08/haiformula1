package com.ghiffa.haiformula1;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.PorterDuff;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class CircuitWidgetProvider extends AppWidgetProvider {

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_circuit_layout);

        WidgetUtils.applyTheme(context, views, appWidgetId, R.id.widget_circuit_root);

        try {
            SharedPreferences sharedPreferences = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            String raceJson = sharedPreferences.getString("widget_next_race", null);

            if (raceJson != null) {
                JSONObject race = new JSONObject(raceJson);
                
                String country = race.optString("country", "Unknown");
                String locality = race.optString("locality", "");
                String flagUrl = race.optString("flagUrl", "");
                String sessionName = race.optString("sessionName", "GRAND PRIX").toUpperCase();
                String dateString = race.optString("date", "");
                String timeString = race.optString("time", "");
                String circuitImageUrl = race.optString("circuitImageUrl", "");

                // Format Time
                String timeText = "";
                String dateText = "";
                try {
                    SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US);
                    sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
                    Date dateObj = sdf.parse(dateString + "T" + timeString);
                    
                    if (dateObj != null) {
                        SimpleDateFormat timeFormat = new SimpleDateFormat("HH:mm", Locale.getDefault());
                        timeText = timeFormat.format(dateObj);
                        
                        SimpleDateFormat dateFormat = new SimpleDateFormat("MMM d, EEE", Locale.getDefault());
                        dateText = dateFormat.format(dateObj);
                    }
                } catch (Exception e) {
                    timeText = timeString.replace("Z", "");
                }

                views.setTextViewText(R.id.widget_circuit_country, country);
                views.setTextViewText(R.id.widget_circuit_locality, locality);
                views.setTextViewText(R.id.widget_circuit_session, sessionName);
                views.setTextViewText(R.id.widget_circuit_time, timeText);
                
                // Dynamic styling based on Sprint vs Grand Prix
                if (sessionName.contains("SPRINT")) {
                    views.setInt(R.id.widget_circuit_indicator, "setBackgroundColor", Color.parseColor("#E10600")); // F1 Red
                    views.setViewVisibility(R.id.widget_circuit_date, View.GONE);
                } else {
                    views.setInt(R.id.widget_circuit_indicator, "setBackgroundColor", Color.parseColor("#00FF00")); // Green
                    views.setViewVisibility(R.id.widget_circuit_date, View.VISIBLE);
                    views.setTextViewText(R.id.widget_circuit_date, dateText);
                }

                Bitmap flagBitmap = WidgetUtils.downloadFlagImage(flagUrl);
                if (flagBitmap != null) {
                    views.setImageViewBitmap(R.id.widget_circuit_flag, flagBitmap);
                }

                if (!circuitImageUrl.isEmpty()) {
                    Bitmap circuitBitmap = WidgetUtils.downloadCircuitImage(circuitImageUrl);
                    if (circuitBitmap != null) {
                        views.setImageViewBitmap(R.id.widget_circuit_silhouette, circuitBitmap);
                    } else {
                        // Fallback color filter if download failed
                        views.setInt(R.id.widget_circuit_silhouette, "setColorFilter", sessionName.contains("SPRINT") ? Color.parseColor("#E10600") : Color.parseColor("#FFFFFF"));
                    }
                } else {
                    views.setInt(R.id.widget_circuit_silhouette, "setColorFilter", sessionName.contains("SPRINT") ? Color.parseColor("#E10600") : Color.parseColor("#FFFFFF"));
                }
            } else {
                views.setTextViewText(R.id.widget_circuit_country, "Waiting for Sync");
                views.setTextViewText(R.id.widget_circuit_locality, "Open the app...");
            }

            Intent intent = new Intent(context, MainActivity.class);
            PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_circuit_root, pendingIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        final PendingResult pendingResult = goAsync();
        WidgetUtils.executor.execute(() -> {
            for (int appWidgetId : appWidgetIds) {
                updateAppWidget(context, appWidgetManager, appWidgetId);
            }
            if (pendingResult != null) {
                pendingResult.finish();
            }
        });
    }
}
