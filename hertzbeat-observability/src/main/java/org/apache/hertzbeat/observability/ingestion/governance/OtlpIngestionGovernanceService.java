/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.ingestion.governance;

import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest;
import io.opentelemetry.proto.common.v1.AnyValue;
import io.opentelemetry.proto.common.v1.KeyValue;
import io.opentelemetry.proto.logs.v1.ResourceLogs;
import io.opentelemetry.proto.metrics.v1.ResourceMetrics;
import io.opentelemetry.proto.resource.v1.Resource;
import io.opentelemetry.proto.trace.v1.ResourceSpans;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Set;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.observability.ingestion.semantic.OtlpResourceSemanticAttributes;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Shared OTLP ingest governance policy boundary.
 */
@Service
public class OtlpIngestionGovernanceService {

    private static final String SERVICE_NAME = OtlpResourceSemanticAttributes.SERVICE_NAME;

    private final Set<String> droppedServiceNames;

    @Autowired
    public OtlpIngestionGovernanceService(
            @Value("${hertzbeat.otlp.ingestion.drop-service-names:}") String dropServiceNames) {
        this.droppedServiceNames = parseValues(dropServiceNames);
    }

    public Decision evaluateMetrics(String protocol, ExportMetricsServiceRequest request) {
        if (request == null) {
            return Decision.allow();
        }
        for (ResourceMetrics resourceMetrics : request.getResourceMetricsList()) {
            Decision decision = evaluateServiceName("metrics", protocol, resourceMetrics.getResource());
            if (decision.dropped()) {
                return decision;
            }
        }
        return Decision.allow();
    }

    public Decision evaluateLogs(String protocol, ExportLogsServiceRequest request) {
        if (request == null) {
            return Decision.allow();
        }
        for (ResourceLogs resourceLogs : request.getResourceLogsList()) {
            Decision decision = evaluateServiceName("logs", protocol, resourceLogs.getResource());
            if (decision.dropped()) {
                return decision;
            }
        }
        return Decision.allow();
    }

    public Decision evaluateTraces(String protocol, ExportTraceServiceRequest request) {
        if (request == null) {
            return Decision.allow();
        }
        for (ResourceSpans resourceSpans : request.getResourceSpansList()) {
            Decision decision = evaluateServiceName("traces", protocol, resourceSpans.getResource());
            if (decision.dropped()) {
                return decision;
            }
        }
        return Decision.allow();
    }

    private Decision evaluateServiceName(String signal, String protocol, Resource resource) {
        String serviceName = serviceName(resource);
        if (!droppedServiceNames.contains(serviceName)) {
            return Decision.allow();
        }
        return Decision.drop("OTLP " + dimension(signal) + " " + dimension(protocol)
                + " dropped by governance policy: service.name=" + serviceName);
    }

    private String serviceName(Resource resource) {
        if (resource == null) {
            return null;
        }
        for (KeyValue attribute : resource.getAttributesList()) {
            if (SERVICE_NAME.equals(attribute.getKey())) {
                return stringValue(attribute.getValue());
            }
        }
        return null;
    }

    private String stringValue(AnyValue value) {
        if (value == null || !value.hasStringValue()) {
            return null;
        }
        return StringUtils.trimToNull(value.getStringValue());
    }

    private Set<String> parseValues(String values) {
        Set<String> parsedValues = new LinkedHashSet<>();
        if (StringUtils.isBlank(values)) {
            return parsedValues;
        }
        Arrays.stream(values.split("[,;]"))
                .map(StringUtils::trimToNull)
                .filter(value -> value != null)
                .forEach(parsedValues::add);
        return parsedValues;
    }

    private String dimension(String value) {
        return StringUtils.defaultIfBlank(StringUtils.trimToNull(value), "signal");
    }

    /**
     * Governance policy decision for a decoded OTLP batch.
     */
    public record Decision(boolean dropped, String reason) {

        public static Decision allow() {
            return new Decision(false, null);
        }

        public static Decision drop(String reason) {
            return new Decision(true, reason);
        }
    }
}
