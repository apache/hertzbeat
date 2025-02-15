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

package org.apache.hertzbeat.alert.controller;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.HashSet;
import java.util.List;
import org.apache.hertzbeat.alert.dto.AlertSummary;
import org.apache.hertzbeat.alert.service.AlertService;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Alarm Management API
 */
@Tag(name = "Alarm Manage Batch API")
@RestController
@RequestMapping(path = "/api/alerts", produces = {APPLICATION_JSON_VALUE})
public class AlertsController {

    @Autowired
    private AlertService alertService;

    @GetMapping
    @Operation(summary = "Query Alarms")
    public ResponseEntity<Message<Page<SingleAlert>>> getAlerts(
            @Parameter(description = "Alarm Status", example = "resolved") @RequestParam(required = false) String status,
            @Parameter(description = "Alarm content fuzzy query", example = "linux") @RequestParam(required = false) String search,
            @Parameter(description = "Sort field, default id", example = "name") @RequestParam(defaultValue = "gmtUpdate") String sort,
            @Parameter(description = "Sort Type", example = "desc") @RequestParam(defaultValue = "desc") String order,
            @Parameter(description = "List current page", example = "0") @RequestParam(defaultValue = "0") int pageIndex,
            @Parameter(description = "Number of list pagination", example = "8") @RequestParam(defaultValue = "8") int pageSize) {
        Page<SingleAlert> alertPage = alertService.getSingleAlerts(status, search, sort, order, pageIndex, pageSize);
        return ResponseEntity.ok(Message.success(alertPage));
    }

    @GetMapping("/group")
    @Operation(summary = "Query Group Alarms")
    public ResponseEntity<Message<Page<GroupAlert>>> getGroupAlerts(
            @Parameter(description = "Alarm Status", example = "resolved") @RequestParam(required = false) String status,
            @Parameter(description = "Alarm content fuzzy query", example = "linux") @RequestParam(required = false) String search,
            @Parameter(description = "Sort field, default id", example = "name") @RequestParam(defaultValue = "gmtUpdate") String sort,
            @Parameter(description = "Sort Type", example = "desc") @RequestParam(defaultValue = "desc") String order,
            @Parameter(description = "List current page", example = "0") @RequestParam(defaultValue = "0") int pageIndex,
            @Parameter(description = "Number of list pagination", example = "8") @RequestParam(defaultValue = "8") int pageSize) {
        Page<GroupAlert> alertPage = alertService.getGroupAlerts(status, search, sort, order, pageIndex, pageSize);
        return ResponseEntity.ok(Message.success(alertPage));
    }

    @DeleteMapping("/group")
    @Operation(summary = "Delete group alarms in batches", description = "according to the alarm ID list to delete the alarm information in batches")
    public ResponseEntity<Message<Void>> deleteAlerts(
            @Parameter(description = "Alarm List ID", example = "6565463543") @RequestParam(required = false) List<Long> ids) {
        if (ids != null && !ids.isEmpty()) {
            alertService.deleteGroupAlerts(new HashSet<>(ids));
        }
        Message<Void> message = Message.success();
        return ResponseEntity.ok(message);
    }

    @PutMapping(path = "/group/status/{status}")
    @Operation(summary = "Batch modify alarm status, set firing or resolved", description = "Batch modify alarm status, set firing or resolved")
    public ResponseEntity<Message<Void>> applyAlertDefinesStatus(
            @Parameter(description = "Alarm status value", example = "resolved") @PathVariable String status,
            @Parameter(description = "Alarm List IDS", example = "6565463543") @RequestParam(required = false) List<Long> ids) {
        if (ids != null && status != null && !ids.isEmpty()) {
            alertService.editGroupAlertStatus(status, ids);
        }
        Message<Void> message = Message.success();
        return ResponseEntity.ok(message);
    }

    @GetMapping(path = "/summary")
    @Operation(summary = "Get alarm statistics", description = "Get alarm statistics information")
    public ResponseEntity<Message<AlertSummary>> getAlertsSummary() {
        AlertSummary alertSummary = alertService.getAlertsSummary();
        Message<AlertSummary> message = Message.success(alertSummary);
        return ResponseEntity.ok(message);
    }
    
}
