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
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.grafana.config.GrafanaConfiguration;
import org.apache.hertzbeat.grafana.dao.DashboardDao;
import org.apache.hertzbeat.common.entity.grafana.Dashboard;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Dashboard Service
 */
@Service
@Slf4j
public class DashboardService {
    @Autowired
    private ServiceAccountService serviceAccountService;
    @Autowired
    private DashboardDao dashboardDao;
    @Autowired
    private GrafanaConfiguration grafanaConfiguration;

    private static final String CREATE_DASHBOARD_API = "/api/dashboards/db";

    private static final String DELETE_DASHBOARD_API = "/api/dashboards/uid/%s";

    /**
     * create dashboard
     * @return dashboard info
     */
    public ForestResponse<?> createDashboard(String dashboardJson, Long monitorId) {
        String token = serviceAccountService.getToken();
        String url = grafanaConfiguration.getUrl();
        ForestRequest<?> request = Forest.post(url + CREATE_DASHBOARD_API);
        ForestResponse<?> forestResponse = request
                .contentTypeJson()
                .addHeader("Authorization", "Bearer "+ token)
                .addBody("dashboard", dashboardJson)
                .addBody("overwrite", true).successWhen(((req, res) -> res.noException() && res.statusOk()))
                .onSuccess((ex, req, res) -> {
                    Dashboard dashboard = JsonUtil.fromJson(res.getContent(), Dashboard.class);
                    if (dashboard != null) {
                        dashboard.setMonitorId(monitorId);
                        dashboardDao.save(dashboard);
                        log.info("create dashboard success, token: {}", res.getContent());
                    }
                })
                .onError((ex, req, res) -> {
                    log.error("create dashboard error", ex);
                }).executeAsResponse();
        return forestResponse;
    }

    public ForestResponse<?> deleteDashboard(Long monitorId) {
        Dashboard dashboard = dashboardDao.findByMonitorId(monitorId);
        dashboardDao.deleteByMonitorId(monitorId);
        String token = serviceAccountService.getToken();
        String url = grafanaConfiguration.getUrl();
        ForestRequest<?> request = Forest.delete(url + String.format(DELETE_DASHBOARD_API, dashboard.getUid()));
        ForestResponse<?> forestResponse = request
                .contentTypeJson()
                .addHeader("Authorization", "Bearer "+ token)
                .successWhen(((req, res) -> res.noException() && res.statusOk()))
                .onSuccess((ex, req, res) -> {
                    log.info("delete dashboard success");
                })
                .onError((ex, req, res) -> {
                    log.error("delete dashboard error", ex);
                }).executeAsResponse();
        return forestResponse;
    }

    public Dashboard getDashboardByMonitorId(Long monitorId) {
        return dashboardDao.findByMonitorId(monitorId);
    }

}
