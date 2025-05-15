package org.apache.hadoop.mapper;

import org.apache.hadoop.io.*;
import org.apache.hadoop.mapreduce.Mapper;
import org.json.JSONObject;
import com.opencsv.CSVParser;
import com.opencsv.CSVParserBuilder;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public class UsgsCsvMapper extends Mapper<LongWritable, Text, Text, Text> {

    private boolean isHeader = true;
    private Map<String, String> magTypeMap;

    @Override
    protected void setup(Context context) {
        magTypeMap = new HashMap<>();
        magTypeMap.put("ml", "local_magnitude");
        magTypeMap.put("md", "duration_magnitude");
        magTypeMap.put("mb", "body_wave_magnitude");
        magTypeMap.put("mww", "moment_magnitude");
        magTypeMap.put("mwr", "regional_moment_magnitude");
        magTypeMap.put("mw", "moment_magnitude");
        magTypeMap.put("mb_lg", "Lg_wave_body_magnitude");
        magTypeMap.put("mh", "hypocentral_magnitude");
        magTypeMap.put("mwb", "broadband_moment_magnitude");
    }

    @Override
    protected void map(LongWritable key, Text value, Context context) throws IOException, InterruptedException {
        String line = value.toString();

        if (isHeader && line.contains("time,")) {
            isHeader = false;
            return;
        }

        try {
            CSVParser parser = new CSVParserBuilder().withSeparator(',').withQuoteChar('"').build();
            String[] parts = parser.parseLine(line);

            if (parts.length < 15) return;

            String magTypeRaw = parts[5].toLowerCase();
            String magTypeVerbose = magTypeMap.getOrDefault(magTypeRaw, "unknown");

            JSONObject obj = new JSONObject();
            obj.put("time", parts[0]);
            obj.put("latitude", Double.parseDouble(parts[1]));
            obj.put("longitude", Double.parseDouble(parts[2]));
            obj.put("depth", Double.parseDouble(parts[3]));
            obj.put("magnitude_value", Double.parseDouble(parts[4]));
            obj.put("magnitude_type", magTypeVerbose);
            obj.put("source", "USGS");
            String updated = parts[12] != null && !parts[12].trim().isEmpty() ? parts[12] : "unknown";
            obj.put("updated", updated);
            String place = parts[13] != null && !parts[13].trim().isEmpty() ? parts[13].replace("\"", "") : "unknown";
            obj.put("place", place);
            String type = parts[14] != null && !parts[14].trim().isEmpty() ? parts[14] : "earthquake";
            obj.put("type", type);

            context.write(new Text(parts[0]), new Text(obj.toString()));

        } catch (Exception e) {
            // Optional: log or count errors using context.getCounter(...)
        }
    }
}

