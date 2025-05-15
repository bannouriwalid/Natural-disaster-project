package org.example.processing;

import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.functions;
import org.apache.spark.sql.Column;
import org.apache.spark.sql.types.*;

import static org.apache.spark.sql.functions.*;

public class EONETProcessor {

    public Dataset<Row> process(Dataset<Row> kafkaDF) {
        // Step 1: Read value column (as JSON string)
        Dataset<Row> jsonDF = kafkaDF.selectExpr("CAST(value AS STRING) as json");

        // Step 2: Extract the "events" array and explode
        Dataset<Row> explodedEvents = jsonDF
                .select(from_json(col("json"), schema()).as("root"))
                .selectExpr("explode(root.events) as event");

        // Step 3: Explode geometry and select required fields
        Dataset<Row> flattened = explodedEvents
                .selectExpr("event.title as place",
                        "event.description",
                        "event.categories[0].title as type",
                        "event.geometry as geometries")
                .withColumn("geometry", explode(col("geometries")))
                .selectExpr(
                        "place",
                        "description",
                        "type",
                        "geometry.date as time",
                        "geometry.magnitudeValue as magnitude_value",
                        "geometry.magnitudeUnit as magnitude_unit",
                        "geometry.coordinates[0] as longitude",
                        "geometry.coordinates[1] as latitude"
                )
                .withColumn("source", lit("EONET"))
                .withColumn("id", sha2(concat_ws(":", col("place"), col("time"), col("type")), 256));

        return flattened;
    }

    private StructType schema() {
        return new StructType()
                .add("events", DataTypes.createArrayType(new StructType()
                        .add("title", DataTypes.StringType)
                        .add("description", DataTypes.StringType)
                        .add("categories", DataTypes.createArrayType(
                                new StructType()
                                        .add("title", DataTypes.StringType)
                        ))
                        .add("geometry", DataTypes.createArrayType(
                                new StructType()
                                        .add("date", DataTypes.StringType)
                                        .add("type", DataTypes.StringType)
                                        .add("magnitudeValue", DataTypes.DoubleType)
                                        .add("magnitudeUnit", DataTypes.StringType)
                                        .add("coordinates", DataTypes.createArrayType(DataTypes.DoubleType))
                        ))
                ));
    }
}
