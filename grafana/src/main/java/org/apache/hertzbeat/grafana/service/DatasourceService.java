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
import static org.apache.hertzbeat.grafana.common.GrafanaConstants.DATASOURCE_NAME;
import static org.apache.hertzbeat.grafana.common.GrafanaConstants.DATASOURCE_TYPE;
import static org.apache.hertzbeat.grafana.common.GrafanaConstants.QUERY_DATASOURCE_API;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.grafana.config.GrafanaProperties;
import org.apache.hertzbeat.warehouse.store.history.vm.VictoriaMetricsProperties;
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
 * Service for managing Grafana datasource.
 */
@Service
@Slf4j
public class DatasourceService {

    private final GrafanaProperties grafanaProperties;
    private final VictoriaMetricsProperties warehouseProperties;
    private final RestTemplate restTemplate;

    @Autowired
    public DatasourceService(
            GrafanaProperties grafanaProperties,
            VictoriaMetricsProperties warehouseProperties,
            RestTemplate restTemplate
    ) {
        this.grafanaProperties = grafanaProperties;
        this.warehouseProperties = warehouseProperties;
        this.restTemplate = restTemplate;
    }

    /**
     * Create a new datasource in Grafana.
     */
    public void existOrCreateDatasource(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        // query if exist this datasource
        String queryUrl = grafanaProperties.getPrefix() + grafanaProperties.getUrl() + QUERY_DATASOURCE_API;
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        try {
            ResponseEntity<String> response = restTemplate.exchange(queryUrl, HttpMethod.GET, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("{} datasource exist", DATASOURCE_NAME);
            }
        } catch (HttpClientErrorException.NotFound notFound) {
            String createUrl = grafanaProperties.getPrefix() + grafanaProperties.getUrl() + CREATE_DATASOURCE_API;
            String body = String.format(
                    "{\"name\":\"%s\",\"type\":\"%s\",\"access\":\"%s\",\"url\":\"%s\",\"basicAuth\":%s}",
                    DATASOURCE_NAME, DATASOURCE_TYPE, DATASOURCE_ACCESS, warehouseProperties.url(), false
            );
            HttpEntity<String> createEntity = new HttpEntity<>(body, headers);
            try {
                ResponseEntity<String> createResponse = restTemplate.postForEntity(createUrl, createEntity, String.class);
                if (createResponse.getStatusCode().is2xxSuccessful()) {
                    log.info("Create datasource success");
                }
            } catch (Exception e) {
                log.error("Create datasource error", e);
            }
        } catch (Exception e) {
            log.error("Query datasource error", e);
        }
        
    }
}
