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

package org.apache.hertzbeat.observability.config;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriUtils;
import org.apache.hertzbeat.common.observability.gateway.SelfTelemetryProperties;
import org.apache.hertzbeat.warehouse.constants.WarehouseConstants;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.apache.hertzbeat.warehouse.db.GreptimeQueryGuard;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

/** Prepares signal tables in an explicitly provisioned self database, never creates a database. */
@Component
@ConditionalOnProperty(prefix = "warehouse.store.greptime", name = "enabled", havingValue = "true")
public class SelfTelemetryInitializer {
    private final SelfTelemetryProperties self;
    private final GreptimeProperties external;
    private final RestTemplate queryClient;
    private final RestTemplate initializationClient;
    private final GreptimeQueryGuard guard;

    public SelfTelemetryInitializer(SelfTelemetryProperties self, GreptimeProperties external,
            @Qualifier(WarehouseConstants.GREPTIME_QUERY_REST_TEMPLATE) RestTemplate queryClient,
            @Qualifier(WarehouseConstants.GREPTIME_INIT_REST_TEMPLATE) RestTemplate initializationClient,
            GreptimeQueryGuard guard) {
        this.self = self;
        this.external = external;
        this.queryClient = queryClient;
        this.initializationClient = initializationClient;
        this.guard = guard;
    }

    @PostConstruct
    public void initialize() {
        if (!self.isEnabled()) {
            return;
        }
        try {
            self.validateAgainst(external.database());
        } catch (IllegalArgumentException invalid) {
            self.markUnavailable("CONFIGURATION_INVALID");
            return;
        }
        GreptimeProperties properties = new GreptimeProperties(external.enabled(), external.grpcEndpoints(),
                external.httpEndpoint(), self.getDatabase(), external.username(), external.password(), external.expireTime());
        try {
            GreptimeSqlQueryExecutor executor = createExecutor(properties);
            // SHOW TABLES fails if the configured database does not exist or is inaccessible.
            List<Map<String, Object>> tables = executor.discoverTables();
            boolean logsExist = tables.stream().anyMatch(row -> row.containsValue("hertzbeat_logs"));
            boolean tracesExist = tables.stream().anyMatch(row -> row.containsValue("hzb_traces"));
            // Validate every existing target before any DDL or pipeline mutation.
            if (logsExist) {
                validate(executor, "hertzbeat_logs", SelfTelemetrySchema.logColumns());
            }
            if (tracesExist) {
                validate(executor, "hzb_traces", SelfTelemetrySchema.traceColumns());
            }
            if (!logsExist) {
                executor.execute(readSchema("greptime/tables/hertzbeat_logs.sql"));
            }
            if (!tracesExist) {
                executor.execute(readSchema("greptime/tables/hertzbeat_self_traces.sql"));
            }
            // DDL responses alone never prove readiness (including failed/no-op CREATE).
            validate(executor, "hertzbeat_logs", SelfTelemetrySchema.logColumns());
            validate(executor, "hzb_traces", SelfTelemetrySchema.traceColumns());
            uploadLogPipeline(properties);
            self.markReady();
        } catch (SelfTelemetrySchema.SchemaValidationException incompatible) {
            self.markUnavailable("SCHEMA_INCOMPATIBLE");
        } catch (IOException | RuntimeException failure) {
            // External ingestion remains available. Self queries report unavailable, never fall back.
            self.markUnavailable("STORAGE_UNAVAILABLE");
        }
    }

    GreptimeSqlQueryExecutor createExecutor(GreptimeProperties properties) {
        return new GreptimeSqlQueryExecutor(properties, queryClient, guard);
    }

    private void validate(GreptimeSqlQueryExecutor executor, String table, Map<String, String> required) {
        SelfTelemetrySchema.validate(executor.executeStrict("DESCRIBE TABLE " + table), required);
        executor.executeStrict("SELECT " + SelfTelemetrySchema.projection(required) + " FROM " + table + " LIMIT 0");
    }

    private String readSchema(String resource) throws IOException {
        return StringUtils.trimTrailingCharacter(new ClassPathResource(resource)
                .getContentAsString(StandardCharsets.UTF_8).strip(), ';');
    }

    private void uploadLogPipeline(GreptimeProperties properties) throws IOException {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        if (StringUtils.hasText(properties.username()) && StringUtils.hasText(properties.password())) {
            headers.setBasicAuth(properties.username().trim(), properties.password().trim(), StandardCharsets.UTF_8);
        }
        HttpHeaders partHeaders = new HttpHeaders();
        partHeaders.setContentType(MediaType.parseMediaType("application/x-yaml"));
        partHeaders.setContentDisposition(ContentDisposition.formData().name("file")
                .filename("hertzbeat_otlp_log_v1.yaml").build());
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new HttpEntity<>(new ClassPathResource("greptime/pipelines/hertzbeat_otlp_log_v1.yaml")
                .getContentAsString(StandardCharsets.UTF_8), partHeaders));
        String endpoint = StringUtils.trimTrailingCharacter(properties.httpEndpoint().trim(), '/')
                + "/v1/pipelines/hertzbeat_otlp_log_v1?db="
                + UriUtils.encodeQueryParam(properties.database(), StandardCharsets.UTF_8);
        var response = initializationClient.exchange(endpoint, HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
        if (response == null || !response.getStatusCode().is2xxSuccessful()) {
            throw new IllegalStateException("Self log pipeline preparation failed");
        }
    }
}
