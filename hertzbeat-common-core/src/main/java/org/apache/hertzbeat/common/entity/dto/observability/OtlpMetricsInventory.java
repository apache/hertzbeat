/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.common.entity.dto.observability;

import java.util.List;

/**
 * Discoverable OTLP metric names.
 *
 * @param metricNames sorted metric names
 */
public record OtlpMetricsInventory(List<String> metricNames) {
}
