package org.example.processing;

import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;

public interface EventProcessor {
    Dataset<Row> process(Dataset<Row> inputDF);
}
