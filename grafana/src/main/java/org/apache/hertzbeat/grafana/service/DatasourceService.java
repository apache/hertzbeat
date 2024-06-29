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

import static org.apache.hertzbeat.grafana.common.CommonConstants.ACCESS;
import static org.apache.hertzbeat.grafana.common.CommonConstants.APPLICATION_JSON;
import static org.apache.hertzbeat.grafana.common.CommonConstants.BASIC_AUTH;
import static org.apache.hertzbeat.grafana.common.CommonConstants.CONTENT_TYPE;
import static org.apache.hertzbeat.grafana.common.CommonConstants.CREATE_DATASOURCE_API;
import static org.apache.hertzbeat.grafana.common.CommonConstants.DATASOURCE_ACCESS;
import static org.apache.hertzbeat.grafana.common.CommonConstants.DATASOURCE_NAME;
import static org.apache.hertzbeat.grafana.common.CommonConstants.DATASOURCE_TYPE;
import static org.apache.hertzbeat.grafana.common.CommonConstants.DELETE_DATASOURCE_API;
import static org.apache.hertzbeat.grafana.common.CommonConstants.NAME;
import static org.apache.hertzbeat.grafana.common.CommonConstants.TYPE;
import static org.apache.hertzbeat.grafana.common.CommonConstants.URL;
import com.dtflys.forest.Forest;
import com.dtflys.forest.http.ForestRequest;
import com.dtflys.forest.http.ForestResponse;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.grafana.config.GrafanaConfiguration;
import org.apache.hertzbeat.warehouse.store.history.vm.VictoriaMetricsProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;


/**
 * Datasource Service
 */
@Service
@Slf4j
public class DatasourceService {
    private String grafanaUrl;

    private String grafanaUsername;

    private String grafanaPassword;

    private String victoriaMetricsUrl;

    private final GrafanaConfiguration grafanaConfiguration;

    private final VictoriaMetricsProperties warehouseProperties;

    @Autowired
    public DatasourceService(
            GrafanaConfiguration grafanaConfiguration,
            VictoriaMetricsProperties warehouseProperties

    ) {
        this.grafanaConfiguration = grafanaConfiguration;
        this.warehouseProperties = warehouseProperties;
    }

    @PostConstruct
    public void init() {
        this.grafanaUrl = grafanaConfiguration.getUrl().replace("http://", "").replace("https://", "");
        this.grafanaUsername = grafanaConfiguration.getUsername();
        this.grafanaPassword = grafanaConfiguration.getPassword();
        this.victoriaMetricsUrl = warehouseProperties.url();
    }

    public ForestResponse<?> createDatasource() {
        String post = String.format(CREATE_DATASOURCE_API, grafanaUsername, grafanaPassword, grafanaUrl);
        ForestRequest<?> request = Forest.post(post);
        ForestResponse<?> forestResponse = request
                .addHeader(CONTENT_TYPE, APPLICATION_JSON)
                .addBody(NAME, DATASOURCE_NAME)
                .addBody(TYPE, DATASOURCE_TYPE)
                .addBody(ACCESS, DATASOURCE_ACCESS)
                .addBody(URL, victoriaMetricsUrl)
                .addBody(BASIC_AUTH, false)
                .successWhen(((req, res) -> res.noException() && res.statusOk()))
                .onSuccess((ex, req, res) -> {
                    log.info("create datasource success");

                })
                .onError((ex, req, res) -> {
                    log.error("create datasource error: {}", res.getContent());
                    throw new RuntimeException("create datasource error");
                }).executeAsResponse();
        return forestResponse;
    }

    public ForestResponse<?> deleteDatasource() {
        String post = String.format(DELETE_DATASOURCE_API, grafanaUsername, grafanaPassword, grafanaUrl, DATASOURCE_NAME);
        ForestRequest<?> request = Forest.delete(post);
        ForestResponse<?> forestResponse = request
                .addQuery(NAME, DATASOURCE_NAME)
                .successWhen(((req, res) -> res.noException() && res.statusOk()))
                .onSuccess((ex, req, res) -> {
                    log.info("delete datasource success");

                })
                .onError((ex, req, res) -> {
                    log.error("delete datasource error: {}", res.getContent());
                    throw new RuntimeException("delete datasource error");
                }).executeAsResponse();
        return forestResponse;
    }
}
