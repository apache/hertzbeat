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

package org.apache.hertzbeat.observability.ingestion.enricher;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.google.protobuf.ByteString;
import io.grpc.StatusRuntimeException;
import io.opentelemetry.proto.collector.logs.v1.ExportLogsServiceRequest;
import io.opentelemetry.proto.collector.metrics.v1.ExportMetricsServiceRequest;
import io.opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest;
import io.opentelemetry.proto.common.v1.AnyValue;
import io.opentelemetry.proto.common.v1.KeyValue;
import io.opentelemetry.proto.logs.v1.LogRecord;
import io.opentelemetry.proto.logs.v1.ResourceLogs;
import io.opentelemetry.proto.logs.v1.ScopeLogs;
import io.opentelemetry.proto.metrics.v1.ResourceMetrics;
import io.opentelemetry.proto.resource.v1.Resource;
import io.opentelemetry.proto.trace.v1.ResourceSpans;
import io.opentelemetry.proto.trace.v1.ScopeSpans;
import io.opentelemetry.proto.trace.v1.Span;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.zip.GZIPOutputStream;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

class OtlpCorrelationEnricherTest {

    private static final long LOG_TIME_NANOS = 1_710_000_000_123_456_789L;
    private static final String TRACE_ID = "0123456789abcdef0123456789abcdef";
    private static final String SPAN_ID = "0123456789abcdef";

    private final OtlpCorrelationEnricher enricher = new OtlpCorrelationEnricher();

    @Test
    void preservesExistingEventIdAndInjectsRequestIngestId() {
        ExportLogsServiceRequest request = logsRequest(List.of(logRecord("body-one",
                stringAttribute("hertzbeat.event_id", "upstream-event"))));

        ExportLogsServiceRequest enriched = enricher.enrichLogs(request,
                new OtlpCorrelationContext("ingest-1", null, null));

        Map<String, String> attributes = logAttributes(enriched, 0);
        assertEquals("upstream-event", attributes.get("hertzbeat.event_id"));
        assertEquals("upstream-event", attributes.get("log.record.uid"));
        assertEquals("ingest-1", attributes.get("hertzbeat.ingest_id"));
    }

    @Test
    void usesOpenTelemetryLogRecordUidAsEventIdentityWhenPresent() {
        ExportLogsServiceRequest request = logsRequest(List.of(logRecord("body-one",
                stringAttribute("log.record.uid", "upstream-uid"))));

        ExportLogsServiceRequest enriched = enricher.enrichLogs(request,
                new OtlpCorrelationContext("ingest-1", null, null));

        Map<String, String> attributes = logAttributes(enriched, 0);
        assertEquals("upstream-uid", attributes.get("log.record.uid"));
        assertEquals("upstream-uid", attributes.get("hertzbeat.event_id"));
    }

    @Test
    void generatesStableEventIdsFromRecordContentAndPositionWhenMissing() {
        ExportLogsServiceRequest request = logsRequest(List.of(logRecord("same-body"), logRecord("same-body")));

        ExportLogsServiceRequest first = enricher.enrichLogs(request,
                new OtlpCorrelationContext("ingest-a", null, null));
        ExportLogsServiceRequest second = enricher.enrichLogs(request,
                new OtlpCorrelationContext("ingest-b", null, null));

        String firstEventId = logAttributes(first, 0).get("hertzbeat.event_id");
        String secondEventId = logAttributes(first, 1).get("hertzbeat.event_id");
        assertFalse(firstEventId.isBlank());
        assertEquals(firstEventId, logAttributes(first, 0).get("log.record.uid"));
        assertEquals(firstEventId, logAttributes(second, 0).get("hertzbeat.event_id"));
        assertEquals(firstEventId, logAttributes(second, 0).get("log.record.uid"));
        assertEquals(secondEventId, logAttributes(second, 1).get("hertzbeat.event_id"));
        assertEquals(secondEventId, logAttributes(second, 1).get("log.record.uid"));
        assertNotEquals(firstEventId, secondEventId);
    }

