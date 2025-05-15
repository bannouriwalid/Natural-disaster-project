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

public class USGSProcessor {

    // Mapping of magType codes to verbose names
    private static final Map<String, String> magTypeMap = new HashMap<>();
    static {
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

    // UDF to convert magType codes to verbose strings
    private static UDF1<String, String> mapMagTypeUDF = (String code) ->
            code != null && magTypeMap.containsKey(code.toLowerCase())
                    ? magTypeMap.get(code.toLowerCase())
                    : code;

    // Method to process the USGS stream data
    public Dataset<Row> process(Dataset<Row> usgsStream) {
        SparkSession spark = usgsStream.sparkSession();

        // Register the UDF (only once)
        spark.udf().register("mapMagType", mapMagTypeUDF, DataTypes.StringType);

        // Process and flatten the stream
        return usgsStream
                .selectExpr("CAST(value AS STRING) AS json_data")
                .select(functions.from_json(functions.col("json_data"), getUSGSSchema()).as("data"))
                .selectExpr("explode(data.features) as feature")
                .select(
                        functions.col("feature.properties.mag").alias("magnitude"),
                        functions.col("feature.properties.place").alias("place"),
                        functions.col("feature.properties.time")
                                .divide(1000)
                                .cast(DataTypes.TimestampType)
                                .alias("time"),
                        functions.col("feature.properties.updated")
                                .divide(1000)
                                .cast(DataTypes.TimestampType)
                                .alias("updated"),
                        functions.lit("USGS").alias("source"),
                        functions.col("feature.type").alias("type"),
                        functions.callUDF("mapMagType", functions.col("feature.properties.magType")).alias("magnitude_type"),
                        functions.col("feature.geometry.coordinates").getItem(1).alias("latitude"),
                        functions.col("feature.geometry.coordinates").getItem(0).alias("longitude"),
                        functions.col("feature.properties.tsunami").alias("tsunami"),
                        // Generate unique id using sha2 on place, time, and type
                        functions.sha2(functions.concat_ws(":", functions.col("feature.properties.place"), functions.col("feature.properties.time"), functions.col("feature.type")), 256).alias("id")
                );
    }

    // Schema for parsing the JSON structure
    private StructType getUSGSSchema() {
        return new StructType()
                .add("features", DataTypes.createArrayType(
                        new StructType()
                                .add("type", DataTypes.StringType)
                                .add("properties", new StructType()
                                        .add("mag", DataTypes.DoubleType)
                                        .add("place", DataTypes.StringType)
                                        .add("time", DataTypes.LongType)
                                        .add("updated", DataTypes.LongType)
                                        .add("tsunami", DataTypes.IntegerType)
                                        .add("magType", DataTypes.StringType)
                                )
                                .add("geometry", new StructType()
                                        .add("coordinates", DataTypes.createArrayType(DataTypes.DoubleType))
                                )
                ));
    }
}
