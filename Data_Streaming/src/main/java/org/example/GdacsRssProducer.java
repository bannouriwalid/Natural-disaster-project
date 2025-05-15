package org.example;

import org.apache.http.client.fluent.Request;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.w3c.dom.*;
import org.xml.sax.InputSource;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.StringReader;
import java.util.*;
import java.util.Properties;
import org.json.JSONObject;
import org.json.JSONArray;

public class GdacsRssProducer {

    private static final Integer GDACS_FREQUENCY = 60 * 60 * 1000; // 1 hour
    private static final String KAFKA_TOPIC = "gdacs-stream";
    private static final String GDACS_RSS_URL = "https://www.gdacs.org/xml/rss.xml";

    public static void main(String[] args) throws Exception {
        // Kafka configuration
        Properties props = new Properties();
        props.put("bootstrap.servers", "localhost:9092");
        props.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        props.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");

        KafkaProducer<String, String> producer = new KafkaProducer<>(props);

        while (true) {
            try {
                // Fetch RSS feed
                String response = Request.Get(GDACS_RSS_URL)
                        .connectTimeout(10000)
                        .socketTimeout(10000)
                        .execute()
                        .returnContent()
                        .asString();

                // Parse XML and extract alerts
                JSONArray alerts = extractAlertsAsJson(response);

                // Wrap into a final JSON object (optional)
                JSONObject result = new JSONObject();
                result.put("alerts", alerts);

                // Send to Kafka
                producer.send(new ProducerRecord<>(KAFKA_TOPIC, null, result.toString()));
                System.out.println("✅ Données GDACS envoyées à Kafka");

            } catch (Exception e) {
                System.err.println("❌ Erreur GDACS : " + e.getMessage());
            }

            System.out.println("Attendre " + GDACS_FREQUENCY / 1000 + " secondes");
            Thread.sleep(GDACS_FREQUENCY);
        }
    }

    private static JSONArray extractAlertsAsJson(String xmlContent) throws Exception {
        JSONArray alertList = new JSONArray();

        DocumentBuilderFactory dbFactory = DocumentBuilderFactory.newInstance();
        dbFactory.setNamespaceAware(true);
        DocumentBuilder dBuilder = dbFactory.newDocumentBuilder();

        String cleanedXml = xmlContent.trim().replaceFirst("^([\\W]+)<", "<");
        Document doc = dBuilder.parse(new InputSource(new StringReader(cleanedXml)));

        doc.getDocumentElement().normalize();

        NodeList items = doc.getElementsByTagName("item");

        for (int i = 0; i < items.getLength(); i++) {
            Node item = items.item(i);
            if (item.getNodeType() == Node.ELEMENT_NODE) {
                JSONObject alertJson = new JSONObject();
                Element element = (Element) item;

                alertJson.put("title", getTagValue("title", element));
                alertJson.put("description", getTagValue("description", element));
                alertJson.put("link", getTagValue("link", element));
                alertJson.put("pubDate", getTagValue("pubDate", element));
                alertJson.put("eventtype", getTagValue("gdacs:eventtype", element));
                alertJson.put("alertlevel", getTagValue("gdacs:alertlevel", element));
                alertJson.put("latitude", getTagValue("geo:lat", element));
                alertJson.put("longitude", getTagValue("geo:long", element));
                alertJson.put("severity", getTagValue("gdacs:severity", element));
                alertJson.put("place", getTagValue("gdacs:country", element));
                alertList.put(alertJson);
            }
        }
        return alertList;
    }

    private static String getTagValue(String tag, Element element) {
        try {
            String[] parts = tag.split(":");
            String tagName = parts.length > 1 ? parts[1] : parts[0];
            NodeList nodes = element.getElementsByTagNameNS("*", tagName);
            if (nodes.getLength() > 0 && nodes.item(0).getTextContent() != null) {
                return nodes.item(0).getTextContent();
            }
        } catch (Exception ignored) {}
        return "";
    }
}
