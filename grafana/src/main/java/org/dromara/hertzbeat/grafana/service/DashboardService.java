package org.dromara.hertzbeat.grafana.service;

import com.dtflys.forest.Forest;
import com.dtflys.forest.http.ForestRequest;
import com.dtflys.forest.http.ForestResponse;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.dromara.hertzbeat.grafana.config.GrafanaConfiguration;
import org.dromara.hertzbeat.grafana.dao.DashboardDao;
import org.dromara.hertzbeat.common.entity.grafana.Dashboard;
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
                        log.info("create token success, token: {}", res.getContent());
                    }
                })
                .onError((ex, req, res) -> {
                    log.error("create token error", ex);
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
