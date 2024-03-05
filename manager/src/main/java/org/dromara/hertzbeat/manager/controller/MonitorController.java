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

package org.dromara.hertzbeat.manager.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.dromara.hertzbeat.common.entity.dto.Message;
import org.dromara.hertzbeat.common.entity.manager.Monitor;
import org.dromara.hertzbeat.manager.pojo.dto.MonitorDto;
import org.dromara.hertzbeat.manager.service.MonitorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

import static org.dromara.hertzbeat.common.constants.CommonConstants.MONITOR_NOT_EXIST_CODE;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * Monitoring management API
 * 监控管理API
 *
 * @author tomsun28
 */
@Tag(name = "Monitor Manage API | 监控管理API")
@RestController
@RequestMapping(path = "/api/monitor", produces = {APPLICATION_JSON_VALUE})
public class MonitorController {

    @Autowired
    private MonitorService monitorService;

    @PostMapping
    @Operation(summary = "Add a monitoring application", description = "新增一个监控应用")
    public ResponseEntity<Message<Void>> addNewMonitor(@Valid @RequestBody MonitorDto monitorDto) {
        // Verify request data  校验请求数据
        monitorService.validate(monitorDto, false);
        if (monitorDto.isDetected()) {
            // Probe    进行探测
            monitorService.detectMonitor(monitorDto.getMonitor(), monitorDto.getParams(), monitorDto.getCollector());
        }
        monitorService.addMonitor(monitorDto.getMonitor(), monitorDto.getParams(), monitorDto.getCollector());
        return ResponseEntity.ok(Message.success("Add success"));
    }

    @PutMapping
    @Operation(summary = "Modify an existing monitoring application", description = "修改一个已存在监控应用")
    public ResponseEntity<Message<Void>> modifyMonitor(@Valid @RequestBody MonitorDto monitorDto) {
        // Verify request data  校验请求数据
        monitorService.validate(monitorDto, true);
        if (monitorDto.isDetected()) {
            // Probe    进行探测
            monitorService.detectMonitor(monitorDto.getMonitor(), monitorDto.getParams(), monitorDto.getCollector());
        }
        monitorService.modifyMonitor(monitorDto.getMonitor(), monitorDto.getParams(), monitorDto.getCollector());
        return ResponseEntity.ok(Message.success("Modify success"));
    }

    @GetMapping(path = "/{id}")
    @Operation(summary = "Obtain monitoring information based on monitoring ID", description = "根据监控任务ID获取监控信息")
    public ResponseEntity<Message<MonitorDto>> getMonitor(
            @Parameter(description = "监控任务ID", example = "6565463543") @PathVariable("id") final long id) {
        // Get monitoring information
        // 获取监控信息
        MonitorDto monitorDto = monitorService.getMonitorDto(id);
        if (monitorDto == null) {
            return ResponseEntity.ok(Message.fail(MONITOR_NOT_EXIST_CODE, "Monitor not exist."));
        } else {
            return ResponseEntity.ok(Message.success(monitorDto));
        }
    }

    @DeleteMapping(path = "/{id}")
    @Operation(summary = "Delete monitoring application based on monitoring ID", description = "根据监控任务ID删除监控应用")
    public ResponseEntity<Message<Void>> deleteMonitor(
            @Parameter(description = "en: Monitor ID,zh: 监控任务ID", example = "6565463543") @PathVariable("id") final long id) {
        // delete monitor 删除监控
        Monitor monitor = monitorService.getMonitor(id);
        if (monitor == null) {
            return ResponseEntity.ok(Message.success("The specified monitoring was not queried, please check whether the parameters are correct"));
        }
        monitorService.deleteMonitor(id);
        return ResponseEntity.ok(Message.success("Delete success"));
    }

    @PostMapping(path = "/detect")
    @Operation(summary = "Perform availability detection on this monitoring based on monitoring information", description = "根据监控信息去对此监控进行可用性探测")
    public ResponseEntity<Message<Void>> detectMonitor(@Valid @RequestBody MonitorDto monitorDto) {
        monitorService.validate(monitorDto, null);
        monitorService.detectMonitor(monitorDto.getMonitor(), monitorDto.getParams(), monitorDto.getCollector());
        return ResponseEntity.ok(Message.success("Detect success."));
    }

    @PostMapping("/optional")
    @Operation(summary = "Add a monitor that can select metrics", description = "新增一个可选指标的监控器")
    public ResponseEntity<Message<Void>> addNewMonitorOptionalMetrics(@Valid @RequestBody MonitorDto monitorDto) {
        monitorService.validate(monitorDto, false);
        if (monitorDto.isDetected()) {
            monitorService.detectMonitor(monitorDto.getMonitor(), monitorDto.getParams(), monitorDto.getCollector());
        }
        monitorService.addNewMonitorOptionalMetrics(monitorDto.getMetrics(), monitorDto.getMonitor(), monitorDto.getParams());
        return ResponseEntity.ok(Message.success("Add success"));
    }

    @GetMapping(value = {"/metric/{app}", "/metric"})
    @Operation(summary = "get app metric", description = "根据app名称获取该app可监控指标，不传为获取全部指标")
    public ResponseEntity<Message<List<String>>> getMonitorMetrics(
            @PathVariable(value = "app", required = false) String app) {
        List<String> metricNames = monitorService.getMonitorMetrics(app);
        return ResponseEntity.ok(Message.success(metricNames));
    }

}
