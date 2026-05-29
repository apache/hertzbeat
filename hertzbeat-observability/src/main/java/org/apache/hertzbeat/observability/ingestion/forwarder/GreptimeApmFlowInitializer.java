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

package org.apache.hertzbeat.observability.ingestion.forwarder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.observability.ingestion.retry.OtlpIngestionRetryService;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriUtils;

/**
 * Creates the Greptime Flow that derives low-cardinality APM RED alert data from native traces.
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "warehouse.store.greptime", name = "enabled", havingValue = "true")
public class GreptimeApmFlowInitializer {

    public static final String APM_FLOW_RESOURCE = "greptime/flows/hertzbeat_apm_red_1m.sql";

    private static final String SQL_PATH = "/v1/sql";
    private static final String DEFAULT_GREPTIME_DB_NAME = "public";
    private static final String TRACE_TABLE = "hzb_traces";
    private static final String RESOURCE_ATTRIBUTES_COLUMN = "resource_attributes";
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final RestTemplate restTemplate;
    private final ObjectProvider<GreptimeProperties> greptimePropertiesProvider;
    private final OtlpIngestionRetryService retryService;

    GreptimeApmFlowInitializer(RestTemplate restTemplate,
                               ObjectProvider<GreptimeProperties> greptimePropertiesProvider) {
        this(restTemplate, greptimePropertiesProvider, new OtlpIngestionRetryService());
    }

    @Autowired
    public GreptimeApmFlowInitializer(RestTemplate restTemplate,
                                      ObjectProvider<GreptimeProperties> greptimePropertiesProvider,
                                      OtlpIngestionRetryService retryService) {
        this.restTemplate = restTemplate;
        this.greptimePropertiesProvider = greptimePropertiesProvider;
        this.retryService = retryService == null ? new OtlpIngestionRetryService() : retryService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void initialize() {
        GreptimeProperties greptimeProperties = greptimePropertiesOrNull();
        if (greptimeProperties == null || !greptimeProperties.enabled()
                || StringUtils.isBlank(greptimeProperties.httpEndpoint())) {
            log.debug("[observability greptime-apm-flow] skip initialization because Greptime is disabled.");
            return;
        }
        try {
            List<String> statements = readFlowStatements();
            Set<String> traceTableColumns = null;
            for (String statement : statements) {
                try {
                    if (!executeStatement(greptimeProperties, statement)) {
                        return;
                    }
                } catch (HttpClientErrorException.BadRequest ex) {
                    if (!isTraceResourceAttributeSchemaFailure(statement, ex)) {
                        throw ex;
                    }
                    if (traceTableColumns == null) {
                        traceTableColumns = traceTableColumns(greptimeProperties);
                    }
                    String adaptedStatement = adaptTraceResourceAttributeExpressions(statement, traceTableColumns);
                    if (statement.equals(adaptedStatement)) {
                        throw ex;
                    }
                    if (!executeStatement(greptimeProperties, adaptedStatement)) {
                        return;
                    }
                }
            }
            log.info("[observability greptime-apm-flow] initialized Greptime APM RED Flow.");
        } catch (IOException | RuntimeException ex) {
            log.warn("[observability greptime-apm-flow] failed to initialize Greptime APM RED Flow: {}",
                    ex.getMessage(), ex);
        }
    }

    private GreptimeProperties greptimePropertiesOrNull() {
        try {
            return greptimePropertiesProvider.getIfAvailable();
        } catch (RuntimeException ex) {
            log.warn("[observability greptime-apm-flow] failed to resolve Greptime properties: {}",
                    ex.getMessage(), ex);
            return null;
        }
    }

    private boolean executeStatement(GreptimeProperties greptimeProperties, String statement) {
        ResponseEntity<String> response = retryService.execute(() -> restTemplate.exchange(
                        endpoint(greptimeProperties),
                        HttpMethod.POST,
                        sqlRequest(greptimeProperties, statement),
                        String.class
                ),
                responseEntity -> responseEntity == null
                        || retryService.isRetryableStatus(responseEntity.getStatusCode()));
        if (response == null) {
            log.warn("[observability greptime-apm-flow] Greptime SQL statement returned no response.");
            return true;
        }
        if (!response.getStatusCode().is2xxSuccessful()) {
            log.warn("[observability greptime-apm-flow] Greptime SQL statement returned status {}.",
                    response.getStatusCode());
            return false;
        }
        return true;
    }

    private HttpEntity<String> sqlRequest(GreptimeProperties greptimeProperties, String sql) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        addAuthenticationHeader(headers, greptimeProperties);
        return new HttpEntity<>("sql=" + UriUtils.encodeQueryParam(sql, StandardCharsets.UTF_8), headers);
    }

    private List<String> readFlowStatements() throws IOException {
        ClassPathResource resource = new ClassPathResource(APM_FLOW_RESOURCE);
        String sql = resource.getContentAsString(StandardCharsets.UTF_8);
        return Arrays.stream(sql.split(";"))
                .map(String::strip)
                .filter(StringUtils::isNotBlank)
                .toList();
    }

    private boolean isTraceResourceAttributeSchemaFailure(String statement, HttpClientErrorException ex) {
        if (!StringUtils.containsIgnoreCase(statement, "CREATE FLOW IF NOT EXISTS hertzbeat_apm_red_1m_flow")) {
            return false;
        }
        String responseBody = ex.getResponseBodyAsString(StandardCharsets.UTF_8);
        return StringUtils.containsIgnoreCase(ex.getMessage(), "resource_attributes")
                || StringUtils.containsIgnoreCase(responseBody, "resource_attributes");
    }

    private Set<String> traceTableColumns(GreptimeProperties greptimeProperties) {
        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    endpoint(greptimeProperties),
                    HttpMethod.POST,
                    sqlRequest(greptimeProperties, "DESC " + TRACE_TABLE),
                    String.class);
            if (response == null || !response.getStatusCode().is2xxSuccessful()
                    || StringUtils.isBlank(response.getBody())) {
                return Collections.singleton(RESOURCE_ATTRIBUTES_COLUMN);
            }
            return parseTraceTableColumns(response.getBody());
        } catch (RuntimeException | IOException ex) {
            log.debug("[observability greptime-apm-flow] failed to inspect Greptime trace schema: {}",
                    ex.getMessage(), ex);
            return Collections.singleton(RESOURCE_ATTRIBUTES_COLUMN);
        }
    }

    private Set<String> parseTraceTableColumns(String responseBody) throws IOException {
        Set<String> columns = new LinkedHashSet<>();
        JsonNode root = OBJECT_MAPPER.readTree(responseBody);
        for (JsonNode output : root.path("output")) {
            JsonNode rows = output.path("records").path("rows");
            if (!rows.isArray()) {
                continue;
            }
            for (JsonNode row : rows) {
                if (row.isArray() && !row.isEmpty() && StringUtils.isNotBlank(row.get(0).asText())) {
                    columns.add(row.get(0).asText());
                }
            }
        }
        if (columns.isEmpty()) {
            return Collections.singleton(RESOURCE_ATTRIBUTES_COLUMN);
        }
        return Collections.unmodifiableSet(columns);
    }

    private String adaptTraceResourceAttributeExpressions(String statement, Set<String> traceTableColumns) {
        String adaptedStatement = statement;
        for (String key : List.of(
                "hertzbeat.workspace_id",
                "hertzbeat.entity_id",
                "deployment.environment.name",
                "service.namespace")) {
            adaptedStatement = adaptedStatement.replace(
                    "json_get_string(resource_attributes, '$[\"" + key + "\"]')",
                    resourceAttributeExpression(traceTableColumns, key));
        }
        return adaptedStatement;
    }

    private String resourceAttributeExpression(Set<String> traceTableColumns, String key) {
        String flattenedColumn = RESOURCE_ATTRIBUTES_COLUMN + "." + key;
        if (traceTableColumns.contains(flattenedColumn)) {
            return quoteIdentifier(flattenedColumn);
        }
        if (traceTableColumns.contains(RESOURCE_ATTRIBUTES_COLUMN)) {
            return "json_get_string(resource_attributes, '$[\"" + key.replace("\"", "\\\"") + "\"]')";
        }
        return "NULL";
    }

    private String quoteIdentifier(String column) {
        return "\"" + column.replace("\"", "\"\"") + "\"";
    }

    private void addAuthenticationHeader(HttpHeaders headers, GreptimeProperties greptimeProperties) {
        String username = StringUtils.trimToNull(greptimeProperties.username());
        String password = StringUtils.trimToNull(greptimeProperties.password());
        if (username == null || password == null) {
            return;
        }
        headers.setBasicAuth(username, password, StandardCharsets.UTF_8);
    }

    private String endpoint(GreptimeProperties greptimeProperties) {
        String endpoint = StringUtils.stripEnd(StringUtils.trim(greptimeProperties.httpEndpoint()), "/") + SQL_PATH;
        return endpoint + "?db=" + UriUtils.encodeQueryParam(database(greptimeProperties.database()),
                StandardCharsets.UTF_8);
    }

    private String database(String configuredDatabase) {
        return StringUtils.defaultIfBlank(StringUtils.trim(configuredDatabase), DEFAULT_GREPTIME_DB_NAME);
    }
}
