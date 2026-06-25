package com.ghiffa.haiformula1;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.widget.RemoteViews;
import android.view.View;
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

public class F1ScheduleWidget extends AppWidgetProvider {

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_f1_schedule);

        WidgetUtils.applyTheme(context, views, appWidgetId, R.id.widget_glass_root);
        
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
                if (!country.isEmpty()) {
                    if (locationText.isEmpty()) locationText = country;
                    else locationText = locationText + ", " + country;
                }
                
                String raceDateStr = race.optString("raceDate", race.optString("date", ""));
                String raceTimeStr = race.optString("raceTime", race.optString("time", "15:00:00Z"));
                
                String countdownText = "STANDBY";
                if (!raceDateStr.isEmpty()) {
                    try {
                        SimpleDateFormat utcFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US);
                        utcFormat.setTimeZone(TimeZone.getTimeZone("UTC"));
                        String timeFixed = raceTimeStr.contains("Z") ? raceTimeStr : raceTimeStr + "Z";
                        Date d = utcFormat.parse(raceDateStr + "T" + timeFixed);
                        
                        if (d != null) {
                            long diffMillis = d.getTime() - System.currentTimeMillis();
                            if (diffMillis > 0) {
                                long diffHours = diffMillis / (1000 * 60 * 60);
                                if (diffHours > 24) {
                                    long diffDays = diffHours / 24;
                                    countdownText = diffDays + " DAYS";
                                } else if (diffHours > 0) {
                                    countdownText = diffHours + " HOURS";
                                } else {
                                    countdownText = "TODAY";
                                }
                            } else {
                                countdownText = "RACE DAY";
                            }
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }

                // Set UI texts
                views.setTextViewText(R.id.widget_glass_race_name, raceName);
                views.setTextViewText(R.id.widget_glass_location, locationText);
                views.setTextViewText(R.id.widget_glass_countdown, countdownText);
                
                Bitmap flagBitmap = WidgetUtils.downloadFlagImage(flagUrl);
                if (flagBitmap != null) {
                    views.setImageViewBitmap(R.id.widget_glass_country_flag, flagBitmap);
                }

                int[] dateViewIds = { R.id.widget_glass_date_1, R.id.widget_glass_date_2, R.id.widget_glass_date_3 };
                int[] rowIds = { R.id.widget_glass_row_1, R.id.widget_glass_row_2, R.id.widget_glass_row_3, R.id.widget_glass_row_4, R.id.widget_glass_row_5, R.id.widget_glass_row_6 };
                int[] nameIds = { R.id.widget_glass_name_1, R.id.widget_glass_name_2, R.id.widget_glass_name_3, R.id.widget_glass_name_4, R.id.widget_glass_name_5, R.id.widget_glass_name_6 };
                int[] timeIds = { R.id.widget_glass_time_1, R.id.widget_glass_time_2, R.id.widget_glass_time_3, R.id.widget_glass_time_4, R.id.widget_glass_time_5, R.id.widget_glass_time_6 };

                JSONArray sessionsArray = race.optJSONArray("sessions");
                if (sessionsArray != null) {
                    for (int id : dateViewIds) views.setViewVisibility(id, View.GONE);
                    for (int id : rowIds) views.setViewVisibility(id, View.GONE);

                    SimpleDateFormat dateParser = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
                    SimpleDateFormat dateFormatter = new SimpleDateFormat("MMM dd, EEE", Locale.US);
                    SimpleDateFormat utcParser = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US);
                    utcParser.setTimeZone(TimeZone.getTimeZone("UTC"));
                    SimpleDateFormat localTimeFormatter = new SimpleDateFormat("HH:mm", Locale.US);

                    String lastDateStr = "";
                    int dateIndex = 0;
                    int rowIndex = 0;
                    
                    for (int i = 0; i < sessionsArray.length(); i++) {
                        if (rowIndex >= rowIds.length) break;
                        
                        JSONObject sessionObj = sessionsArray.optJSONObject(i);
                        if (sessionObj == null) continue;
                        
                        String sDate = sessionObj.optString("date", "");
                        String sTime = sessionObj.optString("time", "00:00:00Z");
                        String sName = sessionObj.optString("name", "SESSION");
                        
                        if (!sDate.equals(lastDateStr) && !sDate.isEmpty()) {
                            lastDateStr = sDate;
                            if (dateIndex < dateViewIds.length) {
                                views.setViewVisibility(dateViewIds[dateIndex], View.VISIBLE);
                                try {
                                    Date parsedDate = dateParser.parse(sDate);
                                    if (parsedDate != null) {
                                        views.setTextViewText(dateViewIds[dateIndex], dateFormatter.format(parsedDate).toUpperCase());
                                    }
                                } catch (Exception e) {
                                    views.setTextViewText(dateViewIds[dateIndex], sDate);
                                }
                                dateIndex++;
                                
                                if (dateIndex == 2 && rowIndex < 2) rowIndex = 2;
                                if (dateIndex == 3 && rowIndex < 4) rowIndex = 4;
                            }
                        }
                        
                        if (rowIndex < rowIds.length) {
                            views.setViewVisibility(rowIds[rowIndex], View.VISIBLE);
                            views.setTextViewText(nameIds[rowIndex], sName);
                            
                            try {
                                String timeFixed = sTime.endsWith("Z") ? sTime : sTime + "Z";
                                Date d = utcParser.parse(sDate + "T" + timeFixed);
                                
                                if (d != null) {
                                    views.setTextViewText(timeIds[rowIndex], localTimeFormatter.format(d));
                                }
                            } catch (Exception e) {
                                views.setTextViewText(timeIds[rowIndex], sTime.replace("Z", ""));
                            }
                            rowIndex++;
                        }
                    }
                }

            } else {
                views.setTextViewText(R.id.widget_glass_race_name, "Buka App F1");
                views.setTextViewText(R.id.widget_glass_location, "Sinkronisasi...");
                views.setTextViewText(R.id.widget_glass_countdown, "STANDBY");
            }
        } catch (Exception e) {
            views.setTextViewText(R.id.widget_glass_race_name, "Error membaca data");
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