    @Test
    void injectsWorkspaceAndEntityAsResourceAttributesOnlyFromRequestContextWithoutAnyLookupDependency() {
        assertDoesNotThrow(OtlpCorrelationEnricher::new);

        ExportLogsServiceRequest enriched = enricher.enrichLogs(logsRequest(List.of(logRecord("body-one"))),
                new OtlpCorrelationContext("ingest-1", "entity-1", "service", "workspace-1"));

        Map<String, String> attributes = logAttributes(enriched, 0);
        Map<String, String> resourceAttributes = resourceAttributes(enriched);
        assertFalse(attributes.containsKey("hertzbeat.entity_id"));
        assertFalse(attributes.containsKey("hertzbeat.entity_type"));
        assertFalse(attributes.containsKey("hertzbeat.workspace_id"));
        assertEquals("entity-1", resourceAttributes.get("hertzbeat.entity_id"));
        assertEquals("service", resourceAttributes.get("hertzbeat.entity_type"));
        assertEquals("workspace-1", resourceAttributes.get("hertzbeat.workspace_id"));
    }

    @Test
    void trimsCorrelationContextValuesBeforePromotingGreptimeResourceDimensionsAcrossSignals() {
        OtlpCorrelationContext context = new OtlpCorrelationContext(
                " ingest-1 ", " entity-1 ", " service ", " workspace-1 ");

        ExportLogsServiceRequest logs = enricher.enrichLogs(logsRequest(List.of(logRecord("body-one"))), context);
        ExportMetricsServiceRequest metrics = enricher.enrichMetrics(metricsRequest(), context);
        ExportTraceServiceRequest traces = enricher.enrichTraces(traceRequest(), context);

        assertEquals("ingest-1", logAttributes(logs, 0).get("hertzbeat.ingest_id"));
        assertEquals("entity-1", resourceAttributes(logs).get("hertzbeat.entity_id"));
        assertEquals("service", resourceAttributes(logs).get("hertzbeat.entity_type"));
        assertEquals("workspace-1", resourceAttributes(logs).get("hertzbeat.workspace_id"));
        assertEquals("entity-1", metricResourceAttributes(metrics).get("hertzbeat.entity_id"));
        assertEquals("service", metricResourceAttributes(metrics).get("hertzbeat.entity_type"));
        assertEquals("workspace-1", metricResourceAttributes(metrics).get("hertzbeat.workspace_id"));
        assertEquals("entity-1", traceResourceAttributes(traces).get("hertzbeat.entity_id"));
        assertEquals("service", traceResourceAttributes(traces).get("hertzbeat.entity_type"));
        assertEquals("workspace-1", traceResourceAttributes(traces).get("hertzbeat.workspace_id"));
    }

