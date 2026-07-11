/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.common.entity.dto.observability;

import java.util.Map;

/** Trace summary row. */
public record TraceListItem(String traceId, String rootSpanId, String serviceName, String serviceNamespace,
                            String rootSpanName, long durationNanos, String status, long startTime,
                            int errorSpanCount, Map<String, String> resourceAttributes) {
}
