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

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.observability.ingestion.retry.OtlpIngestionRetryService;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriUtils;

/**
 * Creates the optimized Greptime native trace table before APM Flow startup.
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "warehouse.store.greptime", name = "enabled", havingValue = "true")
public class GreptimeTraceTableInitializer {

    public static final String TRACE_TABLE_RESOURCE = "greptime/tables/hzb_traces.sql";

    private static final String SQL_PATH = "/v1/sql";
    private static final String DEFAULT_GREPTIME_DB_NAME = "public";

    private final RestTemplate restTemplate;
    private final ObjectProvider<GreptimeProperties> greptimePropertiesProvider;
    private final OtlpIngestionRetryService retryService;

    GreptimeTraceTableInitializer(RestTemplate restTemplate,
                                  ObjectProvider<GreptimeProperties> greptimePropertiesProvider) {
        this(restTemplate, greptimePropertiesProvider, new OtlpIngestionRetryService());
    }

    @Autowired
    public GreptimeTraceTableInitializer(RestTemplate restTemplate,
                                         ObjectProvider<GreptimeProperties> greptimePropertiesProvider,
                                         OtlpIngestionRetryService retryService) {
        this.restTemplate = restTemplate;
        this.greptimePropertiesProvider = greptimePropertiesProvider;
        this.retryService = retryService == null ? new OtlpIngestionRetryService() : retryService;
    }

    @Order(Ordered.HIGHEST_PRECEDENCE)
    @EventListener(ApplicationReadyEvent.class)
    public void initialize() {
        GreptimeProperties greptimeProperties = greptimePropertiesOrNull();
        if (greptimeProperties == null || !greptimeProperties.enabled()
                || StringUtils.isBlank(greptimeProperties.httpEndpoint())) {
            log.debug("[observability greptime-trace-table] skip initialization because Greptime is disabled.");
            return;
        }
        try {
            executeStatement(greptimeProperties, readTraceTableStatement());
            log.info("[observability greptime-trace-table] initialized Greptime native trace table.");
        } catch (IOException | RuntimeException ex) {
            log.warn("[observability greptime-trace-table] failed to initialize Greptime native trace table: {}",
                    ex.getMessage(), ex);
        }
    }

    private GreptimeProperties greptimePropertiesOrNull() {
        try {
            return greptimePropertiesProvider.getIfAvailable();
        } catch (RuntimeException ex) {
            log.warn("[observability greptime-trace-table] failed to resolve Greptime properties: {}",
                    ex.getMessage(), ex);
            return null;
        }
    }

    private void executeStatement(GreptimeProperties greptimeProperties, String statement) {
        ResponseEntity<String> response = retryService.execute(() -> restTemplate.exchange(
                        endpoint(greptimeProperties),
                        HttpMethod.POST,
                        sqlRequest(greptimeProperties, statement),
                        String.class
                ),
                responseEntity -> responseEntity == null
                        || retryService.isRetryableStatus(responseEntity.getStatusCode()));
        if (response == null) {
            log.warn("[observability greptime-trace-table] Greptime SQL statement returned no response.");
            return;
        }
        if (!response.getStatusCode().is2xxSuccessful()) {
            log.warn("[observability greptime-trace-table] Greptime SQL statement returned status {}.",
                    response.getStatusCode());
        }
    }

    private HttpEntity<String> sqlRequest(GreptimeProperties greptimeProperties, String sql) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        addAuthenticationHeader(headers, greptimeProperties);
        return new HttpEntity<>("sql=" + UriUtils.encodeQueryParam(sql, StandardCharsets.UTF_8), headers);
    }

    private String readTraceTableStatement() throws IOException {
        ClassPathResource resource = new ClassPathResource(TRACE_TABLE_RESOURCE);
        return StringUtils.removeEnd(resource.getContentAsString(StandardCharsets.UTF_8).strip(), ";").strip();
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
