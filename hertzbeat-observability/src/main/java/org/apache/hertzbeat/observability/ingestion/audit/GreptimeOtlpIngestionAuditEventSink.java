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

package org.apache.hertzbeat.observability.ingestion.audit;

import io.grpc.Status;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.observability.ingestion.redaction.OtlpIngestionRedactionService;
import org.apache.hertzbeat.observability.ingestion.retry.OtlpIngestionRetryService;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriUtils;

/**
 * Persists OTLP ingest RED audit events into Greptime SQL for durable release-readiness evidence.
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "warehouse.store.greptime", name = "enabled", havingValue = "true")
public class GreptimeOtlpIngestionAuditEventSink implements OtlpIngestionAuditEventSink {

    static final String TABLE_NAME = "hertzbeat_otlp_ingest_red";

    private static final String SQL_PATH = "/v1/sql";
    private static final String DEFAULT_GREPTIME_DB_NAME = "public";
    private static final Set<String> SUPPORTED_SIGNALS = Set.of("metrics", "logs", "traces");
    private static final Set<String> SUPPORTED_PROTOCOLS = Set.of("http", "grpc");
    private static final Set<String> SUPPORTED_OUTCOMES = Set.of("accepted", "rejected", "dropped");
    private static final Set<String> SUPPORTED_STATUS_CODES = Set.of(
            "OK",
            "CANCELLED",
            "UNKNOWN",
            "INVALID_ARGUMENT",
            "DEADLINE_EXCEEDED",
            "NOT_FOUND",
            "ALREADY_EXISTS",
            "PERMISSION_DENIED",
            "RESOURCE_EXHAUSTED",
            "FAILED_PRECONDITION",
            "ABORTED",
            "OUT_OF_RANGE",
            "UNIMPLEMENTED",
            "INTERNAL",
            "UNAVAILABLE",
            "DATA_LOSS",
            "UNAUTHENTICATED"
    );
    private static final String CREATE_TABLE_SQL = """
            CREATE TABLE IF NOT EXISTS hertzbeat_otlp_ingest_red (
              observed_at TIMESTAMP(3) TIME INDEX,
              workspace_id STRING NULL,
              entity_id STRING NULL,
              ingest_id STRING NULL,
              signal STRING,
              protocol STRING,
              outcome STRING,
              status_code STRING,
              request_bytes BIGINT,
              signal_items BIGINT NULL,
              duration_millis BIGINT NULL,
              reason STRING NULL,
              PRIMARY KEY(workspace_id, signal, protocol, outcome, status_code)
            )
            """;

    private final RestTemplate restTemplate;
    private final ObjectProvider<GreptimeProperties> greptimePropertiesProvider;
    private final OtlpIngestionRetryService retryService;
    private final OtlpIngestionRedactionService redactionService;
    private final AtomicBoolean tableInitialized = new AtomicBoolean(false);

    GreptimeOtlpIngestionAuditEventSink(RestTemplate restTemplate,
                                        ObjectProvider<GreptimeProperties> greptimePropertiesProvider) {
        this(restTemplate, greptimePropertiesProvider, new OtlpIngestionRetryService(),
                new OtlpIngestionRedactionService());
    }

    public GreptimeOtlpIngestionAuditEventSink(RestTemplate restTemplate,
                                               ObjectProvider<GreptimeProperties> greptimePropertiesProvider,
                                               OtlpIngestionRetryService retryService) {
        this(restTemplate, greptimePropertiesProvider, retryService, new OtlpIngestionRedactionService());
    }

    @Autowired
    public GreptimeOtlpIngestionAuditEventSink(RestTemplate restTemplate,
                                               ObjectProvider<GreptimeProperties> greptimePropertiesProvider,
                                               OtlpIngestionRetryService retryService,
                                               OtlpIngestionRedactionService redactionService) {
        this.restTemplate = restTemplate;
        this.greptimePropertiesProvider = greptimePropertiesProvider;
        this.retryService = retryService == null ? new OtlpIngestionRetryService() : retryService;
        this.redactionService = redactionService == null ? new OtlpIngestionRedactionService() : redactionService;
    }

    @Override
    public void record(OtlpIngestionAuditEvent event) {
        GreptimeProperties greptimeProperties = greptimePropertiesOrNull();
        if (event == null || greptimeProperties == null || !greptimeProperties.enabled()
                || StringUtils.isBlank(greptimeProperties.httpEndpoint()) || event.observedAt() <= 0
                || !hasSupportedAuditClassification(event)) {
            return;
        }
        ensureTable(greptimeProperties);
        execute(greptimeProperties, insertSql(event));
    }

    private GreptimeProperties greptimePropertiesOrNull() {
        try {
            return greptimePropertiesProvider.getIfAvailable();
        } catch (RuntimeException ex) {
            log.warn("[otlp-ingest-red] failed to resolve Greptime properties: {}", ex.getMessage(), ex);
            return null;
        }
    }

    private void ensureTable(GreptimeProperties greptimeProperties) {
        if (tableInitialized.get()) {
            return;
        }
        synchronized (tableInitialized) {
            if (tableInitialized.get()) {
                return;
            }
            execute(greptimeProperties, CREATE_TABLE_SQL.strip());
            tableInitialized.set(true);
        }
    }

    private void execute(GreptimeProperties greptimeProperties, String sql) {
        try {
            ResponseEntity<String> response = retryService.execute(() -> restTemplate.exchange(
                            endpoint(greptimeProperties),
                            HttpMethod.POST,
                            sqlRequest(greptimeProperties, sql),
                            String.class
                    ),
                    responseEntity -> responseEntity == null
                            || retryService.isRetryableStatus(responseEntity.getStatusCode()));
            if (response == null) {
                throw new IllegalStateException("Greptime SQL returned no response");
            }
            HttpStatusCode statusCode = response.getStatusCode();
            if (!statusCode.is2xxSuccessful()) {
                throw new IllegalStateException("Greptime SQL returned " + statusCode);
            }
        } catch (RestClientException ex) {
            log.warn("[otlp-ingest-red] failed to persist Greptime audit event: {}", ex.getMessage(), ex);
            throw ex;
        }
    }

    private HttpEntity<String> sqlRequest(GreptimeProperties greptimeProperties, String sql) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        String username = StringUtils.trimToNull(greptimeProperties.username());
        String password = StringUtils.trimToNull(greptimeProperties.password());
        if (username != null && password != null) {
            headers.setBasicAuth(username, password, StandardCharsets.UTF_8);
        }
        return new HttpEntity<>("sql=" + UriUtils.encodeQueryParam(sql, StandardCharsets.UTF_8), headers);
    }

    private String endpoint(GreptimeProperties greptimeProperties) {
        String endpoint = StringUtils.stripEnd(StringUtils.trim(greptimeProperties.httpEndpoint()), "/") + SQL_PATH;
        return endpoint + "?db=" + UriUtils.encodeQueryParam(database(greptimeProperties.database()),
                StandardCharsets.UTF_8);
    }

    private String database(String configuredDatabase) {
        return StringUtils.defaultIfBlank(StringUtils.trim(configuredDatabase), DEFAULT_GREPTIME_DB_NAME);
    }

    private String insertSql(OtlpIngestionAuditEvent event) {
        return "INSERT INTO " + TABLE_NAME + " (observed_at, workspace_id, entity_id, ingest_id, signal, protocol, "
                + "outcome, status_code, request_bytes, signal_items, duration_millis, reason) VALUES ("
                + "to_timestamp_millis(" + Math.max(event.observedAt(), 0L) + "), "
                + sqlLiteral(trimmedOptional(event.workspaceId())) + ", "
                + sqlLiteral(trimmedOptional(event.entityId())) + ", "
                + sqlLiteral(trimmedOptional(event.ingestId())) + ", "
                + sqlLiteral(normalizedDimension(event.signal())) + ", "
                + sqlLiteral(normalizedDimension(event.protocol())) + ", "
                + sqlLiteral(normalizedDimension(event.outcome())) + ", "
                + sqlLiteral(normalizedStatusCode(event.statusCode())) + ", "
                + Math.max(event.requestBytes(), 0L) + ", "
                + sqlNumber(event.signalItems()) + ", "
                + sqlNumber(event.durationMillis()) + ", "
                + sqlLiteral(redactedReason(event.reason())) + ")";
    }

    private boolean hasSupportedAuditClassification(OtlpIngestionAuditEvent event) {
        String signal = normalizedDimension(event.signal());
        String protocol = normalizedDimension(event.protocol());
        String outcome = normalizedDimension(event.outcome());
        String statusCode = normalizedStatusCode(event.statusCode());
        return signal != null && protocol != null && outcome != null
                && SUPPORTED_SIGNALS.contains(signal)
                && SUPPORTED_PROTOCOLS.contains(protocol)
                && SUPPORTED_OUTCOMES.contains(outcome)
                && statusCode != null;
    }

    private String normalizedDimension(String value) {
        String text = StringUtils.trimToNull(value);
        return text == null ? null : text.toLowerCase(Locale.ROOT);
    }

    private String normalizedStatusCode(String value) {
        String text = StringUtils.trimToNull(value);
        if (text == null) {
            return null;
        }
        String grpcStatusName = numericGrpcStatusName(text);
        if (grpcStatusName != null) {
            return grpcStatusName;
        }
        if (isNumericStatusCode(text)) {
            return null;
        }
        String normalized = text.replaceAll("[\\s-]+", "_").replaceAll("^_+|_+$", "");
        normalized = StringUtils.trimToNull(normalized) == null ? null : normalized.toUpperCase(Locale.ROOT);
        return normalized != null && SUPPORTED_STATUS_CODES.contains(normalized) ? normalized : null;
    }

    private String numericGrpcStatusName(String text) {
        try {
            BigDecimal numericStatus = new BigDecimal(text).stripTrailingZeros();
            if (numericStatus.scale() > 0) {
                return null;
            }
            int codeValue = numericStatus.intValueExact();
            if (codeValue < Status.Code.OK.value() || codeValue > Status.Code.UNAUTHENTICATED.value()) {
                return null;
            }
            return Status.fromCodeValue(codeValue).getCode().name();
        } catch (ArithmeticException | NumberFormatException ignored) {
            return null;
        }
    }

    private boolean isNumericStatusCode(String text) {
        try {
            new BigDecimal(text);
            return true;
        } catch (NumberFormatException ignored) {
            return false;
        }
    }

    private String trimmedOptional(String value) {
        return StringUtils.trimToNull(value);
    }

    private String redactedReason(String value) {
        return StringUtils.trimToNull(redactionService.redactText(value));
    }

    private String sqlNumber(Long value) {
        return value == null ? "NULL" : String.valueOf(Math.max(value, 0L));
    }

    private String sqlLiteral(String value) {
        if (value == null) {
            return "NULL";
        }
        return "'" + value.replace("'", "''") + "'";
    }
}
