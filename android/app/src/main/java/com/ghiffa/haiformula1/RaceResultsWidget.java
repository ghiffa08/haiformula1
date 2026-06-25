package com.ghiffa.haiformula1;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class RaceResultsWidget extends AppWidgetProvider {

    private static JSONObject fetchFallbackNatively() {
        try {
            URL url = new URL("https://api.jolpi.ca/ergast/f1/current/last/results.json");
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestProperty("User-Agent", "Mozilla/5.0");
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(5000);
            connection.connect();

            if (connection.getResponseCode() == 200) {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()))) {
                    StringBuilder builder = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        builder.append(line);
                    }
                    
                    JSONObject root = new JSONObject(builder.toString());
                    JSONArray races = root.getJSONObject("MRData").getJSONObject("RaceTable").getJSONArray("Races");
                    if (races.length() > 0) {
                        JSONObject race = races.getJSONObject(0);
                        String raceName = race.optString("raceName", "Latest Race");
                        JSONArray rawResults = race.getJSONArray("Results");
                        
                        JSONArray resultsArray = new JSONArray();
                        for (int i = 0; i < Math.min(rawResults.length(), 10); i++) {
                            JSONObject r = rawResults.getJSONObject(i);
                            JSONObject driver = r.getJSONObject("Driver");
                            JSONObject constructor = r.getJSONObject("Constructor");
                            
                            JSONObject mapped = new JSONObject();
                            mapped.put("position", r.getString("position"));
                            mapped.put("code", driver.optString("code", driver.getString("familyName").substring(0, Math.min(3, driver.getString("familyName").length())).toUpperCase()));
                            mapped.put("constructorId", constructor.getString("constructorId"));
                            resultsArray.put(mapped);
                        }
                        
                        JSONObject result = new JSONObject();
                        result.put("raceName", raceName);
                        result.put("results", resultsArray);
                        
                        // Fallback flag removed as it's unreliable without JS payload
                        
                        return result;
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_race_results);

        WidgetUtils.applyTheme(context, views, appWidgetId, R.id.widget_root);

        try {
            SharedPreferences capacitorPrefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            String resultsJson = capacitorPrefs.getString("widget_race_results", null);
            JSONObject fallbackData = null;
            
            if (resultsJson == null) {
                fallbackData = fetchFallbackNatively();
            }

            if (resultsJson != null || fallbackData != null) {
                JSONObject data = resultsJson != null ? new JSONObject(resultsJson) : fallbackData;

                String raceName = WidgetUtils.cleanRaceName(data.optString("raceName", "Latest Race"));
                views.setTextViewText(R.id.widget_race_name, raceName);
                views.setTextViewText(R.id.widget_session_type, "Race Results");

                String flagUrl = data.optString("flagUrl", "");
                if (!flagUrl.isEmpty()) {
                    Bitmap flagBitmap = WidgetUtils.downloadFlagImage(flagUrl);
                    if (flagBitmap != null) {
                        views.setImageViewBitmap(R.id.widget_country_flag, flagBitmap);
                    }
                }

                JSONArray results = data.optJSONArray("results");
                if (results != null) {
                    int[] posIds = {R.id.widget_pos_1, R.id.widget_pos_2, R.id.widget_pos_3, R.id.widget_pos_4, R.id.widget_pos_5, R.id.widget_pos_6, R.id.widget_pos_7, R.id.widget_pos_8, R.id.widget_pos_9, R.id.widget_pos_10};
                    int[] colorIds = {R.id.widget_color_1, R.id.widget_color_2, R.id.widget_color_3, R.id.widget_color_4, R.id.widget_color_5, R.id.widget_color_6, R.id.widget_color_7, R.id.widget_color_8, R.id.widget_color_9, R.id.widget_color_10};
                    int[] driverIds = {R.id.widget_driver_1, R.id.widget_driver_2, R.id.widget_driver_3, R.id.widget_driver_4, R.id.widget_driver_5, R.id.widget_driver_6, R.id.widget_driver_7, R.id.widget_driver_8, R.id.widget_driver_9, R.id.widget_driver_10};

                    for (int i = 0; i < Math.min(results.length(), 10); i++) {
                        JSONObject driverResult = results.optJSONObject(i);
                        if (driverResult == null) continue;

                        String pos = driverResult.optString("position", String.format("%02d", i + 1));
                        if (pos.length() == 1) pos = "0" + pos;

                        String name = driverResult.optString("code", driverResult.optString("familyName", "").length() >= 3 ? driverResult.optString("familyName", "").substring(0, 3).toUpperCase() : "UNK");
                        String constructorId = driverResult.optString("constructorId", "");

                        views.setTextViewText(posIds[i], pos);
                        views.setTextViewText(driverIds[i], name);
                        try {
                            views.setInt(colorIds[i], "setBackgroundColor", Color.parseColor(WidgetUtils.getTeamColor(constructorId)));
                        } catch (Exception ignored) {}
                    }
                }
            } else {
                views.setTextViewText(R.id.widget_race_name, "Buka App F1");
                views.setTextViewText(R.id.widget_session_type, "Sinkronisasi...");
            }
        } catch (Exception e) {
            views.setTextViewText(R.id.widget_race_name, "Error");
            e.printStackTrace();
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
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
