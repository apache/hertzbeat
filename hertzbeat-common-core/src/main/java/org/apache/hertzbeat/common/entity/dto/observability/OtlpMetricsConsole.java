/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.common.entity.dto.observability;

import java.util.List;

/**
 * OTLP metrics query result.
 *
 * @param query effective PromQL expression
 * @param start query start in epoch milliseconds
 * @param end query end in epoch milliseconds
 * @param stepSeconds query resolution
 * @param series returned time series
 */
public record OtlpMetricsConsole(String query, long start, long end, int stepSeconds, List<MetricSeries> series) {
}
