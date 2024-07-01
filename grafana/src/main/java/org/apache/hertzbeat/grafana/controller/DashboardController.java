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

import static org.apache.hertzbeat.common.constants.CommonConstants.FAIL_CODE;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;
import com.dtflys.forest.http.ForestResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.entity.grafana.GrafanaDashboard;
import org.apache.hertzbeat.grafana.config.GrafanaConfiguration;
import org.apache.hertzbeat.grafana.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;


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

    /**
     * create dashboard
     */

    @Operation(summary = "Create dashboard", description = "Create dashboard")
    @PostMapping
    public ResponseEntity<Message<?>> createDashboard(String dashboardJson, Long monitorId) {
        try {
            ForestResponse<?> response = dashboardService.createDashboard(dashboardJson, monitorId);
            if (!response.isError()) {
                return ResponseEntity.ok(Message.success("create dashboard success"));
            }
        } catch (Exception e) {
            log.error("create dashboard error", e);
            return ResponseEntity.ok(Message.fail(FAIL_CODE, e.getMessage()));
        }
        return ResponseEntity.ok(Message.fail(FAIL_CODE, "create dashboard fail"));
    }

    /**
     * get dashboard by monitor id
     */
    @Operation(summary = "Get dashboard by monitor id", description = "Get dashboard by monitor id")
    @GetMapping
    public ResponseEntity<Message<?>> getDashboardByMonitorId(@RequestParam Long monitorId) {
        GrafanaDashboard grafanaDashboard;
        try {
            grafanaDashboard = dashboardService.getDashboardByMonitorId(monitorId);
        } catch (Exception e) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "get dashboard fail"));
        }
        return ResponseEntity.ok(Message.success(grafanaDashboard));
    }

    /**
     * delete dashboard by monitor id
     */
    @Operation(summary = "Delete dashboard by monitor id", description = "Delete dashboard by monitor id")
    @DeleteMapping
    public ResponseEntity<Message<?>> deleteDashboardByMonitorId(@RequestParam Long monitorId) {
        try {
            dashboardService.deleteDashboard(monitorId);
        } catch (Exception e) {
            return ResponseEntity.ok(Message.fail(FAIL_CODE, "delete dashboard fail"));
        }
        return ResponseEntity.ok(Message.success("delete dashboard success"));
    }

}
