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

package org.apache.hertzbeat.manager.controller;

import static org.apache.hertzbeat.common.constants.CommonConstants.LOGIN_FAILED_CODE;
import static org.apache.hertzbeat.common.constants.CommonConstants.MONITOR_CONFLICT_CODE;

import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.manager.pojo.dto.MonitorMetricLayout;
import org.apache.hertzbeat.manager.pojo.dto.MonitorMetricLayoutSaveRequest;
import org.apache.hertzbeat.manager.service.MonitorMetricLayoutConflictException;
import org.apache.hertzbeat.manager.service.MonitorMetricLayoutService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Personal monitor metric workspace layout controller.
 */
@Tag(name = "Monitor Metric Layout API")
@RestController
@RequestMapping(path = "/api/metrics/layout")
@RequiredArgsConstructor
@Slf4j
public class MonitorMetricLayoutController {

    private final MonitorMetricLayoutService monitorMetricLayoutService;

    @GetMapping("/{application}")
    @Operation(summary = "Get personal monitor metric layout")
    public ResponseEntity<Message<MonitorMetricLayout>> get(@PathVariable String application) {
        String user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.ok(Message.fail(LOGIN_FAILED_CODE, "User not authenticated"));
        }
        MonitorMetricLayout layout = monitorMetricLayoutService.get(user, application).orElse(null);
        return ResponseEntity.ok(Message.success(layout));
    }

    @PutMapping("/{application}")
    @Operation(summary = "Save personal monitor metric layout")
    public ResponseEntity<Message<MonitorMetricLayout>> save(
            @PathVariable String application,
            @RequestBody MonitorMetricLayoutSaveRequest request) {
        String user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.ok(Message.fail(LOGIN_FAILED_CODE, "User not authenticated"));
        }
        try {
            return ResponseEntity.ok(Message.success(
                    monitorMetricLayoutService.save(user, application, request)));
        } catch (MonitorMetricLayoutConflictException conflict) {
            return conflict();
        }
    }

    @DeleteMapping("/{application}")
    @Operation(summary = "Reset personal monitor metric layout")
    public ResponseEntity<Message<Void>> delete(
            @PathVariable String application,
            @RequestParam String expectedRevision) {
        String user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.ok(Message.fail(LOGIN_FAILED_CODE, "User not authenticated"));
        }
        try {
            monitorMetricLayoutService.delete(user, application, expectedRevision);
            return ResponseEntity.ok(Message.success("Monitor metric layout reset successfully"));
        } catch (MonitorMetricLayoutConflictException conflict) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Message.fail(MONITOR_CONFLICT_CODE, conflict.getMessage()));
        }
    }

    private ResponseEntity<Message<MonitorMetricLayout>> conflict() {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Message.fail(
                        MONITOR_CONFLICT_CODE,
                        "monitor_metric_layout_revision_conflict"));
    }

    private String getCurrentUser() {
        try {
            SubjectSum subject = SurenessContextHolder.getBindSubject();
            Object principal = subject == null ? null : subject.getPrincipal();
            return principal == null ? null : StringUtils.trimToNull(String.valueOf(principal));
        } catch (Exception exception) {
            log.warn("Monitor metric layout is unavailable without an authenticated user");
            return null;
        }
    }
}
