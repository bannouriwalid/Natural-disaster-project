package org.apache.hadoop.mapper;

import org.apache.hadoop.io.*;
import org.apache.hadoop.mapreduce.Mapper;
import org.json.JSONObject;
import org.json.JSONArray;

import java.io.IOException;

public class EonetJsonMapper extends Mapper<LongWritable, Text, Text, Text> {

    @Override
    protected void map(LongWritable key, Text value, Context context) throws IOException, InterruptedException {
        try {
            String line = value.toString();
            JSONObject obj = new JSONObject(line);

            JSONArray events = obj.optJSONArray("events");
            if (events == null) return;

            for (int i = 0; i < events.length(); i++) {
                JSONObject event = events.getJSONObject(i);

                String eventId = event.optString("id");
                String place = event.optString("title");
                Object description = event.opt("description");

                // Get first category as type
                JSONArray categories = event.optJSONArray("categories");
                String type = null;
                if (categories != null && categories.length() > 0) {
                    type = categories.getJSONObject(0).optString("title");
                }

                // Filter: Keep only Wildfires
                // if (type == null || !type.equalsIgnoreCase("wildfires")) continue;

                // Process geometries individually as flat records
                JSONArray geometries = event.optJSONArray("geometry");
                if (geometries == null) continue;

                for (int j = 0; j < geometries.length(); j++) {
                    JSONObject geom = geometries.getJSONObject(j);
                    JSONArray coords = geom.optJSONArray("coordinates");
                    if (coords == null || coords.length() < 2) continue;

                    JSONObject out = new JSONObject();
                    out.put("place", place);
                    out.put("description", description);
                    out.put("type", type);
                    out.put("longitude", coords.optDouble(0));
                    out.put("latitude", coords.optDouble(1));
                    out.put("time", geom.optString("date"));
                    out.put("magnitude_value", geom.opt("magnitudeValue"));
                    out.put("magnitude_unit", geom.opt("magnitudeUnit"));
                    out.put("source", "EONET");
                    context.write(new Text(eventId + "_" + j), new Text(out.toString()));
                }
            }

        } catch (Exception e) {
            System.out.println(e);
            // Optionally log error
        }
    }
}
