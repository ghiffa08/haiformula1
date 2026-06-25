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

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class NextRaceCompactWidget extends AppWidgetProvider {

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_next_race);

        WidgetUtils.applyTheme(context, views, appWidgetId, R.id.widget_root);

        try {
            SharedPreferences sharedPreferences = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            String raceJson = sharedPreferences.getString("widget_next_race", null);

            if (raceJson != null) {
                JSONObject race = new JSONObject(raceJson);
                String raceName = WidgetUtils.cleanRaceName(race.optString("raceName", "Next Race"));
                String locality = race.optString("locality", "");
                String country = race.optString("country", "");
                String flagUrl = race.optString("flagUrl", "");
                


                String locationText = locality;
                if (!country.isEmpty() && locality.isEmpty()) {
                    locationText = country;
                }

                views.setTextViewText(R.id.widget_race_name, raceName);
                views.setTextViewText(R.id.widget_location, locationText);

                Bitmap flagBitmap = WidgetUtils.downloadFlagImage(flagUrl);
                if (flagBitmap != null) {
                    views.setImageViewBitmap(R.id.widget_country_flag, flagBitmap);
                }

                int[] rowIds = {R.id.widget_row_1, R.id.widget_row_2, R.id.widget_row_3, R.id.widget_row_4, R.id.widget_row_5, R.id.widget_row_6};
                int[] nameIds = {R.id.widget_name_1, R.id.widget_name_2, R.id.widget_name_3, R.id.widget_name_4, R.id.widget_name_5, R.id.widget_name_6};
                int[] timeIds = {R.id.widget_time_1, R.id.widget_time_2, R.id.widget_time_3, R.id.widget_time_4, R.id.widget_time_5, R.id.widget_time_6};
                int[] indicatorIds = {R.id.widget_indicator_1, R.id.widget_indicator_2, R.id.widget_indicator_3, R.id.widget_indicator_4, R.id.widget_indicator_5, R.id.widget_indicator_6};

                for (int id : rowIds) views.setViewVisibility(id, View.GONE);

                JSONArray sessionsArray = race.optJSONArray("sessions");
                if (sessionsArray != null) {
                    long currentTime = System.currentTimeMillis();
                    int nextSessionIndex = -1;

                    SimpleDateFormat utcParser = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US);
                    utcParser.setTimeZone(TimeZone.getTimeZone("UTC"));

                    // First pass to find the next session
                    for (int i = 0; i < sessionsArray.length(); i++) {
                        JSONObject sessionObj = sessionsArray.optJSONObject(i);
                        if (sessionObj == null) continue;
                        String sDate = sessionObj.optString("date", "");
                        String sTime = sessionObj.optString("time", "00:00:00Z");

                        try {
                            String timeFixed = sTime.endsWith("Z") ? sTime : sTime + "Z";
                            Date d = utcParser.parse(sDate + "T" + timeFixed);
                            if (d != null && d.getTime() > currentTime) {
                                nextSessionIndex = i;
                                break;
                            }
                        } catch (Exception ignored) {}
                    }

                    SimpleDateFormat formatDayTime = new SimpleDateFormat("dd/MM HH:mm", Locale.US);
                    int rowIndex = 0;
                    for (int i = 0; i < sessionsArray.length(); i++) {
                        if (rowIndex >= rowIds.length) break;
                        JSONObject sessionObj = sessionsArray.optJSONObject(i);
                        if (sessionObj == null) continue;

                        String sName = sessionObj.optString("name", "SESSION");
                        // Abbreviate names
                        if (sName.equalsIgnoreCase("PRACTICE 1")) sName = "P1";
                        if (sName.equalsIgnoreCase("PRACTICE 2")) sName = "P2";
                        if (sName.equalsIgnoreCase("PRACTICE 3")) sName = "P3";
                        if (sName.equalsIgnoreCase("QUALIFYING")) sName = "Q";
                        if (sName.equalsIgnoreCase("SPRINT")) sName = "S";
                        if (sName.equalsIgnoreCase("GRAND PRIX")) sName = "GP";

                        String sDate = sessionObj.optString("date", "");
                        String sTime = sessionObj.optString("time", "00:00:00Z");
                        String timeText = sTime.replace("Z", "");

                        try {
                            String timeFixed = sTime.endsWith("Z") ? sTime : sTime + "Z";
                            Date d = utcParser.parse(sDate + "T" + timeFixed);
                            if (d != null) {
                                timeText = formatDayTime.format(d);
                            }
                        } catch (Exception ignored) {}

                        views.setViewVisibility(rowIds[rowIndex], View.VISIBLE);
                        views.setTextViewText(nameIds[rowIndex], sName);
                        views.setTextViewText(timeIds[rowIndex], timeText);

                        // Colors
                        int defaultGrey = Color.parseColor("#999999");
                        int defaultWhite = Color.parseColor("#FFFFFF");
                        int highlightRed = Color.parseColor("#FF2744");

                        if (i == nextSessionIndex) {
                            views.setTextColor(nameIds[rowIndex], highlightRed);
                            views.setTextColor(timeIds[rowIndex], highlightRed);
                            views.setInt(indicatorIds[rowIndex], "setBackgroundColor", highlightRed);
                        } else if (i < nextSessionIndex || (nextSessionIndex == -1 && currentTime > 0)) {
                            // Past sessions
                            views.setTextColor(nameIds[rowIndex], defaultGrey);
                            views.setTextColor(timeIds[rowIndex], defaultGrey);
                            views.setInt(indicatorIds[rowIndex], "setBackgroundColor", Color.parseColor("#444444"));
                        } else {
                            // Future sessions
                            views.setTextColor(nameIds[rowIndex], defaultWhite);
                            views.setTextColor(timeIds[rowIndex], defaultGrey);
                            views.setInt(indicatorIds[rowIndex], "setBackgroundColor", highlightRed);
                        }

                        rowIndex++;
                    }
                }
            } else {
                views.setTextViewText(R.id.widget_race_name, "Syncing...");
                views.setTextViewText(R.id.widget_location, "Open App to sync");
            }
        } catch (Exception e) {
            views.setTextViewText(R.id.widget_race_name, "Error");
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
