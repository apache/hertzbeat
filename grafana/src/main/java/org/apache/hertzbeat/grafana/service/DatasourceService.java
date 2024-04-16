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

import com.dtflys.forest.Forest;
import com.dtflys.forest.http.ForestRequest;
import com.dtflys.forest.http.ForestResponse;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.grafana.config.GrafanaConfiguration;
import org.apache.hertzbeat.grafana.dao.ServiceAccountDao;
import org.apache.hertzbeat.grafana.dao.ServiceTokenDao;
import org.apache.hertzbeat.warehouse.config.WarehouseProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;

/**
 * Datasource Service
 */
@Service
@Slf4j
public class DatasourceService {
    private static final String DATASOURCE_NAME = "hertzbeat-victoria-metrics";
    private static final String DATASOURCE_TYPE = "prometheus";
    private static final String DATASOURCE_ACCESS = "proxy";
    private static final String CREATE_DATASOURCE_API = "http://%s:%s@%s/api/datasources";
    private static final String DELETE_DATASOURCE_API = "http://%s:%s@%s/api/datasources/name/%s";
    private String grafanaUrl;
    private String grafanaUsername;
    private String grafanaPassword;
    private String victoriaMetricsUrl;



    private final GrafanaConfiguration grafanaConfiguration;
    private final WarehouseProperties warehouseProperties;

    @Autowired
    public DatasourceService(
            GrafanaConfiguration grafanaConfiguration,
            ServiceAccountDao serviceAccountDao,
            ServiceTokenDao serviceTokenDao,
            WarehouseProperties warehouseProperties

    ) {
        this.grafanaConfiguration = grafanaConfiguration;
        this.warehouseProperties = warehouseProperties;
    }

    @PostConstruct
    public void init() {
        this.grafanaUrl = grafanaConfiguration.getUrl().replace("http://", "").replace("https://", "");
        this.grafanaUsername = grafanaConfiguration.getUsername();
        this.grafanaPassword = grafanaConfiguration.getPassword();
        this.victoriaMetricsUrl = warehouseProperties.getStore().getVictoriaMetrics().getUrl();
    }

    public ForestResponse<?> createDatasource() {
        String post = String.format(CREATE_DATASOURCE_API, grafanaUsername, grafanaPassword, grafanaUrl);
        ForestRequest<?> request = Forest.post(post);
        ForestResponse<?> forestResponse = request
                .addHeader("Content-type", "application/json")
                .addBody("name", DATASOURCE_NAME)
                .addBody("type", DATASOURCE_TYPE)
                .addBody("access", DATASOURCE_ACCESS)
                .addBody("url", victoriaMetricsUrl)
                .addBody("basicAuth", false)
                .successWhen(((req, res) -> res.noException() && res.statusOk()))
                .onSuccess((ex, req, res) -> {
                    log.info("create datasource success");

                })
                .onError((ex, req, res) -> {
                    log.error("create datasource error: {}", res.getContent());
                }).executeAsResponse();
        return forestResponse;
    }

    public ForestResponse<?> deleteDatasource() {
        String post = String.format(DELETE_DATASOURCE_API, grafanaUsername, grafanaPassword, grafanaUrl, DATASOURCE_NAME);
        ForestRequest<?> request = Forest.delete(post);
        ForestResponse<?> forestResponse = request
                .addQuery("name", DATASOURCE_NAME)
                .successWhen(((req, res) -> res.noException() && res.statusOk()))
                .onSuccess((ex, req, res) -> {
                    log.info("delete datasource success");

                })
                .onError((ex, req, res) -> {
                    log.error("delete datasource error: {}", res.getContent());
                }).executeAsResponse();
        return forestResponse;
    }
}
