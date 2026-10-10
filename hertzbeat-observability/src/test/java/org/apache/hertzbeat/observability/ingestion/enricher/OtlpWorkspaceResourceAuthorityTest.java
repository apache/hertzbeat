/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.ingestion.enricher;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest;
import io.opentelemetry.proto.common.v1.AnyValue;
import io.opentelemetry.proto.common.v1.KeyValue;
import io.opentelemetry.proto.logs.v1.LogRecord;
import io.opentelemetry.proto.logs.v1.ResourceLogs;
import io.opentelemetry.proto.logs.v1.ScopeLogs;
import io.opentelemetry.proto.metrics.v1.ResourceMetrics;
import io.opentelemetry.proto.metrics.v1.ScopeMetrics;
import io.opentelemetry.proto.resource.v1.Resource;
import io.opentelemetry.proto.trace.v1.ResourceSpans;
import io.opentelemetry.proto.trace.v1.ScopeSpans;
import io.opentelemetry.proto.trace.v1.Span;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;
import org.apache.hertzbeat.observability.ingestion.semantic.OtlpResourceSemanticAttributes;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

class OtlpWorkspaceResourceAuthorityTest {

    private static final String TRUSTED_WORKSPACE = "team-a";
    private static final Set<String> RESERVED_WORKSPACE_KEYS = Set.of(
            "hertzbeat.workspace_id",
            "hertzbeat_workspace_id",
            "workspace.id",
            "workspace_id"
    );

    private final OtlpCorrelationEnricher enricher = new OtlpCorrelationEnricher();

    @ParameterizedTest(name = "{0}")
    @MethodSource("protocolSignalCases")
    void authenticatedWorkspaceReplacesEveryAliasAndDuplicateBeforeForwarding(ProtocolSignal protocolSignal)
            throws Exception {
        List<KeyValue> attributes = protocolSignal.enrich(enricher, untrustedResource());

        List<KeyValue> workspaceAttributes = attributes.stream()
                .filter(attribute -> RESERVED_WORKSPACE_KEYS.contains(attribute.getKey()))
                .toList();
        assertEquals(1, workspaceAttributes.size());
        assertEquals(OtlpResourceSemanticAttributes.HERTZBEAT_WORKSPACE_ID,
                workspaceAttributes.getFirst().getKey());
        assertEquals(TRUSTED_WORKSPACE, workspaceAttributes.getFirst().getValue().getStringValue());
        assertFalse(attributes.stream().anyMatch(attribute -> "team-b".equals(attribute.getValue().getStringValue())));
    }

    private static Stream<ProtocolSignal> protocolSignalCases() {
        return Stream.of(ProtocolSignal.values());
    }

    private static Resource untrustedResource() {
        return Resource.newBuilder()
                .addAttributes(stringAttribute("service.name", "checkout"))
                .addAttributes(stringAttribute("hertzbeat.workspace_id", "spoof-first"))
                .addAttributes(stringAttribute("workspace.id", "team-b"))
                .addAttributes(stringAttribute("workspace_id", "team-b"))
                .addAttributes(stringAttribute("hertzbeat_workspace_id", "team-b"))
                .addAttributes(stringAttribute("hertzbeat.workspace_id", "spoof-last"))
                .build();
    }

    private static KeyValue stringAttribute(String key, String value) {
        return KeyValue.newBuilder()
                .setKey(key)
                .setValue(AnyValue.newBuilder().setStringValue(value).build())
                .build();
    }

    private static OtlpCorrelationContext trustedContext() {
        return new OtlpCorrelationContext(null, null, null, TRUSTED_WORKSPACE);
    }

    private static HttpHeaders protobufHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/x-protobuf"));
        return headers;
    }

    private enum ProtocolSignal {
        HTTP_METRICS {
            @Override
            List<KeyValue> enrich(OtlpCorrelationEnricher enricher, Resource resource) throws Exception {
                ExportMetricsServiceRequest request = metricsRequest(resource);
                ExportMetricsServiceRequest decoded = ExportMetricsServiceRequest.parseFrom(request.toByteArray());
                return metricAttributes(enricher.enrichMetrics(decoded, trustedContext()));
            }
        },
        GRPC_METRICS {
            @Override
            List<KeyValue> enrich(OtlpCorrelationEnricher enricher, Resource resource) {
                return metricAttributes(enricher.enrichMetrics(metricsRequest(resource), trustedContext()));
            }
        },
        HTTP_LOGS {
            @Override
            List<KeyValue> enrich(OtlpCorrelationEnricher enricher, Resource resource) throws Exception {
                byte[] result = enricher.enrichLogsHttp(
                        logsRequest(resource).toByteArray(), protobufHeaders(), trustedContext());
                return logAttributes(ExportLogsServiceRequest.parseFrom(result));
            }
        },
        GRPC_LOGS {
            @Override
            List<KeyValue> enrich(OtlpCorrelationEnricher enricher, Resource resource) {
                return logAttributes(enricher.enrichLogs(logsRequest(resource), trustedContext()));
            }
        },
        HTTP_TRACES {
            @Override
            List<KeyValue> enrich(OtlpCorrelationEnricher enricher, Resource resource) throws Exception {
                byte[] result = enricher.enrichTracesHttp(
                        traceRequest(resource).toByteArray(), protobufHeaders(), trustedContext());
                return traceAttributes(ExportTraceServiceRequest.parseFrom(result));
            }
        },
        GRPC_TRACES {
            @Override
            List<KeyValue> enrich(OtlpCorrelationEnricher enricher, Resource resource) {
                return traceAttributes(enricher.enrichTraces(traceRequest(resource), trustedContext()));
            }
        };

        abstract List<KeyValue> enrich(OtlpCorrelationEnricher enricher, Resource resource) throws Exception;
    }

    private static ExportMetricsServiceRequest metricsRequest(Resource resource) {
        return ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .setResource(resource)
                        .addScopeMetrics(ScopeMetrics.getDefaultInstance()))
                .build();
    }

    private static ExportLogsServiceRequest logsRequest(Resource resource) {
        return ExportLogsServiceRequest.newBuilder()
                .addResourceLogs(ResourceLogs.newBuilder()
                        .setResource(resource)
                        .addScopeLogs(ScopeLogs.newBuilder().addLogRecords(LogRecord.getDefaultInstance())))
                .build();
    }

    private static ExportTraceServiceRequest traceRequest(Resource resource) {
        return ExportTraceServiceRequest.newBuilder()
                .addResourceSpans(ResourceSpans.newBuilder()
                        .setResource(resource)
                        .addScopeSpans(ScopeSpans.newBuilder().addSpans(Span.getDefaultInstance())))
                .build();
    }

    private static List<KeyValue> metricAttributes(ExportMetricsServiceRequest request) {
        return request.getResourceMetrics(0).getResource().getAttributesList();
    }

    private static List<KeyValue> logAttributes(ExportLogsServiceRequest request) {
        return request.getResourceLogs(0).getResource().getAttributesList();
    }

    private static List<KeyValue> traceAttributes(ExportTraceServiceRequest request) {
        return request.getResourceSpans(0).getResource().getAttributesList();
    }
}
