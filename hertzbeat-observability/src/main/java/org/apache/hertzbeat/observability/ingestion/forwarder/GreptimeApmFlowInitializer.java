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
import java.util.Arrays;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.springframework.beans.factory.ObjectProvider;
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
import org.springframework.web.client.RestClientException;
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

    private final RestTemplate restTemplate;
    private final ObjectProvider<GreptimeProperties> greptimePropertiesProvider;

    public GreptimeApmFlowInitializer(RestTemplate restTemplate,
                                      ObjectProvider<GreptimeProperties> greptimePropertiesProvider) {
        this.restTemplate = restTemplate;
        this.greptimePropertiesProvider = greptimePropertiesProvider;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void initialize() {
        GreptimeProperties greptimeProperties = greptimePropertiesProvider.getIfAvailable();
        if (greptimeProperties == null || !greptimeProperties.enabled()
                || StringUtils.isBlank(greptimeProperties.httpEndpoint())) {
            log.debug("[observability greptime-apm-flow] skip initialization because Greptime is disabled.");
            return;
        }
        try {
            List<String> statements = readFlowStatements();
            for (String statement : statements) {
                executeStatement(greptimeProperties, statement);
            }
            log.info("[observability greptime-apm-flow] initialized Greptime APM RED Flow.");
        } catch (IOException | RestClientException ex) {
            log.warn("[observability greptime-apm-flow] failed to initialize Greptime APM RED Flow: {}",
                    ex.getMessage(), ex);
        }
    }

    private void executeStatement(GreptimeProperties greptimeProperties, String statement) {
        ResponseEntity<String> response = restTemplate.exchange(
                endpoint(greptimeProperties),
                HttpMethod.POST,
                sqlRequest(greptimeProperties, statement),
                String.class
        );
        if (!response.getStatusCode().is2xxSuccessful()) {
            log.warn("[observability greptime-apm-flow] Greptime SQL statement returned status {}.",
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

    private List<String> readFlowStatements() throws IOException {
        ClassPathResource resource = new ClassPathResource(APM_FLOW_RESOURCE);
        String sql = resource.getContentAsString(StandardCharsets.UTF_8);
        return Arrays.stream(sql.split(";"))
                .map(String::strip)
                .filter(StringUtils::isNotBlank)
                .toList();
    }

    private void addAuthenticationHeader(HttpHeaders headers, GreptimeProperties greptimeProperties) {
        if (StringUtils.isBlank(greptimeProperties.username()) || StringUtils.isBlank(greptimeProperties.password())) {
            return;
        }
        headers.setBasicAuth(greptimeProperties.username(), greptimeProperties.password(), StandardCharsets.UTF_8);
    }

    private String endpoint(GreptimeProperties greptimeProperties) {
        String endpoint = StringUtils.removeEnd(greptimeProperties.httpEndpoint(), "/") + SQL_PATH;
        if (StringUtils.isNotBlank(greptimeProperties.database())) {
            endpoint += "?db=" + UriUtils.encodeQueryParam(greptimeProperties.database(), StandardCharsets.UTF_8);
        }
        return endpoint;
    }
}
