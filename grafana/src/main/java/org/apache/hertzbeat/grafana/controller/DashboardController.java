package org.apache.hertzbeat.grafana.controller;

import static org.apache.hertzbeat.common.constants.CommonConstants.FAIL_CODE;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.entity.grafana.GrafanaDashboard;
import org.apache.hertzbeat.grafana.config.GrafanaConfiguration;
import org.apache.hertzbeat.grafana.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller for managing Grafana dashboards via API.
 */
@Slf4j
@Tag(name = "Dashboard API")
@RestController
@RequestMapping(path = "/api/grafana/dashboard", produces = {APPLICATION_JSON_VALUE})
public class DashboardController {

    @Autowired
    private DashboardService dashboardService;

    @Autowired
    private GrafanaConfiguration grafanaConfiguration;

    /**
     * Creates a new Grafana dashboard.
     *
     * @param dashboardJson JSON representation of the dashboard
     * @param monitorId the ID of the monitor associated with the dashboard
     * @return ResponseEntity containing success or failure message
     */
    @Operation(summary = "Create dashboard", description = "Create dashboard")
    @PostMapping
    public ResponseEntity<Message<?>> createDashboard(@RequestParam String dashboardJson, @RequestParam Long monitorId) {
        try {
            ResponseEntity<?> response = dashboardService.createDashboard(dashboardJson, monitorId);
            if (response.getStatusCode().is2xxSuccessful()) {
                return ResponseEntity.ok(Message.success("create dashboard success"));
            }
        } catch (Exception e) {
            log.error("create dashboard error", e);
            return ResponseEntity.ok(Message.fail(FAIL_CODE, e.getMessage()));
        }
        return ResponseEntity.ok(Message.fail(FAIL_CODE, "create dashboard fail"));
    }

    /**
     * Retrieves a Grafana dashboard by monitor ID.
     *
     * @param monitorId the ID of the monitor associated with the dashboard
     * @return ResponseEntity containing the GrafanaDashboard object or failure message
     */
    @Operation(summary = "Get dashboard by monitor id", description = "Get dashboard by monitor id")
    @GetMapping
    public ResponseEntity<Message<?>> getDashboardByMonitorId(@RequestParam Long monitorId) {
        try {
            GrafanaDashboard grafanaDashboard = dashboardService.getDashboardByMonitorId(monitorId);
            return ResponseEntity.ok(Message.success(grafanaDashboard));
        } catch (Exception e) {
            log.error("get dashboard error", e);
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "get dashboard fail"));
        }
    }

    /**
     * Deletes a Grafana dashboard by monitor ID.
     *
     * @param monitorId the ID of the monitor associated with the dashboard
     * @return ResponseEntity containing success or failure message
     */
    @Operation(summary = "Delete dashboard by monitor id", description = "Delete dashboard by monitor id")
    @DeleteMapping
    public ResponseEntity<Message<String>> deleteDashboardByMonitorId(@RequestParam Long monitorId) {
        try {
            ResponseEntity<String> response = dashboardService.deleteDashboard(monitorId);
            if (response.getStatusCode().is2xxSuccessful()) {
                return ResponseEntity.ok(Message.success("delete dashboard success"));
            }
        } catch (Exception e) {
            log.error("delete dashboard error", e);
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "delete dashboard fail"));
        }
        return ResponseEntity.ok(Message.fail(FAIL_CODE, "delete dashboard fail"));
    }
}
