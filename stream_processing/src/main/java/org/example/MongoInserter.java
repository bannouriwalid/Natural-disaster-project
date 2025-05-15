package org.example;

import com.mongodb.client.*;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.bson.Document;
import com.mongodb.MongoClient;
import java.util.ArrayList;
import java.util.List;

public class MongoInserter {
    private static final String DB_NAME = "streaming_data";

    public static void insert(Dataset<Row> df, String topic) {
        MongoClient mongoClient = null;
        String collectionName = topic.replace("-stream", "");

        try {
            mongoClient = new MongoClient("mongo-server", 27017);
            // mongoClient = new MongoClient("localhost", 27017);
            MongoDatabase db = mongoClient.getDatabase(DB_NAME);
            MongoCollection<Document> collection = db.getCollection(collectionName);

            List<Document> toInsert = new ArrayList<>();

            for (Row row : df.collectAsList()) {
                Document doc = new Document();
                Document filter = new Document();

                switch (topic.toLowerCase()) {
                    case "usgs-stream":
                        doc.append("_id", row.getAs("id"))
                                .append("magnitude", row.getAs("magnitude"))
                                .append("place", row.getAs("place"))
                                .append("time", row.getAs("time").toString())
                                .append("updated", row.getAs("updated").toString())
                                .append("source", row.getAs("source"))
                                .append("type", row.getAs("type"))
                                .append("magnitude_type", row.getAs("magnitude_type"))
                                .append("latitude", row.getAs("latitude"))
                                .append("longitude", row.getAs("longitude"))
                                .append("tsunami", row.getAs("tsunami"));

                        filter.append("_id", row.getAs("id"));
                        break;

                    case "eonet-stream":
                        doc.append("_id", row.getAs("id"))
                                .append("magnitude_value", row.getAs("magnitude_value"))
                                .append("place", row.getAs("place"))
                                .append("time", row.getAs("time").toString())
                                .append("type", row.getAs("type"))
                                .append("magnitude_unit", row.getAs("magnitude_unit"))
                                .append("latitude", row.getAs("latitude"))
                                .append("longitude", row.getAs("longitude"))
                                .append("source", row.getAs("source"))
                                .append("description", row.getAs("description"));

                        filter.append("_id", row.getAs("id"));
                        break;

                    case "gdacs-stream":
                        doc.append("_id", row.getAs("id"))
                                .append("type", row.getAs("type"))
                                .append("place", row.getAs("place"))
                                .append("date_time", row.getAs("date_time").toString())
                                .append("source", row.getAs("source"))
                                .append("alert_level", row.getAs("alert_level"))
                                .append("description", row.getAs("description"))
                                .append("latitude", row.getAs("latitude"))
                                .append("longitude", row.getAs("longitude"));

                        String type = row.getAs("type");
                        if ("earthquake".equalsIgnoreCase(type)) {
                            doc.append("magnitude", row.getAs("magnitude"))
                                    .append("depth", row.getAs("depth"));
                        } else if ("wildfire".equalsIgnoreCase(type)) {
                            doc.append("magnitude_value_in_ha", row.getAs("magnitude_value_in_ha"));
                        } else if ("drought".equalsIgnoreCase(type)) {
                            doc.append("magnitude_value_in_Km2", row.getAs("magnitude_value_in_km2"));
                        }

                        filter.append("_id", row.getAs("id"));
                        break;

                    default:
                        System.out.println("Unsupported topic schema: " + topic);
                        return;
                }

                if (collection.find(filter).first() == null) {
                    toInsert.add(doc);
                }
            }

            if (!toInsert.isEmpty()) {
                collection.insertMany(toInsert);
                System.out.println("Insertion into " + collectionName + " done.");
            } else {
                System.out.println("No new documents to insert into " + collectionName + ".");
            }

        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (mongoClient != null) {
                mongoClient.close();
            }
        }
    }
}