    @Test
    void normalizesGzipJsonAndProtobufPayloadsBeforeEnrichment() throws Exception {
        String jsonPayload = """
                {
                  "resourceLogs": [
                    {
                      "scopeLogs": [
                        {
                          "logRecords": [
                            {
                              "timeUnixNano": "1710000000123456789",
                              "traceId": "0123456789abcdef0123456789abcdef",
                              "spanId": "0123456789abcdef",
                              "body": {"stringValue": "json-body"}
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
                """;
        HttpHeaders jsonHeaders = new HttpHeaders();
        jsonHeaders.setContentType(MediaType.APPLICATION_JSON);
        jsonHeaders.set(HttpHeaders.CONTENT_ENCODING, "gzip");

        byte[] jsonEnriched = enricher.enrichLogsHttp(gzip(jsonPayload.getBytes(StandardCharsets.UTF_8)), jsonHeaders,
                new OtlpCorrelationContext("ingest-json", null, null));
        Map<String, String> jsonAttributes = logAttributes(ExportLogsServiceRequest.parseFrom(jsonEnriched), 0);
        assertEquals("ingest-json", jsonAttributes.get("hertzbeat.ingest_id"));
        assertFalse(jsonAttributes.get("hertzbeat.event_id").isBlank());

        ExportLogsServiceRequest protobufRequest = logsRequest(List.of(logRecord("protobuf-body")));
        HttpHeaders protobufHeaders = new HttpHeaders();
        protobufHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));
        byte[] protobufEnriched = enricher.enrichLogsHttp(protobufRequest.toByteArray(), protobufHeaders,
                new OtlpCorrelationContext("ingest-protobuf", null, null));
        Map<String, String> protobufAttributes = logAttributes(ExportLogsServiceRequest.parseFrom(protobufEnriched), 0);
        assertEquals("ingest-protobuf", protobufAttributes.get("hertzbeat.ingest_id"));
        assertFalse(protobufAttributes.get("hertzbeat.event_id").isBlank());
    }

    @Test
    void logsHttpGzipContentEncodingWithOptionalWhitespaceStillDecodesBeforeEnrichment() throws Exception {
        ExportLogsServiceRequest request = logsRequest(List.of(logRecord("protobuf-body")));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));
        requestHeaders.set(HttpHeaders.CONTENT_ENCODING, " gzip ");

        byte[] enriched = enricher.enrichLogsHttp(gzip(request.toByteArray()), requestHeaders,
                new OtlpCorrelationContext("ingest-whitespace", null, null));
        Map<String, String> attributes = logAttributes(ExportLogsServiceRequest.parseFrom(enriched), 0);

        assertEquals("ingest-whitespace", attributes.get("hertzbeat.ingest_id"));
        assertFalse(attributes.get("hertzbeat.event_id").isBlank());
    }

    @Test
    void logsHttpGzipContentEncodingWithBlankFirstValueStillDecodesBeforeEnrichment() throws Exception {
        ExportLogsServiceRequest request = logsRequest(List.of(logRecord("protobuf-body")));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));
        requestHeaders.add(HttpHeaders.CONTENT_ENCODING, " ");
        requestHeaders.add(HttpHeaders.CONTENT_ENCODING, "gzip");

        byte[] enriched = enricher.enrichLogsHttp(gzip(request.toByteArray()), requestHeaders,
                new OtlpCorrelationContext("ingest-multi-value", null, null));
        Map<String, String> attributes = logAttributes(ExportLogsServiceRequest.parseFrom(enriched), 0);

        assertEquals("ingest-multi-value", attributes.get("hertzbeat.ingest_id"));
        assertFalse(attributes.get("hertzbeat.event_id").isBlank());
    }

    @Test
    void logsHttpGzipContentEncodingWithCommaSeparatedBlankValueStillDecodesBeforeEnrichment() throws Exception {
        ExportLogsServiceRequest request = logsRequest(List.of(logRecord("protobuf-body")));
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));
        requestHeaders.add(HttpHeaders.CONTENT_ENCODING, " , gzip ");

        byte[] enriched = enricher.enrichLogsHttp(gzip(request.toByteArray()), requestHeaders,
                new OtlpCorrelationContext("ingest-comma", null, null));
        Map<String, String> attributes = logAttributes(ExportLogsServiceRequest.parseFrom(enriched), 0);

        assertEquals("ingest-comma", attributes.get("hertzbeat.ingest_id"));
        assertFalse(attributes.get("hertzbeat.event_id").isBlank());
    }

    @Test
    void httpEnrichmentWithNullBodiesUsesEmptyProtobufRequests() throws Exception {
        HttpHeaders requestHeaders = new HttpHeaders();
        byte[] logsEnriched = enricher.enrichLogsHttp(null, requestHeaders,
                new OtlpCorrelationContext("ingest-empty", "entity-empty", "workspace-empty"));
        byte[] tracesEnriched = enricher.enrichTracesHttp(null, requestHeaders,
                new OtlpCorrelationContext("ignored-for-traces", "entity-empty", "workspace-empty"));

        assertEquals(ExportLogsServiceRequest.getDefaultInstance(),
                ExportLogsServiceRequest.parseFrom(logsEnriched));
        assertEquals(ExportTraceServiceRequest.getDefaultInstance(),
                ExportTraceServiceRequest.parseFrom(tracesEnriched));
    }

    @Test
    void malformedGzipTraceHttpPayloadReportsTraceSignal() {
        HttpHeaders requestHeaders = new HttpHeaders();
        requestHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));
        requestHeaders.set(HttpHeaders.CONTENT_ENCODING, "gzip");

        StatusRuntimeException exception = assertThrows(StatusRuntimeException.class,
                () -> enricher.enrichTracesHttp("not-gzip".getBytes(StandardCharsets.UTF_8), requestHeaders,
                        OtlpCorrelationContext.empty()));

        assertEquals(io.grpc.Status.Code.INVALID_ARGUMENT, exception.getStatus().getCode());
        assertEquals("Malformed gzip-compressed OTLP trace payload.", exception.getStatus().getDescription());
    }

    @Test
    void injectsWorkspaceAndEntityIntoTraceResourceAttributesWithoutOverwritingExistingValues() {
        ExportTraceServiceRequest request = traceRequest(
                stringAttribute("service.name", "checkout"),
                stringAttribute("hertzbeat.entity_id", "upstream-entity"));

        ExportTraceServiceRequest enriched = enricher.enrichTraces(request,
                new OtlpCorrelationContext("ignored-for-traces", "entity-1", "service", "workspace-1"));

        Map<String, String> resourceAttributes = traceResourceAttributes(enriched);
        assertEquals("checkout", resourceAttributes.get("service.name"));
        assertEquals("upstream-entity", resourceAttributes.get("hertzbeat.entity_id"));
        assertEquals("service", resourceAttributes.get("hertzbeat.entity_type"));
        assertEquals("workspace-1", resourceAttributes.get("hertzbeat.workspace_id"));
        assertFalse(traceSpanAttributes(enriched).containsKey("hertzbeat.entity_id"));
        assertFalse(traceSpanAttributes(enriched).containsKey("hertzbeat.entity_type"));
        assertFalse(traceSpanAttributes(enriched).containsKey("hertzbeat.workspace_id"));
    }

    @Test
    void upsertsAuthenticatedWorkspaceIntoTraceResourceAttributesWithoutOverwritingEntity() {
        ExportTraceServiceRequest request = traceRequest(
                stringAttribute("service.name", "checkout"),
                stringAttribute("hertzbeat.entity_id", "upstream-entity"),
                stringAttribute("hertzbeat.workspace_id", "spoofed"));

        ExportTraceServiceRequest enriched = enricher.enrichTraces(request,
                new OtlpCorrelationContext("ignored-for-traces", "entity-1", "workspace-1"));

        Map<String, String> resourceAttributes = traceResourceAttributes(enriched);
        assertEquals("upstream-entity", resourceAttributes.get("hertzbeat.entity_id"));
        assertEquals("workspace-1", resourceAttributes.get("hertzbeat.workspace_id"));
    }

    @Test
    void upsertsWorkspaceAndEntityIntoMetricResourceAttributes() {
        ExportMetricsServiceRequest request = metricsRequest(
                stringAttribute("service.name", "checkout"),
                stringAttribute("hertzbeat.workspace_id", "spoofed"));

        ExportMetricsServiceRequest enriched = enricher.enrichMetrics(request,
                new OtlpCorrelationContext("ignored-for-metrics", "entity-1", "service", "workspace-1"));

        Map<String, String> resourceAttributes = metricResourceAttributes(enriched);
        assertEquals("checkout", resourceAttributes.get("service.name"));
        assertEquals("entity-1", resourceAttributes.get("hertzbeat.entity_id"));
        assertEquals("service", resourceAttributes.get("hertzbeat.entity_type"));
        assertEquals("workspace-1", resourceAttributes.get("hertzbeat.workspace_id"));
    }

    @Test
    void leavesTraceResourceAttributesUnchangedWhenCorrelationContextIsEmpty() {
        ExportTraceServiceRequest request = traceRequest(stringAttribute("service.name", "checkout"));

        ExportTraceServiceRequest enriched = enricher.enrichTraces(request, OtlpCorrelationContext.empty());

        assertEquals(traceResourceAttributes(request), traceResourceAttributes(enriched));
    }

    @Test
    void normalizesGzipJsonAndProtobufTracePayloadsBeforeEnrichment() throws Exception {
        String jsonPayload = """
                {
                  "resourceSpans": [
                    {
                      "resource": {
                        "attributes": [
                          {"key": "service.name", "value": {"stringValue": "checkout"}}
                        ]
                      },
                      "scopeSpans": [
                        {
                          "spans": [
                            {
                              "traceId": "0123456789abcdef0123456789abcdef",
                              "spanId": "0123456789abcdef",
                              "name": "GET /checkout",
                              "startTimeUnixNano": "1710000000123456789",
                              "endTimeUnixNano": "1710000001123456789"
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
                """;
        HttpHeaders jsonHeaders = new HttpHeaders();
        jsonHeaders.setContentType(MediaType.APPLICATION_JSON);
        jsonHeaders.set(HttpHeaders.CONTENT_ENCODING, "gzip");

        byte[] jsonEnriched = enricher.enrichTracesHttp(gzip(jsonPayload.getBytes(StandardCharsets.UTF_8)),
                jsonHeaders, new OtlpCorrelationContext(null, "entity-json", "workspace-json"));
        Map<String, String> jsonResourceAttributes =
                traceResourceAttributes(ExportTraceServiceRequest.parseFrom(jsonEnriched));
        assertEquals("entity-json", jsonResourceAttributes.get("hertzbeat.entity_id"));
        assertEquals("workspace-json", jsonResourceAttributes.get("hertzbeat.workspace_id"));

        HttpHeaders protobufHeaders = new HttpHeaders();
        protobufHeaders.setContentType(MediaType.parseMediaType("application/x-protobuf"));
        byte[] protobufEnriched = enricher.enrichTracesHttp(traceRequest().toByteArray(), protobufHeaders,
                new OtlpCorrelationContext(null, "entity-protobuf", "workspace-protobuf"));
        Map<String, String> protobufResourceAttributes =
                traceResourceAttributes(ExportTraceServiceRequest.parseFrom(protobufEnriched));
        assertEquals("entity-protobuf", protobufResourceAttributes.get("hertzbeat.entity_id"));
        assertEquals("workspace-protobuf", protobufResourceAttributes.get("hertzbeat.workspace_id"));
    }

    private ExportLogsServiceRequest logsRequest(List<LogRecord> records) {
        return ExportLogsServiceRequest.newBuilder()
                .addResourceLogs(ResourceLogs.newBuilder()
                        .addScopeLogs(ScopeLogs.newBuilder()
                                .addAllLogRecords(records)
                                .build())
                        .build())
                .build();
    }

    private ExportMetricsServiceRequest metricsRequest(KeyValue... resourceAttributes) {
        return ExportMetricsServiceRequest.newBuilder()
                .addResourceMetrics(ResourceMetrics.newBuilder()
                        .setResource(Resource.newBuilder().addAllAttributes(List.of(resourceAttributes)).build())
                        .build())
                .build();
    }

    private ExportTraceServiceRequest traceRequest(KeyValue... resourceAttributes) {
        return ExportTraceServiceRequest.newBuilder()
                .addResourceSpans(ResourceSpans.newBuilder()
                        .setResource(Resource.newBuilder().addAllAttributes(List.of(resourceAttributes)).build())
                        .addScopeSpans(ScopeSpans.newBuilder()
                                .addSpans(Span.newBuilder()
                                        .setTraceId(ByteString.copyFrom(hexToBytes(TRACE_ID)))
                                        .setSpanId(ByteString.copyFrom(hexToBytes(SPAN_ID)))
                                        .setName("GET /checkout")
                                        .setStartTimeUnixNano(LOG_TIME_NANOS)
                                        .setEndTimeUnixNano(LOG_TIME_NANOS + 1_000_000_000L)
                                        .addAttributes(stringAttribute("http.route", "/checkout"))
                                        .build())
                                .build())
                        .build())
                .build();
    }

    private LogRecord logRecord(String body, KeyValue... attributes) {
        return LogRecord.newBuilder()
                .setTimeUnixNano(LOG_TIME_NANOS)
                .setTraceId(ByteString.copyFrom(hexToBytes(TRACE_ID)))
                .setSpanId(ByteString.copyFrom(hexToBytes(SPAN_ID)))
                .setSeverityNumberValue(17)
                .setSeverityText("ERROR")
                .setBody(AnyValue.newBuilder().setStringValue(body).build())
                .addAllAttributes(List.of(attributes))
                .build();
    }

    private KeyValue stringAttribute(String key, String value) {
        return KeyValue.newBuilder()
                .setKey(key)
                .setValue(AnyValue.newBuilder().setStringValue(value).build())
                .build();
    }

    private Map<String, String> logAttributes(ExportLogsServiceRequest request, int recordIndex) {
        return request.getResourceLogs(0)
                .getScopeLogs(0)
                .getLogRecords(recordIndex)
                .getAttributesList()
                .stream()
                .filter(attribute -> attribute.hasValue()
                        && attribute.getValue().getValueCase() == AnyValue.ValueCase.STRING_VALUE)
                .collect(java.util.stream.Collectors.toMap(
                        KeyValue::getKey,
                        attribute -> attribute.getValue().getStringValue(),
                        (left, right) -> right));
    }

    private Map<String, String> resourceAttributes(ExportLogsServiceRequest request) {
        return request.getResourceLogs(0)
                .getResource()
                .getAttributesList()
                .stream()
                .filter(attribute -> attribute.hasValue()
                        && attribute.getValue().getValueCase() == AnyValue.ValueCase.STRING_VALUE)
                .collect(java.util.stream.Collectors.toMap(
                        KeyValue::getKey,
                        attribute -> attribute.getValue().getStringValue(),
                        (left, right) -> right));
    }

    private Map<String, String> metricResourceAttributes(ExportMetricsServiceRequest request) {
        return request.getResourceMetrics(0)
                .getResource()
                .getAttributesList()
                .stream()
                .filter(attribute -> attribute.hasValue()
                        && attribute.getValue().getValueCase() == AnyValue.ValueCase.STRING_VALUE)
                .collect(java.util.stream.Collectors.toMap(
                        KeyValue::getKey,
                        attribute -> attribute.getValue().getStringValue(),
                        (left, right) -> right));
    }

    private Map<String, String> traceResourceAttributes(ExportTraceServiceRequest request) {
        return request.getResourceSpans(0)
                .getResource()
                .getAttributesList()
                .stream()
                .filter(attribute -> attribute.hasValue()
                        && attribute.getValue().getValueCase() == AnyValue.ValueCase.STRING_VALUE)
                .collect(java.util.stream.Collectors.toMap(
                        KeyValue::getKey,
                        attribute -> attribute.getValue().getStringValue(),
                        (left, right) -> right));
    }

    private Map<String, String> traceSpanAttributes(ExportTraceServiceRequest request) {
        return request.getResourceSpans(0)
                .getScopeSpans(0)
                .getSpans(0)
                .getAttributesList()
                .stream()
                .filter(attribute -> attribute.hasValue()
                        && attribute.getValue().getValueCase() == AnyValue.ValueCase.STRING_VALUE)
                .collect(java.util.stream.Collectors.toMap(
                        KeyValue::getKey,
                        attribute -> attribute.getValue().getStringValue(),
                        (left, right) -> right));
    }

    private byte[] gzip(byte[] content) throws Exception {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        try (GZIPOutputStream gzipOutputStream = new GZIPOutputStream(outputStream)) {
            gzipOutputStream.write(content);
        }
        return outputStream.toByteArray();
    }

    private byte[] hexToBytes(String value) {
        return java.util.HexFormat.of().parseHex(value);
    }
}
