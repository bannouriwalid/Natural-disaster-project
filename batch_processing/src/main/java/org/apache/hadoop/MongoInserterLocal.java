package org.apache.hadoop;

import com.mongodb.MongoClient;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import org.bson.Document;

import java.io.*;
import java.nio.file.*;

public class MongoInserterLocal {
    public static void insertOutputToMongo(String outputPath, String filename) {
        MongoClient mongoClient = null;

        try {
            mongoClient = new MongoClient("localhost", 27017);
            MongoDatabase db = mongoClient.getDatabase("disasterDB");

            Path outFile = Paths.get(outputPath + "/part-r-00000");
            MongoCollection<Document> collection;

            int dotIndex = filename.lastIndexOf('.');
            collection = db.getCollection(filename.substring(0, dotIndex));

            BufferedReader br = Files.newBufferedReader(outFile);
            String line;
            while ((line = br.readLine()) != null) {
                try {
                    Document doc = Document.parse(line);  // line IS the JSON string
                    collection.insertOne(doc);
                } catch (Exception e) {
                    System.err.println("Failed to insert line: " + line);
                    e.printStackTrace();
                }
            }
            br.close();
            System.out.println("Insertion into MongoDB done.");

        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (mongoClient != null) {
                mongoClient.close();
            }
        }
    }
}