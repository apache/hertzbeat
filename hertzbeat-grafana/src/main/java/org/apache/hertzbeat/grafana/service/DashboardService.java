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

import static org.apache.hertzbeat.grafana.common.GrafanaConstants.CREATE_DASHBOARD_API;
import static org.apache.hertzbeat.grafana.common.GrafanaConstants.DELETE_DASHBOARD_API;
import static org.apache.hertzbeat.grafana.common.GrafanaConstants.INSTANCE;
import static org.apache.hertzbeat.grafana.common.GrafanaConstants.KIOSK;
import static org.apache.hertzbeat.grafana.common.GrafanaConstants.REFRESH;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.apache.hertzbeat.common.entity.grafana.GrafanaDashboard;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.grafana.common.GrafanaConstants;
import org.apache.hertzbeat.grafana.config.GrafanaProperties;
import org.apache.hertzbeat.grafana.dao.DashboardDao;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for managing Grafana dashboards.
 */
@Service
@Slf4j
public class DashboardService {

    @Autowired
    private ServiceAccountService serviceAccountService;

    @Autowired
    private DashboardDao dashboardDao;

    @Autowired
    private GrafanaProperties grafanaProperties;

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    private DatasourceService datasourceService;

    /**
     * Creates or updates a dashboard in Grafana.
     * The "id" field will be removed from the dashboard JSON before sending
     * to Grafana to ensure new dashboards are created correctly.
     *
     * @param dashboardJson the JSON representation of the dashboard definition
     * @param monitorId the ID of the monitor associated with the dashboard
     * @return ResponseEntity containing the response from Grafana
     */
    @Transactional(rollbackFor = Exception.class)
    public ResponseEntity<?> createOrUpdateDashboard(String dashboardJson, Long monitorId) {
        if (!grafanaProperties.enabled()) {
            log.info("HertzBeat Grafana config not enabled");
            throw new RuntimeException("HertzBeat Grafana config not enabled");
        }

        String token = serviceAccountService.getToken();
        String url = grafanaProperties.getPrefix() + grafanaProperties.getUrl() + CREATE_DASHBOARD_API;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        Map<String, Object> dashboardObjectMap;
        try {
            dashboardObjectMap = JsonUtil.fromJson(dashboardJson, Map.class);
        } catch (Exception e) {
            log.error("Failed to parse dashboardJson. Monitor ID: {}. JSON: {}", monitorId, dashboardJson, e);
            throw new RuntimeException("Invalid dashboard JSON structure", e);
        }

        if (dashboardObjectMap == null) {
            log.error("Parsed dashboardJson is null. Monitor ID: {}. Original JSON: {}", monitorId, dashboardJson);
            throw new RuntimeException("Parsed dashboard JSON is null");
        }

        if (dashboardObjectMap.containsKey("id")) {
            dashboardObjectMap.remove("id");
            log.debug("Removed 'id' field from dashboard JSON for monitorId: {}", monitorId);
        }

        // Construct the full request payload for Grafana API
        Map<String, Object> requestPayload = new HashMap<>();
        requestPayload.put("dashboard", dashboardObjectMap);
        requestPayload.put("overwrite", true); // Overwrite if a dashboard with the same UID exists

        String finalJsonPayload = JsonUtil.toJson(requestPayload);
        HttpEntity<String> requestEntity = new HttpEntity<>(finalJsonPayload, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, requestEntity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                GrafanaDashboard grafanaDashboard = JsonUtil.fromJson(response.getBody(), GrafanaDashboard.class);
                if (grafanaDashboard != null) {
                    grafanaDashboard.setEnabled(true);

                    String currentDatasourceName = datasourceService.getCurrentDatasourceName();
                    String useDatasource = currentDatasourceName != null
                            ? GrafanaConstants.generateUseDatasource(currentDatasourceName) : "";

                    String relativeDashboardUrl = grafanaDashboard.getUrl();
                    if (relativeDashboardUrl != null && grafanaProperties.getUrl() != null && relativeDashboardUrl.startsWith(grafanaProperties.getUrl())) {
                        relativeDashboardUrl = relativeDashboardUrl.substring(grafanaProperties.getUrl().length());
                    }
                    String fullDashboardUrl = grafanaProperties.exposeUrl().replaceAll("/$", "")
                            + (relativeDashboardUrl != null ? relativeDashboardUrl.replaceAll("^/", "") : "");

                    grafanaDashboard.setUrl(fullDashboardUrl + KIOSK + REFRESH + INSTANCE + monitorId + useDatasource);

                    grafanaDashboard.setMonitorId(monitorId);
                    dashboardDao.save(grafanaDashboard);
                    log.info("Successfully created/updated Grafana dashboard for monitorId: {}. Response: {}", monitorId, response.getBody());
                } else {
                    log.error("Failed to parse Grafana response into GrafanaDashboard object. MonitorId: {}. Response body: {}", monitorId, response.getBody());
                }
                return response;
            } else {
                log.error("Failed to create/update Grafana dashboard for monitorId: {}. Status: {}, Response: {}",
                        monitorId, response.getStatusCode(), response.getBody());
                throw new RuntimeException("Failed to create/update Grafana dashboard: " + response.getStatusCode() + " - " + response.getBody());
            }
        } catch (HttpClientErrorException ex) {
            String responseBody = ex.getResponseBodyAsString();
            log.error("Grafana API request failed for monitorId: {}. Status: {}. URL: {}. Request: {}. Response: {}",
                    monitorId, ex.getStatusCode(), url, finalJsonPayload, responseBody, ex);
            if (ex instanceof HttpClientErrorException.Forbidden) {
                throw new RuntimeException("Grafana Access Denied: " + responseBody, ex);
            } else if (ex instanceof HttpClientErrorException.NotFound) {
                throw new RuntimeException("Grafana API endpoint or resource not found: " + responseBody, ex);
            }
            throw new RuntimeException("Grafana API client error (" + ex.getStatusCode() + "): " + responseBody, ex);
        } catch (Exception ex) {
            log.error("An unexpected error occurred while creating/updating Grafana dashboard for monitorId: {}. URL: {}. Request: {}",
                    monitorId, url, finalJsonPayload, ex);
            throw new RuntimeException("Error during Grafana dashboard operation: " + ex.getMessage(), ex);
        }
    }

    /**
     * Deletes a dashboard in Grafana by monitor ID.
     *
     * @param monitorId the ID of the monitor associated with the dashboard
     */
    @Transactional(rollbackFor = Exception.class)
    public void deleteDashboard(Long monitorId) {
        GrafanaDashboard grafanaDashboard = dashboardDao.findByMonitorId(monitorId);
        if (Objects.isNull(grafanaDashboard)) {
            log.info("No Grafana dashboard found for monitorId {} to delete.", monitorId);
            return;
        }
        String uid = grafanaDashboard.getUid();
        List<GrafanaDashboard> grafanaDashboards = dashboardDao.findByUid(uid);

        if (grafanaDashboards.size() > 1) {
            dashboardDao.deleteByMonitorId(monitorId);
            log.info("Deleted hertzbeat dashboard record for monitorId: {}, Grafana dashboard with UID: {} still used by other monitors.", monitorId, uid);
        } else {
            String token = serviceAccountService.getToken();
            String url = grafanaProperties.getPrefix() + grafanaProperties.getUrl() + String.format(DELETE_DASHBOARD_API, uid);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(token);

            HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

            try {
                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.DELETE, requestEntity, String.class);

                if (response.getStatusCode().is2xxSuccessful()) {
                    // Delete from local DB only after successful Grafana deletion
                    dashboardDao.deleteByMonitorId(monitorId);
                    log.info("Successfully deleted Grafana dashboard with UID: {} and corresponding hertzbeat record for monitorId: {}", uid, monitorId);
                } else {
                    log.error("Failed to delete Grafana dashboard with UID: {}. Status: {}, Response: {}",
                            uid, response.getStatusCode(), response.getBody());
                    throw new RuntimeException("Failed to delete Grafana dashboard: " + response.getStatusCode() + " - " + response.getBody());
                }
            } catch (HttpClientErrorException ex) {
                String responseBody = ex.getResponseBodyAsString();
                log.error("Grafana API request failed during dashboard deletion for UID: {}. Status: {}. URL: {}. Response: {}",
                        uid, ex.getStatusCode(), url, responseBody, ex);
                if (ex.getStatusCode() == org.springframework.http.HttpStatus.NOT_FOUND) {
                    log.warn("Grafana dashboard with UID: {} not found during deletion attempt. Assuming already deleted. Deleting local record for monitorId: {}", uid, monitorId);
                    dashboardDao.deleteByMonitorId(monitorId);
                } else {
                    throw new RuntimeException("Grafana API client error during deletion (" + ex.getStatusCode() + "): " + responseBody, ex);
                }
            } catch (Exception ex) {
                log.error("An unexpected error occurred while deleting Grafana dashboard with UID: {}. URL: {}", uid, url, ex);
                throw new RuntimeException("Error during Grafana dashboard deletion: " + ex.getMessage(), ex);
            }
        }
    }

    /**
     * Retrieves a dashboard by monitor ID.
     *
     * @param monitorId the ID of the monitor associated with the dashboard
     * @return GrafanaDashboard object
     */
    public GrafanaDashboard getDashboardByMonitorId(Long monitorId) {
        return dashboardDao.findByMonitorId(monitorId);
    }

    /**
     * Disables a Grafana dashboard by monitor ID.
     * (This only updates the local HertzBeat database flag, does not interact with Grafana API)
     *
     * @param monitorId the ID of the monitor associated with the dashboard
     */
    public void closeGrafanaDashboard(Long monitorId) {
        GrafanaDashboard grafanaDashboard = dashboardDao.findByMonitorId(monitorId);
        if (grafanaDashboard != null) {
            if (grafanaDashboard.isEnabled()) { // Only save if there's a change
                grafanaDashboard.setEnabled(false);
                dashboardDao.save(grafanaDashboard);
                log.info("Disabled Grafana dashboard link in HertzBeat for monitorId: {}", monitorId);
            } else {
                log.info("Grafana dashboard link for monitorId: {} was already disabled.", monitorId);
            }
        } else {
            log.warn("No Grafana dashboard record found for monitorId {} to disable.", monitorId);
        }
    }
}