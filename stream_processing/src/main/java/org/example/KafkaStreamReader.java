package org.example;

import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SparkSession;

import java.util.Arrays;

public class KafkaStreamReader {

    public static Dataset<Row> readFromKafka(SparkSession spark) {
        return spark
                .readStream()
                .format("kafka")
                .option("kafka.bootstrap.servers", "localhost:9092")
                .option("subscribe", "usgs-stream,eonet-stream,gdacs-stream")
                .option("startingOffsets", "latest")
                .load()
                .selectExpr("CAST(value AS STRING)", "topic");
    }
}