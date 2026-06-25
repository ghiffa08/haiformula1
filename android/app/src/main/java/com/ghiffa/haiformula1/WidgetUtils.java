package com.ghiffa.haiformula1;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.widget.RemoteViews;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class WidgetUtils {

    // Shared thread pool executor for all widget updates
    public static final ExecutorService executor = Executors.newFixedThreadPool(2);

    /**
     * Cleans up the race name to make it shorter and readable.
     */
    public static String cleanRaceName(String rawName) {
        if (rawName == null) return "Next Race";
        String name = rawName.replace("Formula 1", "")
                .replace("Formula One", "")
                .replace("Grand Prix", "GP")
                .replaceAll("\\b202\\d\\b", "")
                .replaceAll("\\s+", " ")
                .trim();
        String[] sponsors = {
                "Lenovo", "Qatar Airways", "Rolex", "Aramco", "Pirelli",
                "Heineken", "BWT", "AWS", "Crypto.com", "MSC Cruises",
                "Honda", "Gulf Air", "STC", "Etihad Airways", "DP World", "Oracle"
        };
        for (String sponsor : sponsors) {
            if (name.toUpperCase().startsWith(sponsor.toUpperCase() + " ")) {
                name = name.substring(sponsor.length() + 1).trim();
            }
        }
        return name;
    }


    /**
     * Downloads flag image synchronously. Optimized with try-with-resources.
     */
    public static Bitmap downloadFlagImage(String flagUrl) {
        if (flagUrl == null || flagUrl.isEmpty()) return null;
        HttpURLConnection connection = null;
        try {
            URL url = new URL(flagUrl);
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestProperty("User-Agent", "Mozilla/5.0");
            connection.setInstanceFollowRedirects(true);
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(5000);
            connection.connect();

            int responseCode = connection.getResponseCode();
            if (responseCode == 200 || responseCode == 301 || responseCode == 302) {
                try (InputStream in = connection.getInputStream();
                     ByteArrayOutputStream buffer = new ByteArrayOutputStream()) {
                    int nRead;
                    byte[] data = new byte[2048];
                    while ((nRead = in.read(data, 0, data.length)) != -1) {
                        buffer.write(data, 0, nRead);
                    }
                    buffer.flush();
                    byte[] imageBytes = buffer.toByteArray();
                    return BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.length);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
        return null;
    }

    /**
     * Downloads and scales down an image to prevent TransactionTooLargeException
     * in RemoteViews. Ideal for high-res circuit maps.
     */
    public static Bitmap downloadCircuitImage(String imageUrl) {
        if (imageUrl == null || imageUrl.isEmpty()) return null;
        HttpURLConnection connection = null;
        try {
            URL url = new URL(imageUrl);
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestProperty("User-Agent", "Mozilla/5.0");
            connection.setInstanceFollowRedirects(true);
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(5000);
            connection.connect();

            int responseCode = connection.getResponseCode();
            if (responseCode == 200 || responseCode == 301 || responseCode == 302) {
                try (InputStream in = connection.getInputStream();
                     ByteArrayOutputStream buffer = new ByteArrayOutputStream()) {
                    int nRead;
                    byte[] data = new byte[2048];
                    while ((nRead = in.read(data, 0, data.length)) != -1) {
                        buffer.write(data, 0, nRead);
                    }
                    buffer.flush();
                    byte[] imageBytes = buffer.toByteArray();

                    // Decode bounds to get original dimensions
                    BitmapFactory.Options options = new BitmapFactory.Options();
                    options.inJustDecodeBounds = true;
                    BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.length, options);

                    // Calculate inSampleSize
                    final int reqWidth = 500;
                    final int reqHeight = 500;
                    options.inSampleSize = 1;
                    if (options.outHeight > reqHeight || options.outWidth > reqWidth) {
                        final int halfHeight = options.outHeight / 2;
                        final int halfWidth = options.outWidth / 2;
                        while ((halfHeight / options.inSampleSize) >= reqHeight
                                && (halfWidth / options.inSampleSize) >= reqWidth) {
                            options.inSampleSize *= 2;
                        }
                    }

                    // Decode bitmap with inSampleSize set
                    options.inJustDecodeBounds = false;
                    return BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.length, options);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
        return null;
    }

    /**
     * Retrieves the constructor color string based on ID.
     */
    public static String getTeamColor(String constructorId) {
        if (constructorId == null) return "#FFFFFF";
        switch (constructorId.toLowerCase()) {
            case "red_bull": return "#0600EF";
            case "mercedes": return "#00D2BE";
            case "ferrari": return "#DC0000";
            case "mclaren": return "#FF8700";
            case "aston_martin": return "#229971";
            case "alpine": return "#0090FF";
            case "williams": return "#005AFF";
            case "rb": return "#6692FF";
            case "kick_sauber": return "#52E252";
            case "haas": return "#B6BABD";
            default: return "#FFFFFF";
        }
    }

    /**
     * Applies theme background logic uniformly across widgets.
     */
    public static void applyTheme(Context context, RemoteViews views, int appWidgetId, int rootLayoutId) {
        SharedPreferences prefs = context.getSharedPreferences("WidgetPrefs", Context.MODE_PRIVATE);
        String theme = prefs.getString("theme_" + appWidgetId, "glass");
        if ("monochrome".equals(theme)) {
            views.setInt(rootLayoutId, "setBackgroundResource", R.drawable.app_widget_monochrome);
        } else {
            views.setInt(rootLayoutId, "setBackgroundResource", R.drawable.app_widget_background);
        }
    }
}
