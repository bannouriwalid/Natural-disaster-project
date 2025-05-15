package org.example;
import org.apache.http.client.fluent.Request;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerRecord;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Properties;


public class UsgsEarthquakeProducer {

    private static final String KAFKA_TOPIC = "usgs-stream";
    private static final String USGS_BASE_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson";
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private static final int CHUNK_DAYS = 3; // step for historical
    private static final int REALTIME_FREQ_MS = 5 * 60 * 1000; // 5 minutes

    public static void main(String[] args) throws Exception {
        // Kafka producer config
        Properties props = new Properties();
        props.put("bootstrap.servers", "localhost:9092");
        props.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        props.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        props.put("max.request.size", "8000000"); // allow larger requests
        KafkaProducer<String, String> producer = new KafkaProducer<>(props);

        // Step 1: Stream historical data from 1 month ago until now
        LocalDate start = LocalDate.now().minusMonths(1);
        LocalDate end = LocalDate.now();
        LocalDate current = start;

        while (!current.isAfter(end)) {
            LocalDate chunkEnd = current.plusDays(CHUNK_DAYS);
            if (chunkEnd.isAfter(end)) chunkEnd = end;

            String url = USGS_BASE_URL + "&starttime=" + current.format(FORMATTER)
                    + "&endtime=" + chunkEnd.format(FORMATTER);

            try {
                System.out.println("📦 Fetching data from " + current + " to " + chunkEnd);
                String response = Request.Get(url)
                        .connectTimeout(10000)
                        .socketTimeout(30000)
                        .execute()
                        .returnContent()
                        .asString();

                producer.send(new ProducerRecord<>(KAFKA_TOPIC, null, response));
                producer.flush();
                System.out.println("✅ Data sent to Kafka");

            } catch (Exception e) {
                System.err.println("❌ Error fetching data: " + e.getMessage());
            }

            current = chunkEnd.plusDays(1);  // ✅ Ensure we move forward
            Thread.sleep(5000);
        }

        // Step 2: Switch to live polling (every hour)
        while (true) {
            LocalDate today = LocalDate.now();
            String realtimeUrl = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson";

            try {
                System.out.println("⏱ Fetching real-time data...");
                String response = Request.Get(realtimeUrl)
                        .connectTimeout(10000)
                        .socketTimeout(10000)
                        .execute()
                        .returnContent()
                        .asString();

                producer.send(new ProducerRecord<>(KAFKA_TOPIC, null, response));
                producer.flush();
                System.out.println("✅ Real-time data sent");

            } catch (Exception e) {
                System.err.println("❌ Real-time fetch error: " + e.getMessage());
            }

            System.out.println("Attendre " + REALTIME_FREQ_MS / 1000 + " sencondes");
            Thread.sleep(REALTIME_FREQ_MS);
        }
    }
}
