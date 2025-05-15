package org.apache.hadoop;

import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.mapreduce.Job;

import java.io.File;
import java.util.UUID;

public class MainDispatcher {
    public static void main(String[] args) throws Exception {
        if (args.length < 1) {
            System.err.println("Usage: MainDispatcher <input file path>");
            System.exit(-1);
        }

        String inputPath = args[0];
        File inputFile = new File(inputPath);
        String parentDir = inputFile.getParent();
        String baseName = inputFile.getName();

        // Generate UUID
        String uuid = UUID.randomUUID().toString();

        // Build output directory
        String outputFolderName = "output_" + baseName + "_" + uuid;
        String outputPath = new File(parentDir, outputFolderName).getAbsolutePath();

        Configuration conf = new Configuration();

        Job job;

        if (inputPath.endsWith(".csv")) {
            job = UsgsCsvProcessor.configureJob(conf, inputPath, outputPath);
        } else if (inputPath.endsWith(".json")) {
            job = EonetJsonProcessor.configureJob(conf, inputPath, outputPath);
        } else {
            System.err.println("Unsupported file type. Must be .csv or .json");
            return;
        }

        boolean success = job.waitForCompletion(true);

        if (success) {
            MongoInserter.insertOutputToMongo(outputPath, baseName);
        }

        System.exit(success ? 0 : 1);
    }
}
