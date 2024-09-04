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
import static org.apache.hertzbeat.grafana.common.GrafanaConstants.DELETE_DATASOURCE_API;
import jakarta.annotation.PostConstruct;
import java.util.Base64;
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
import org.springframework.web.client.RestTemplate;

/**
 * Service for managing Grafana datasources.
 */
@Service
@Slf4j
public class DatasourceService {

    private String grafanaUrl;
    private String username;
    private String password;
    private String prefix;
    private String victoriaMetricsUrl;

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

    @PostConstruct
    public void init() {
        this.grafanaUrl = grafanaProperties.getUrl();
        this.username = grafanaProperties.username();
        this.password = grafanaProperties.password();
        this.prefix = grafanaProperties.getPrefix();
        this.victoriaMetricsUrl = warehouseProperties.url();
    }

    /**
     * Create a new datasource in Grafana.
     */
    public void createDatasource() {
        String url = String.format(prefix + CREATE_DATASOURCE_API, username, password, grafanaUrl);

        HttpHeaders headers = createHeaders();

        String body = String.format(
                "{\"name\":\"%s\",\"type\":\"%s\",\"access\":\"%s\",\"url\":\"%s\",\"basicAuth\":%s}",
                DATASOURCE_NAME, DATASOURCE_TYPE, DATASOURCE_ACCESS, victoriaMetricsUrl, false
        );

        HttpEntity<String> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Create datasource success");
            }
        } catch (Exception ex) {
            log.error("Create datasource error", ex);
            throw new RuntimeException("Create datasource error", ex);
        }
    }

    /**
     * Delete a datasource in Grafana.
     */
    public void deleteDatasource() {
        String url = String.format(prefix + DELETE_DATASOURCE_API, username, password, grafanaUrl, DATASOURCE_NAME);

        HttpHeaders headers = createHeaders();

        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.DELETE, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Delete datasource success");
            }

        } catch (Exception ex) {
            log.error("Delete datasource error", ex);
        }
    }

    private HttpHeaders createHeaders() {
        String auth = username + ":" + password;
        byte[] encodedAuth = Base64.getEncoder().encode(auth.getBytes());
        String authHeader = "Basic " + new String(encodedAuth);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", authHeader);
        return headers;
    }
}
