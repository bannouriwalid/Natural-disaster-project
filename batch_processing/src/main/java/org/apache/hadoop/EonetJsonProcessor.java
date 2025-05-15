package org.apache.hadoop;

import org.apache.hadoop.mapper.EonetJsonMapper;
import org.apache.hadoop.reducer.EonetJsonReducer;

import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.fs.Path;
import org.apache.hadoop.io.Text;
import org.apache.hadoop.mapreduce.Job;
import org.apache.hadoop.mapreduce.lib.input.TextInputFormat;
import org.apache.hadoop.mapreduce.lib.output.TextOutputFormat;

public class EonetJsonProcessor {

    public static Job configureJob(Configuration conf, String inputPath, String outputPath) throws Exception {
        Job job = Job.getInstance(conf, "JSON Batch Processing");
        job.setJarByClass(EonetJsonProcessor.class);

        job.setMapperClass(EonetJsonMapper.class);
        job.setReducerClass(EonetJsonReducer.class);

        job.setInputFormatClass(TextInputFormat.class);
        job.setOutputFormatClass(TextOutputFormat.class);

        TextInputFormat.addInputPath(job, new Path(inputPath));
        TextOutputFormat.setOutputPath(job, new Path(outputPath));

        job.setOutputKeyClass(Text.class);
        job.setOutputValueClass(Text.class);

        return job;
    }
}

