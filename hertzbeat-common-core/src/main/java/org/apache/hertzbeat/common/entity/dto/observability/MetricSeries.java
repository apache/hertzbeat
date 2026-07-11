/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.common.entity.dto.observability;

import java.util.List;
import java.util.Map;

/**
 * OTLP metric time series.
 *
 * @param labels series labels
 * @param points ordered samples
 */
public record MetricSeries(Map<String, String> labels, List<MetricPoint> points) {
}
