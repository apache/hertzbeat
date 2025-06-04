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
import static org.apache.hertzbeat.grafana.common.GrafanaConstants.DATASOURCE_TYPE;
import static org.apache.hertzbeat.grafana.common.GrafanaConstants.QUERY_DATASOURCE_API;
import static org.apache.hertzbeat.grafana.common.GrafanaConstants.generateDatasourceName;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.HashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.util.JsonUtil;
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

/**
 * Service for managing Grafana datasources.
 * This service checks if a datasource exists and creates it if not.
 */
@Service
@Slf4j
public class DatasourceService {

    private final GrafanaProperties grafanaProperties;
    private final VictoriaMetricsProperties warehouseProperties;
    private final GreptimeProperties greptimeProperties;
    private final RestTemplate restTemplate;

    @Autowired
    public DatasourceService(
            GrafanaProperties grafanaProperties,
            VictoriaMetricsProperties warehouseProperties,
            GreptimeProperties greptimeProperties,
            RestTemplate restTemplate
    ) {
        this.grafanaProperties = grafanaProperties;
        this.warehouseProperties = warehouseProperties;
        this.greptimeProperties = greptimeProperties;
        this.restTemplate = restTemplate;
    }

    public void existOrCreateDatasource(String token) {
        boolean vmEnabled = warehouseProperties.enabled();
        boolean greptimeEnabled = greptimeProperties.enabled();

        if (vmEnabled && greptimeEnabled) {
            throw new IllegalStateException("Conflict: Both VictoriaMetrics and Greptime are enabled, only one can be used for Grafana datasource");
        }

        if (!vmEnabled && !greptimeEnabled) {
            log.info("HertzBeat warehouse config not enabled");
            return;
        }

        // Determine datasource type and URL
        String datasourceType;
        String datasourceUrl;

        if (vmEnabled) {
            datasourceType = "vm";
            datasourceUrl = warehouseProperties.url();
        } else {
            datasourceType = "greptime";
            datasourceUrl = greptimeProperties.httpEndpoint();
        }

        // Generate unique datasource name
        String datasourceName = generateDatasourceName(datasourceType, datasourceUrl);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        String queryUrl = grafanaProperties.getPrefix() + grafanaProperties.getUrl() + QUERY_DATASOURCE_API + datasourceName;
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(queryUrl, HttpMethod.GET, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("{} datasource already exists", datasourceName);
                return;
            }
        } catch (HttpClientErrorException.NotFound notFound) {
            log.info("Datasource {} not found, creating new one", datasourceName);
        } catch (Exception e) {
            log.error("Query datasource error", e);
            return;
        }

        // Create new datasource
        createDatasource(token, datasourceName, datasourceUrl, datasourceType);
    }

    public void createDatasource(String token, String datasourceName, String datasourceUrl, String datasourceType) {
        String createUrl = grafanaProperties.getPrefix() + grafanaProperties.getUrl() + CREATE_DATASOURCE_API;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        DatasourceRequest datasourceRequest;
        if ("greptime".equals(datasourceType)) {
            datasourceUrl += "/v1/prometheus";
            Map<String, Object> jsonData = new HashMap<>();
            Map<String, Object> secureJsonData = new HashMap<>();
            jsonData.put("httpHeaderName1", "x-greptime-db-name");
            secureJsonData.put("httpHeaderValue1", greptimeProperties.database());
            datasourceRequest = new DatasourceRequest(
                    datasourceName,
                    DATASOURCE_TYPE,
                    DATASOURCE_ACCESS,
                    datasourceUrl,
                    false,
                    jsonData,
                    secureJsonData
            );
        } else {
            datasourceRequest = new DatasourceRequest(
                    datasourceName,
                    DATASOURCE_TYPE,
                    DATASOURCE_ACCESS,
                    datasourceUrl,
                    false,
                    null,
                    null
            );
        }

        try {
            String body = JsonUtil.toJson(datasourceRequest);
            HttpEntity<String> createEntity = new HttpEntity<>(body, headers);

            ResponseEntity<String> createResponse = restTemplate.postForEntity(createUrl, createEntity, String.class);
            if (createResponse.getStatusCode().is2xxSuccessful()) {
                log.info("Create datasource success");
            }
        } catch (HttpClientErrorException.Conflict conflict) {
            log.info("Datasource already exists");
        } catch (Exception e) {
            log.error("Create datasource error", e);
        }
    }

    /**
     * Request object for creating a Grafana datasource.
     * Fields are annotated with @JsonInclude to exclude null values from serialization.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class DatasourceRequest {
        public String name;
        public String type;
        public String access;
        public String url;
        public boolean basicAuth;
        public Map<String, Object> jsonData;
        public Map<String, Object> secureJsonData;

        public DatasourceRequest(String name, String type, String access, String url, boolean basicAuth, Map<String, Object> jsonData, Map<String, Object> secureJsonData) {
            this.name = name;
            this.type = type;
            this.access = access;
            this.url = url;
            this.basicAuth = basicAuth;
            this.jsonData = jsonData;
            this.secureJsonData = secureJsonData;
        }
    }

    /**
     * Get the current active datasource name
     * @return Current datasource name or null if none active
     */
    public String getCurrentDatasourceName() {
        boolean vmEnabled = warehouseProperties.enabled();
        boolean greptimeEnabled = greptimeProperties.enabled();

        if (vmEnabled) {
            return generateDatasourceName("vm", warehouseProperties.url());
        } else if (greptimeEnabled) {
            return generateDatasourceName("greptime", greptimeProperties.httpEndpoint());
        }

        return null;
    }
}