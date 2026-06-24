package com.ghiffa.haiformula1;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.widget.RemoteViews;
import org.json.JSONObject;

import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class F1ScheduleWidget extends AppWidgetProvider {

    private static final ExecutorService executor = Executors.newSingleThreadExecutor();

    private static String getF1CountryName(String country) {
        if (country == null) return "";
        switch (country) {
            case "UK": return "Great_Britain";
            case "USA": return "United_States";
            case "UAE": return "Abu_Dhabi";
            case "Saudi Arabia": return "Saudi_Arabia";
            default: return country.replace(" ", "_");
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_f1_schedule);
        
        try {
            SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            // Capacitor Preferences prefixes all keys with _cap_
            String raceJson = prefs.getString("_cap_widget_next_race", null);

            if (raceJson != null) {
                JSONObject race = new JSONObject(raceJson);
                String sessionName = race.optString("sessionName", "RACE");
                String raceName = race.optString("raceName", "Next Race");
                String dateStr = race.optString("date", "");
                String timeStr = race.optString("time", "15:00:00Z");
                String locality = race.optString("locality", "");
                String country = race.optString("country", "");

                // Set UI texts
                views.setTextViewText(R.id.widget_session_name, sessionName.toUpperCase());
                views.setTextViewText(R.id.widget_race_name, raceName);
                views.setTextViewText(R.id.widget_location, locality.toUpperCase() + ", " + country.toUpperCase());
                
                // Format the static info to WIB
                String displayDateTime = dateStr + " • " + timeStr.replace("Z", "");
                try {
                    SimpleDateFormat utcFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'");
                    utcFormat.setTimeZone(TimeZone.getTimeZone("UTC"));
                    Date d = utcFormat.parse(dateStr + "T" + timeStr);
                    
                    SimpleDateFormat wibFormat = new SimpleDateFormat("EEE, dd MMM yyyy • HH:mm 'WIB'");
                    wibFormat.setTimeZone(TimeZone.getTimeZone("Asia/Jakarta"));
                    displayDateTime = wibFormat.format(d);
                } catch (Exception e) {}
                
                views.setTextViewText(R.id.widget_race_date, displayDateTime);
                
                // Fetch Circuit Image using static SingleThreadExecutor to avoid thread leaks
                executor.submit(() -> {
                    try {
                        String imageUrl = "https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Circuit%20maps%2016x9/" + getF1CountryName(country) + "_Circuit.png";
                        URL url = new URL(imageUrl);
                        Bitmap bmp = BitmapFactory.decodeStream(url.openConnection().getInputStream());
                        if (bmp != null) {
                            views.setImageViewBitmap(R.id.widget_circuit_image, bmp);
                            appWidgetManager.updateAppWidget(appWidgetId, views);
                        }
                    } catch (Exception e) {}
                });

            } else {
                views.setTextViewText(R.id.widget_session_name, "STANDBY");
                views.setTextViewText(R.id.widget_race_name, "Buka App F1");
                views.setTextViewText(R.id.widget_race_date, "Sinkronisasi...");
            }
        } catch (Exception e) {
            views.setTextViewText(R.id.widget_race_name, "Error membaca data");
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }
}
