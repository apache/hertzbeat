package org.apache.hertzbeat.grafana.service;

import org.apache.hertzbeat.common.entity.grafana.GrafanaDashboard;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.grafana.config.GrafanaConfiguration;
import org.apache.hertzbeat.grafana.dao.DashboardDao;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import lombok.extern.slf4j.Slf4j;

import static org.apache.hertzbeat.grafana.common.CommonConstants.*;

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
    private GrafanaConfiguration grafanaConfiguration;

    @Autowired
    private RestTemplate restTemplate;

    /**
     * Creates a new dashboard in Grafana.
     *
     * @param dashboardJson the JSON representation of the dashboard
     * @param monitorId the ID of the monitor associated with the dashboard
     * @return ResponseEntity containing the response from Grafana
     */
    @Transactional(rollbackFor = Exception.class)
    public ResponseEntity<String> createDashboard(String dashboardJson, Long monitorId) {
        String token = serviceAccountService.getToken();
        String url = grafanaConfiguration.getUrl() + CREATE_DASHBOARD_API;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set(AUTHORIZATION, BEARER + token);

        HttpEntity<String> entity = new HttpEntity<>(dashboardJson, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                GrafanaDashboard grafanaDashboard = JsonUtil.fromJson(response.getBody(), GrafanaDashboard.class);
                if (grafanaDashboard != null) {
                    grafanaDashboard.setEnabled(true);
                    grafanaDashboard.setUrl(grafanaConfiguration.getUrl() + grafanaDashboard.getUrl().replace(grafanaConfiguration.getUrl(), "") + KIOSK + REFRESH);
                    grafanaDashboard.setMonitorId(monitorId);
                    dashboardDao.save(grafanaDashboard);
                    log.info("Create dashboard success, response: {}", response.getBody());
                }
            }
            return response;
        } catch (Exception ex) {
            log.error("Create dashboard error", ex);
            throw new RuntimeException("Create dashboard error", ex);
        }
    }

    /**
     * Deletes a dashboard in Grafana by monitor ID.
     *
     * @param monitorId the ID of the monitor associated with the dashboard
     * @return ResponseEntity containing the response from Grafana
     */
    @Transactional(rollbackFor = Exception.class)
    public ResponseEntity<String> deleteDashboard(Long monitorId) {
        GrafanaDashboard grafanaDashboard = dashboardDao.findByMonitorId(monitorId);
        String token = serviceAccountService.getToken();
        String url = grafanaConfiguration.getUrl() + String.format(DELETE_DASHBOARD_API, grafanaDashboard.getUid());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set(AUTHORIZATION, BEARER + token);

        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.DELETE, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                dashboardDao.deleteByMonitorId(monitorId);
                log.info("Delete dashboard success");
            }
            return response;
        } catch (Exception ex) {
            log.error("Delete dashboard error", ex);
            throw new RuntimeException("Delete dashboard error", ex);
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
     *
     * @param monitorId the ID of the monitor associated with the dashboard
     */
    public void closeGrafanaDashboard(Long monitorId) {
        GrafanaDashboard grafanaDashboard = dashboardDao.findByMonitorId(monitorId);
        if (grafanaDashboard != null) {
            grafanaDashboard.setEnabled(false);
            dashboardDao.save(grafanaDashboard);
        }
    }

    /**
     * Enables a Grafana dashboard by monitor ID.
     *
     * @param monitorId the ID of the monitor associated with the dashboard
     */
    public void openGrafanaDashboard(Long monitorId) {
        GrafanaDashboard grafanaDashboard = dashboardDao.findByMonitorId(monitorId);
        if (grafanaDashboard != null) {
            grafanaDashboard.setEnabled(true);
            dashboardDao.save(grafanaDashboard);
        }
    }
}
