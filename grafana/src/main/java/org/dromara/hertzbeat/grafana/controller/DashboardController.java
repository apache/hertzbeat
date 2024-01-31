package org.dromara.hertzbeat.grafana.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.entity.dto.Message;
import org.dromara.hertzbeat.common.util.JsonUtil;
import org.dromara.hertzbeat.grafana.config.GrafanaConfiguration;
import org.dromara.hertzbeat.grafana.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import static org.dromara.hertzbeat.common.constants.CommonConstants.FAIL_CODE;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * Dashboard API
 * @author zqr10159
 */
@Slf4j
@Tag(name = "Dashboard API | 仪表盘API")
@RestController
@RequestMapping(path = "/api/grafana/dashboard", produces = {APPLICATION_JSON_VALUE})
public class DashboardController {
    @Autowired
    private DashboardService dashboardService;

    @Autowired
    GrafanaConfiguration grafanaConfiguration;

    private static final String KIOSK = "?kiosk=tv";
    /**
     * create dashboard
     */
    @Operation(summary = "Create dashboard | 创建仪表盘", description = "Create dashboard | 创建仪表盘")
    @PostMapping
    public ResponseEntity<Message<?>> createDashboardByFile(MultipartFile file, Long monitorId) {
        Object dashboard = JsonUtil.fromJson(file, Object.class);
        try {
            dashboardService.createDashboard(dashboard, monitorId);
        } catch (Exception e) {
            log.error("create dashboard error", e);
            return ResponseEntity.ok(Message.fail(FAIL_CODE, e.getMessage()));
        }
        return ResponseEntity.ok(Message.success("create dashboard success"));
    }

    /**
     * get dashboard by monitor id
     */
    @Operation(summary = "Get dashboard by monitor id | 根据监控id获取仪表盘", description = "Get dashboard by monitor id | 根据监控id获取仪表盘")
    @GetMapping
    public ResponseEntity<Message<?>> getDashboardByMonitorId(@RequestParam Long monitorId) {
        return ResponseEntity.ok(Message.success(dashboardService.getDashboardByMonitorId(monitorId)));
    }

    /**
     * get dashboard by monitor id
     */
    @Operation(summary = "Get dashboardUrl by monitor id | 根据监控id获取仪表盘Url", description = "Get dashboardUrl by monitor id | 根据监控id获取仪表盘Url")
    @GetMapping("/url")
    public ResponseEntity<Message<?>> getDashboardUrlByMonitorId(@RequestParam Long monitorId) {
        String suffix;
        try {
            suffix = dashboardService.getDashboardByMonitorId(monitorId).getUrl();
        } catch (NullPointerException e) {
            return ResponseEntity.ok(Message.success());
        }
        String url = grafanaConfiguration.getUrl() + suffix + KIOSK;
        return ResponseEntity.ok(Message.success(url));
    }


}
