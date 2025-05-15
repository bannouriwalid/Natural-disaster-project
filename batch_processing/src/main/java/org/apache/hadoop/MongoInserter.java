package org.apache.hadoop;

import com.mongodb.MongoClient;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import org.bson.Document;
import org.apache.hadoop.fs.FileSystem;
import org.apache.hadoop.fs.Path;
import org.apache.hadoop.conf.Configuration;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.IOException;
import java.net.URI;

public class MongoInserter {
    public static void insertOutputToMongo(String outputPath, String filename) {
        MongoClient mongoClient = null;

        try {
            mongoClient = new MongoClient("mongo-server", 27017);
            MongoDatabase db = mongoClient.getDatabase("disasterDB");

            // Set up HDFS Configuration and FileSystem
            Configuration conf = new Configuration();
            FileSystem fs = FileSystem.get(URI.create("hdfs://hadoop-master:9000"), conf);  // Adjust URI if needed

            Path outFilePath = new Path(outputPath + "/part-r-00000");

            int maxRetries = 30;
            int retries = 0;
            while (!fs.exists(outFilePath) && retries < maxRetries) {
                System.out.println("Waiting for file: " + outFilePath.toString());
                Thread.sleep(1000);  // wait 1 second
                retries++;
            }

            if (!fs.exists(outFilePath)) {
                System.err.println("File not found after waiting: " + outFilePath.toString());
                return;
            }

            MongoCollection<Document> collection;
            int dotIndex = filename.lastIndexOf('.');
            collection = db.getCollection(filename.substring(0, dotIndex));

            // Reading the file using HDFS InputStream
            BufferedReader br = new BufferedReader(new InputStreamReader(fs.open(outFilePath)));
            String line;
            while ((line = br.readLine()) != null) {
                try {
                    Document doc = Document.parse(line);
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
