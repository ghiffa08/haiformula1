package com.ghiffa.haiformula1;

import androidx.appcompat.app.AppCompatActivity;
import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.widget.Button;
import android.widget.RadioGroup;

public class WidgetConfigActivity extends AppCompatActivity {

    int appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Set the result to CANCELED. This will cause the widget host to cancel
        // out of the widget placement if the user presses the back button.
        setResult(RESULT_CANCELED);

        setContentView(R.layout.activity_widget_config);

        // Find the widget id from the intent.
        Intent intent = getIntent();
        Bundle extras = intent.getExtras();
        if (extras != null) {
            appWidgetId = extras.getInt(
                    AppWidgetManager.EXTRA_APPWIDGET_ID,
                    AppWidgetManager.INVALID_APPWIDGET_ID);
        }

        // If this activity was started with an intent without an app widget ID, finish with an error.
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish();
            return;
        }

        RadioGroup themeGroup = findViewById(R.id.theme_radio_group);
        Button saveButton = findViewById(R.id.btn_save_config);
        
        // Pre-select current theme if editing
        SharedPreferences prefs = getSharedPreferences("WidgetPrefs", Context.MODE_PRIVATE);
        String currentTheme = prefs.getString("theme_" + appWidgetId, "glass");
        if (currentTheme.equals("monochrome")) {
            themeGroup.check(R.id.radio_theme_monochrome);
        } else {
            themeGroup.check(R.id.radio_theme_glass);
        }

        saveButton.setOnClickListener(v -> {
            int selectedId = themeGroup.getCheckedRadioButtonId();
            String theme = "glass";
            if (selectedId == R.id.radio_theme_monochrome) {
                theme = "monochrome";
            }

            // Save the theme
            SharedPreferences.Editor prefsEditor = getSharedPreferences("WidgetPrefs", Context.MODE_PRIVATE).edit();
            prefsEditor.putString("theme_" + appWidgetId, theme);
            prefsEditor.apply();

            // Push widget update to surface with newly requested layout
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(this);
            
            android.appwidget.AppWidgetProviderInfo info = appWidgetManager.getAppWidgetInfo(appWidgetId);
            if (info != null && info.provider != null) {
                String className = info.provider.getClassName();
                if (className.equals(F1ScheduleWidget.class.getName())) {
                    F1ScheduleWidget.updateAppWidget(this, appWidgetManager, appWidgetId);
                } else if (className.equals(NextRaceCompactWidget.class.getName())) {
                    NextRaceCompactWidget.updateAppWidget(this, appWidgetManager, appWidgetId);
                } else if (className.equals(RaceResultsWidget.class.getName())) {
                    RaceResultsWidget.updateAppWidget(this, appWidgetManager, appWidgetId);
                }
            }

            // Make sure we pass back the original appWidgetId
            Intent resultValue = new Intent();
            resultValue.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            setResult(RESULT_OK, resultValue);
            finish();
        });
    }
}
