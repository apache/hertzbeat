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

package org.apache.hertzbeat.grafana.service;

import static org.apache.hertzbeat.grafana.common.GrafanaConstants.CREATE_DATASOURCE_API;
import static org.apache.hertzbeat.grafana.common.GrafanaConstants.DATASOURCE_ACCESS;
import static org.apache.hertzbeat.grafana.common.GrafanaConstants.DATASOURCE_NAME; // e.g., "hertzbeat-"
import static org.apache.hertzbeat.grafana.common.GrafanaConstants.DATASOURCE_TYPE;
import static org.apache.hertzbeat.grafana.common.GrafanaConstants.QUERY_DATASOURCE_API; // e.g., "/api/datasources"

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.grafana.config.GrafanaProperties;
import org.apache.hertzbeat.warehouse.store.history.tsdb.vm.VictoriaMetricsProperties;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

@Service
@Slf4j
public class DatasourceService {

    private final GrafanaProperties grafanaProperties;
    private final RestTemplate restTemplate;

    private final String victoriaMetricsUrl;
    private final boolean vmEnabled;
    private final String greptimeUrl;
    private final boolean greptimeEnabled;

    @Autowired
    public DatasourceService(
            GrafanaProperties grafanaProperties,
            VictoriaMetricsProperties victoriaMetricsProperties,
            GreptimeProperties greptimeProperties,
            RestTemplate restTemplate
    ) {
        this.grafanaProperties = grafanaProperties;
        this.restTemplate = restTemplate;

        // Initialize VictoriaMetrics settings
        this.vmEnabled = victoriaMetricsProperties.enabled();
        if (this.vmEnabled) {
            this.victoriaMetricsUrl = victoriaMetricsProperties.url();
        } else {
            this.victoriaMetricsUrl = null;
        }

        // Initialize GreptimeDB settings
        this.greptimeEnabled = greptimeProperties.enabled();
        if (this.greptimeEnabled) {
            this.greptimeUrl = greptimeProperties.httpEndpoint();
        } else {
            this.greptimeUrl = null;
        }
    }

    public void existOrCreateDatasource(String token) {
        if (this.vmEnabled) {
            if (this.victoriaMetricsUrl != null && !this.victoriaMetricsUrl.isEmpty()) {
                createDatasource(token, "victoria-metrics", this.victoriaMetricsUrl);
            } else {
                log.warn("VictoriaMetrics is enabled but its URL is not configured. Skipping Grafana datasource creation.");
            }
        }
        if (this.greptimeEnabled) {
            if (this.greptimeUrl != null && !this.greptimeUrl.isEmpty()) {
                createDatasource(token, "greptime", this.greptimeUrl);
            } else {
                log.warn("GreptimeDB is enabled but its URL is not configured. Skipping Grafana datasource creation.");
            }
        }
        if (!this.vmEnabled && !this.greptimeEnabled) {
            log.info("No supported TSDB config enabled for Grafana datasource creation.");
        }
    }

    private void createDatasource(String token, String datasourceTypeSuffix, String specificWarehouseUrl) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        String fullDatasourceName = DATASOURCE_NAME + datasourceTypeSuffix;

        String queryByNameUrl = grafanaProperties.getPrefix() + grafanaProperties.getUrl() + QUERY_DATASOURCE_API + "/name/" + fullDatasourceName;
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(queryByNameUrl, HttpMethod.GET, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Grafana datasource '{}' already exists.", fullDatasourceName);
            }
        } catch (HttpClientErrorException.NotFound notFound) {
            log.info("Grafana datasource '{}' not found. Attempting to create...", fullDatasourceName);
            String createUrl = grafanaProperties.getPrefix() + grafanaProperties.getUrl() + CREATE_DATASOURCE_API;
            String body = String.format(
                    "{\"name\":\"%s\",\"type\":\"%s\",\"access\":\"%s\",\"url\":\"%s\",\"basicAuth\":%s,\"isDefault\":%s}",
                    fullDatasourceName, DATASOURCE_TYPE, DATASOURCE_ACCESS, specificWarehouseUrl, false, false
            );
            HttpEntity<String> createEntity = new HttpEntity<>(body, headers);
            try {
                ResponseEntity<String> createResponse = restTemplate.postForEntity(createUrl, createEntity, String.class);
                if (createResponse.getStatusCode().is2xxSuccessful()) {
                    log.info("Grafana datasource '{}' created successfully.", fullDatasourceName);
                } else {
                    log.error("Failed to create Grafana datasource '{}'. Status: {}, Body: {}",
                            fullDatasourceName, createResponse.getStatusCode(), createResponse.getBody());
                }
            } catch (Exception e) {
                log.error("Error creating Grafana datasource '{}' with URL '{}': {}",
                        fullDatasourceName, specificWarehouseUrl, e.getMessage(), e);
            }
        } catch (Exception e) {
            log.error("Error querying Grafana for datasource '{}': {}", fullDatasourceName, e.getMessage(), e);
        }
    }
}