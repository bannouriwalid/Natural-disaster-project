package org.apache.hadoop;

import org.apache.hadoop.mapper.UsgsCsvMapper;
import org.apache.hadoop.reducer.UsgsCsvReducer;
import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.Path;
import org.apache.hadoop.mapreduce.Job;
import org.apache.hadoop.mapreduce.lib.input.TextInputFormat;
import org.apache.hadoop.mapreduce.lib.output.TextOutputFormat;

public class UsgsCsvProcessor {
    public static Job configureJob(Configuration conf, String inputPath, String outputPath) throws Exception {
        Job job = Job.getInstance(conf, "CSV Batch Processing");
        job.setJarByClass(UsgsCsvProcessor.class);

        job.setMapperClass(UsgsCsvMapper.class);
        job.setReducerClass(UsgsCsvReducer.class);

        job.setInputFormatClass(TextInputFormat.class);
        job.setOutputFormatClass(TextOutputFormat.class);

        TextInputFormat.addInputPath(job, new Path(inputPath));
        TextOutputFormat.setOutputPath(job, new Path(outputPath));

        job.setOutputKeyClass(org.apache.hadoop.io.Text.class);
        job.setOutputValueClass(org.apache.hadoop.io.Text.class);

        return job;
    }
}
