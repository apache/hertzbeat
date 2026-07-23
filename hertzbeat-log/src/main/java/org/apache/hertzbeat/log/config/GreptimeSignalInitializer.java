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

package org.apache.hertzbeat.log.config;

import java.nio.charset.StandardCharsets;
import org.apache.hertzbeat.warehouse.constants.WarehouseConstants;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
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

/** Fails startup clearly when the required Greptime signal schema cannot be prepared. */
@Component
@ConditionalOnProperty(prefix = "warehouse.store.greptime", name = "enabled", havingValue = "true")
public class GreptimeSignalInitializer {

    private static final String TRACE_SCHEMA = "greptime/tables/hzb_traces.sql";
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

    @EventListener(ApplicationReadyEvent.class)
    public void initialize() {
        try {
            String traceSchema = new ClassPathResource(TRACE_SCHEMA)
                    .getContentAsString(StandardCharsets.UTF_8).strip();
            sqlQueryExecutor.execute(StringUtils.trimTrailingCharacter(traceSchema, ';'));
            sqlQueryExecutor.execute("ALTER TABLE hzb_traces ADD COLUMN IF NOT EXISTS "
                    + "\"resource_attributes.service.namespace\" STRING NULL");
            sqlQueryExecutor.execute("ALTER TABLE hzb_traces ADD COLUMN IF NOT EXISTS "
                    + "\"resource_attributes.deployment.environment.name\" STRING NULL");
            String logSchema = new ClassPathResource(LOG_SCHEMA)
                    .getContentAsString(StandardCharsets.UTF_8).strip();
            sqlQueryExecutor.execute(StringUtils.trimTrailingCharacter(logSchema, ';'));
            uploadLogPipeline(new ClassPathResource(LOG_PIPELINE)
                    .getContentAsString(StandardCharsets.UTF_8));
            if (sqlQueryExecutor.execute("SELECT 1 AS ready").isEmpty()) {
                throw new IllegalStateException("GreptimeDB readiness query returned no data");
            }
        } catch (Exception exception) {
            throw new IllegalStateException("GreptimeDB is required for the three-signal release but initialization failed",
                    exception);
        }
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
                + "/v1/pipelines/hertzbeat_otlp_log_v1";
        ResponseEntity<String> response = restTemplate.exchange(endpoint, HttpMethod.POST,
                new HttpEntity<>(body, headers), String.class);
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new IllegalStateException("GreptimeDB log pipeline upload failed: " + response.getStatusCode());
        }
    }
}
