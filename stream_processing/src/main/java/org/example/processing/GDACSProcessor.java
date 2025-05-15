package org.example.processing;

import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.api.java.UDF1;
import org.apache.spark.sql.functions;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructType;

import java.util.HashMap;
import java.util.Map;

public class GDACSProcessor {

    // Mapping of event type codes to verbose names
    private static final Map<String, String> eventTypeMap = new HashMap<>();
    static {
        eventTypeMap.put("EQ", "Earthquake");
        eventTypeMap.put("FL", "Flood");
        eventTypeMap.put("WF", "Wildfire");
        eventTypeMap.put("DR", "Drought");
    }

    // UDF to convert eventType codes to verbose strings
    private static final UDF1<String, String> mapEventTypeUDF = (String code) ->
            code != null && eventTypeMap.containsKey(code.toUpperCase())
                    ? eventTypeMap.get(code.toUpperCase())
                    : code;

    // Method to process the GDACS stream data
    public Dataset<Row> process(Dataset<Row> gdacsStream) {
        SparkSession spark = gdacsStream.sparkSession();

        // Register the UDF (only once)
        spark.udf().register("mapEventType", mapEventTypeUDF, DataTypes.StringType);

        return gdacsStream
                .selectExpr("CAST(value AS STRING) AS json_data")
                .select(functions.from_json(functions.col("json_data"), getGDACSSchema()).as("data"))
                .selectExpr("explode(data.alerts) as alert")
                .select(
                        // Common columns
                        functions.col("alert.latitude").alias("latitude"),
                        functions.col("alert.longitude").alias("longitude"),

                        // Improved description extraction: fallback to full description if no commas
                        functions.when(
                                functions.col("alert.description").contains(","),
                                functions.regexp_extract(functions.col("alert.description"), ",\\s*(.*?)(,|$)", 1)
                        ).otherwise(functions.col("alert.description")).alias("description"),

                        functions.callUDF("mapEventType", functions.col("alert.eventtype")).alias("type"),
                        functions.col("alert.alertlevel").alias("alert_level"),
                        functions.when(functions.col("alert.place").equalTo(""), "unknown").otherwise(functions.col("alert.place")).alias("place"),
                        functions.col("alert.pubDate").alias("date_time"),
                        functions.lit("GDACS").alias("source"),
                        functions.sha2(functions.concat_ws(":", functions.col("alert.title"), functions.col("alert.pubDate"), functions.col("alert.eventtype")), 256).alias("id"),

                        // Earthquake-specific fields
                        functions.when(
                                functions.col("alert.eventtype").equalTo("EQ"),
                                functions.regexp_extract(functions.col("alert.severity"), "Magnitude (\\d+\\.\\d+)", 1)
                        ).otherwise((String) null).alias("magnitude"),

                        functions.when(
                                functions.col("alert.eventtype").equalTo("EQ"),
                                functions.regexp_extract(functions.col("alert.severity"), "Depth:(\\d+(\\.\\d+)?)", 1)
                        ).otherwise((String) null).alias("depth"),

                        // Wildfire-specific field
                        functions.when(
                                functions.col("alert.eventtype").equalTo("WF"),
                                functions.regexp_extract(functions.col("alert.severity"), "(\\d+)(\\s*ha)", 1)
                        ).otherwise((String) null).alias("magnitude_value_in_ha"),

                        // Drought-specific field: extract km2 area
                        functions.when(
                                functions.col("alert.eventtype").equalTo("DR"),
                                functions.regexp_extract(functions.col("alert.severity"), "in (\\d+)(\\s*km2)", 1)
                        ).otherwise((String) null).alias("magnitude_value_in_km2")
                );
    }

    // Schema for parsing the JSON structure
    private StructType getGDACSSchema() {
        return new StructType()
                .add("alerts", DataTypes.createArrayType(
                        new StructType()
                                .add("severity", DataTypes.StringType)
                                .add("latitude", DataTypes.StringType)
                                .add("longitude", DataTypes.StringType)
                                .add("link", DataTypes.StringType)
                                .add("description", DataTypes.StringType)
                                .add("eventtype", DataTypes.StringType)
                                .add("alertlevel", DataTypes.StringType)
                                .add("place", DataTypes.StringType)
                                .add("title", DataTypes.StringType)
                                .add("pubDate", DataTypes.StringType)
                ));
    }
}
