package org.example;

import org.apache.http.client.fluent.Request;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerRecord;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Properties;

public class NasaEonetProducer {

    private static  final Integer EONET_FREQUENCY = 60 * 60 * 1000; // 1 hour
    private static final String KAFKA_TOPIC = "eonet-stream";

    public static void main(String[] args) throws Exception {
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusMonths(1);
        DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE;

        String EONET_API_URL = "https://eonet.gsfc.nasa.gov/api/v3/events?start=" + startDate.format(formatter) + "&end=" + endDate.format(formatter);

        // Kafka configuration
        Properties props = new Properties();
        props.put("bootstrap.servers", "localhost:9092");
        props.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        props.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");

        // Increase max.request.size to 10MB (for example)
        props.put("max.request.size", 5242880); // 5MB
        props.put("buffer.memory", 67108864); // 64MB

        KafkaProducer<String, String> producer = new KafkaProducer<>(props);

        while (true) {
            try {
                String response = Request.Get(EONET_API_URL)
                        .connectTimeout(10000)
                        .socketTimeout(60000)
                        .execute()
                        .returnContent()
                        .asString();

                producer.send(new ProducerRecord<>(KAFKA_TOPIC, null, response), (metadata, exception) -> {
                    if (exception != null) {
                        System.err.println("Error sending message: " + exception.getMessage());
                    }
                });
                System.out.println("✅ Données NASA EONET envoyées à Kafka");

            } catch (Exception e) {
                System.err.println("❌ Erreur EONET : " + e.getMessage());
            }
            finally {
                System.out.println("Attendre " + EONET_FREQUENCY / 1000 + " sencondes");
            }

            Thread.sleep(EONET_FREQUENCY); // toutes les 60s
        }
    }
}

