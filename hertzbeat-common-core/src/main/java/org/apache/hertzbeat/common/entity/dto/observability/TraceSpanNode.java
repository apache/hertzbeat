/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.common.entity.dto.observability;

import java.util.List;
import java.util.Map;

/** Trace span used by the Angular waterfall. */
public record TraceSpanNode(String traceId, String spanId, String parentSpanId, String spanName,
                            String serviceName, String status, String spanKind, String statusMessage,
                            long durationNanos, long startTime, Map<String, String> resourceAttributes,
                            Map<String, String> spanAttributes, List<TraceSpanEvent> spanEvents) {
}
