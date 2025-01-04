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

import static org.apache.hertzbeat.common.constants.CommonConstants.MONITOR_NOT_EXIST_CODE;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.manager.pojo.dto.MonitorDto;
import org.apache.hertzbeat.manager.service.MonitorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Monitoring management API
 */
@Tag(name = "Monitor Manage API")
@RestController
@RequestMapping(path = "/api/monitor", produces = {APPLICATION_JSON_VALUE})
public class MonitorController {

    @Autowired
    private MonitorService monitorService;

    @PostMapping
    @Operation(summary = "Add a monitoring application", description = "Add a monitoring application")
    public ResponseEntity<Message<Void>> addNewMonitor(@Valid @RequestBody MonitorDto monitorDto) {
        // Verify request data
        monitorService.validate(monitorDto, false);
        monitorService.addMonitor(monitorDto.getMonitor(), monitorDto.getParams(), monitorDto.getCollector(), monitorDto.getGrafanaDashboard());
        return ResponseEntity.ok(Message.success("Add success"));
    }

    @PutMapping
    @Operation(summary = "Modify an existing monitoring application", description = "Modify an existing monitoring application")
    public ResponseEntity<Message<Void>> modifyMonitor(@Valid @RequestBody MonitorDto monitorDto) {
        // Verify request data
        monitorService.validate(monitorDto, true);
        monitorService.modifyMonitor(monitorDto.getMonitor(), monitorDto.getParams(), monitorDto.getCollector(), monitorDto.getGrafanaDashboard());
        return ResponseEntity.ok(Message.success("Modify success"));
    }

    @GetMapping(path = "/{id}")
    @Operation(summary = "Obtain monitoring information based on monitoring ID", description = "Obtain monitoring information based on monitoring ID")
    public ResponseEntity<Message<MonitorDto>> getMonitor(
            @Parameter(description = "Monitoring task ID", example = "6565463543") @PathVariable("id") final long id) {
        // Get monitoring information
        MonitorDto monitorDto = monitorService.getMonitorDto(id);
        if (monitorDto == null) {
            return ResponseEntity.ok(Message.fail(MONITOR_NOT_EXIST_CODE, "Monitor not exist."));
        } else {
            return ResponseEntity.ok(Message.success(monitorDto));
        }
    }

    @DeleteMapping(path = "/{id}")
    @Operation(summary = "Delete monitoring application based on monitoring ID", description = "Delete monitoring application based on monitoring ID")
    public ResponseEntity<Message<Void>> deleteMonitor(
            @Parameter(description = "en: Monitor ID", example = "6565463543") @PathVariable("id") final long id) {
        // delete monitor
        Monitor monitor = monitorService.getMonitor(id);
        if (monitor == null) {
            return ResponseEntity.ok(Message.success("The specified monitoring was not queried, please check whether the parameters are correct"));
        }
        monitorService.deleteMonitor(id);
        return ResponseEntity.ok(Message.success("Delete success"));
    }

    @PostMapping(path = "/detect")
    @Operation(summary = "Perform availability detection on this monitoring based on monitoring information",
            description = "Perform availability detection on this monitoring based on monitoring information")
    public ResponseEntity<Message<Void>> detectMonitor(@Valid @RequestBody MonitorDto monitorDto) {
        monitorService.validate(monitorDto, null);
        monitorService.detectMonitor(monitorDto.getMonitor(), monitorDto.getParams(), monitorDto.getCollector());
        return ResponseEntity.ok(Message.success("Detect success."));
    }
}
