package org.example;

import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.streaming.StreamingQuery;
import org.example.processing.USGSProcessor;
import org.example.processing.EONETProcessor;
import org.example.processing.GDACSProcessor;


public class MainStreamingApp {

    public static void main(String[] args) throws Exception {
        SparkSession spark = SparkSession.builder()
                .appName("Kafka Spark Streaming to MongoDB")
                //.master("local[*]") // Local mode for development
                .getOrCreate();

        // Read from Kafka
        Dataset<Row> kafkaDF = KafkaStreamReader.readFromKafka(spark);

        // Filter and process USGS stream
        Dataset<Row> usgsStream = kafkaDF.filter("topic = 'usgs-stream'");
        Dataset<Row> processedUSGS = new USGSProcessor().process(usgsStream);
        StreamingQuery usgsQuery = processedUSGS.writeStream()
                .foreachBatch((batchDF, batchId) -> {
                    batchDF.show(false);
                    MongoInserter.insert(batchDF, "usgs-stream");
                })
                .start();

        // Filter and process EONET stream
        Dataset<Row> eonetStream = kafkaDF.filter("topic = 'eonet-stream'");
        Dataset<Row> processedEONET = new EONETProcessor().process(eonetStream);
        StreamingQuery eonetQuery = processedEONET.writeStream()
                .foreachBatch((batchDF, batchId) -> {
                    batchDF.show(false);
                    MongoInserter.insert(batchDF, "eonet-stream");
                })
                .start();

        // Filter and process GDACS stream
        Dataset<Row> gdacsStream = kafkaDF.filter("topic = 'gdacs-stream'");
        Dataset<Row> processedGDACS = new GDACSProcessor().process(gdacsStream);
        StreamingQuery gdacsQuery = processedGDACS.writeStream()
                .foreachBatch((batchDF, batchId) -> {
                    batchDF.show(false);
                    MongoInserter.insert(batchDF, "gdacs-stream");
                })
                .start();

        // Await any stream termination
        spark.streams().awaitAnyTermination();
    }
}
