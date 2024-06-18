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

package org.apache.hertzbeat.grafana.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.grafana.config.GrafanaConfiguration;
import org.apache.hertzbeat.grafana.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.apache.hertzbeat.common.constants.CommonConstants.FAIL_CODE;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * Dashboard API
 */
@Slf4j
@Tag(name = "Dashboard API")
@RestController
@RequestMapping(path = "/api/grafana/dashboard", produces = {APPLICATION_JSON_VALUE})
public class DashboardController {
    @Autowired
    private DashboardService dashboardService;

    @Autowired
    GrafanaConfiguration grafanaConfiguration;

    private static final String KIOSK = "?kiosk=tv";

    private static final String REFRESH = "&refresh=15s";
    /**
     * create dashboard
     */

    @Operation(summary = "Create dashboard", description = "Create dashboard")
    @PostMapping
    public ResponseEntity<Message<?>> createDashboardByFile(MultipartFile file, Long monitorId) {
        String content = null;
        try {
            content = new String(file.getBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            log.error("create dashboard error:{}", e.getMessage());
        }
        String dashboard = JsonUtil.fromJson(content, String.class);
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
    @Operation(summary = "Get dashboard by monitor id", description = "Get dashboard by monitor id")
    @GetMapping
    public ResponseEntity<Message<?>> getDashboardByMonitorId(@RequestParam Long monitorId) {
        return ResponseEntity.ok(Message.success(dashboardService.getDashboardByMonitorId(monitorId)));
    }

    /**
     * get dashboard by monitor id
     */
    @Operation(summary = "Get dashboardUrl by monitor id", description = "Get dashboardUrl by monitor id")
    @GetMapping("/url")
    public ResponseEntity<Message<?>> getDashboardUrlByMonitorId(@RequestParam Long monitorId) {
        String suffix;
        try {
            suffix = dashboardService.getDashboardByMonitorId(monitorId).getUrl();
        } catch (NullPointerException e) {
            return ResponseEntity.ok(Message.success());
        }
        String url = grafanaConfiguration.getUrl() + suffix + KIOSK + REFRESH;
        return ResponseEntity.ok(Message.success(url));
    }


}
