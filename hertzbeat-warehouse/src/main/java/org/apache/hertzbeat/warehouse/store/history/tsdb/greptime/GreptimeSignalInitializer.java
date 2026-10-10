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

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.warehouse.constants.WarehouseConstants;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriUtils;

/** Fails startup clearly when the required Greptime signal schema cannot be prepared. */
@Component
@ConditionalOnProperty(prefix = "warehouse.store.greptime", name = "enabled", havingValue = "true")
public class GreptimeSignalInitializer {

    private static final String TRACE_SCHEMA = "greptime/tables/hertzbeat_traces.sql";
    private static final String LOG_SCHEMA = "greptime/tables/hertzbeat_logs.sql";
    private static final String LOG_PIPELINE = "greptime/pipelines/hertzbeat_otlp_log_v1.yaml";
    private final GreptimeProperties greptimeProperties;
    private final GreptimeSqlQueryExecutor sqlQueryExecutor;
    private final RestTemplate restTemplate;

    public GreptimeSignalInitializer(GreptimeProperties greptimeProperties,
                                     GreptimeSqlQueryExecutor sqlQueryExecutor,
                                     @Qualifier(WarehouseConstants.GREPTIME_INIT_REST_TEMPLATE)
                                     RestTemplate restTemplate) {
        this.greptimeProperties = greptimeProperties;
        this.sqlQueryExecutor = sqlQueryExecutor;
        this.restTemplate = restTemplate;
    }

    @PostConstruct
    public void initialize() {
        try {
            // Reject incompatible existing logs before any schema or pipeline changes.
            List<Map<String, Object>> tables = sqlQueryExecutor.discoverTables();
            if (tables == null || tables.stream().anyMatch(row -> row == null || row.size() != 1
                    || !(row.values().iterator().next() instanceof String))) {
                throw new GreptimeLogSchemaValidator.SchemaValidationException(
                        "GreptimeDB log table hertzbeat_logs existence cannot be verified; log ingestion is not ready.");
            }
            if (tables.stream().anyMatch(row -> row.containsValue(WarehouseConstants.LOG_TABLE_NAME))) {
                validateLogSchema();
            }
            String traceSchema = new ClassPathResource(TRACE_SCHEMA)
                    .getContentAsString(StandardCharsets.UTF_8).strip();
            sqlQueryExecutor.execute(StringUtils.trimTrailingCharacter(traceSchema, ';'));
            sqlQueryExecutor.execute("ALTER TABLE " + WarehouseConstants.TRACE_TABLE_NAME + " ADD COLUMN IF NOT EXISTS "
                    + "\"resource_attributes.service.namespace\" STRING NULL");
            sqlQueryExecutor.execute("ALTER TABLE " + WarehouseConstants.TRACE_TABLE_NAME + " ADD COLUMN IF NOT EXISTS "
                    + "\"resource_attributes.deployment.environment.name\" STRING NULL");
            String logSchema = new ClassPathResource(LOG_SCHEMA)
                    .getContentAsString(StandardCharsets.UTF_8).strip();
            sqlQueryExecutor.execute(StringUtils.trimTrailingCharacter(logSchema, ';'));
            validateLogSchema();
            uploadLogPipeline(new ClassPathResource(LOG_PIPELINE)
                    .getContentAsString(StandardCharsets.UTF_8));
        } catch (GreptimeLogSchemaValidator.SchemaValidationException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IllegalStateException("GreptimeDB is required for the three-signal release but initialization failed; "
                    + "log table hertzbeat_logs schema or backend could not be verified, so log ingestion is not ready",
                    exception);
        }
    }

    private void validateLogSchema() {
        GreptimeLogSchemaValidator.validate(sqlQueryExecutor.executeStrict("DESCRIBE TABLE hertzbeat_logs"));
        // A valid empty result is sufficient; strict execution rejects storage and permission errors.
        sqlQueryExecutor.executeStrict("SELECT timestamp, log_attributes, resource_attributes, log_record_uid, "
                + "hertzbeat_entity_id, hertzbeat_workspace_id, service_name FROM hertzbeat_logs LIMIT 0");
    }

    private void uploadLogPipeline(String pipeline) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        if (StringUtils.hasText(greptimeProperties.username()) && StringUtils.hasText(greptimeProperties.password())) {
            headers.setBasicAuth(greptimeProperties.username(), greptimeProperties.password(), StandardCharsets.UTF_8);
        }
        HttpHeaders partHeaders = new HttpHeaders();
        partHeaders.setContentType(MediaType.parseMediaType("application/x-yaml"));
        partHeaders.setContentDisposition(ContentDisposition.formData().name("file")
                .filename("hertzbeat_otlp_log_v1.yaml").build());
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new HttpEntity<>(pipeline, partHeaders));
        String endpoint = StringUtils.trimTrailingCharacter(greptimeProperties.httpEndpoint(), '/')
                + "/v1/pipelines/hertzbeat_otlp_log_v1?db="
                + UriUtils.encodeQueryParam(StringUtils.hasText(greptimeProperties.database())
                        ? greptimeProperties.database().trim() : "public", StandardCharsets.UTF_8);
        ResponseEntity<String> response = restTemplate.exchange(endpoint, HttpMethod.POST,
                new HttpEntity<>(body, headers), String.class);
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new IllegalStateException("GreptimeDB log pipeline upload failed: " + response.getStatusCode());
        }
    }
}
