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

package com.usthe.alert.controller;

import com.usthe.common.entity.alerter.AlertDefine;
import com.usthe.common.entity.alerter.AlertDefineMonitorBind;
import com.usthe.alert.service.AlertDefineService;
import com.usthe.common.entity.dto.Message;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
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

import javax.validation.Valid;

import java.util.List;
import java.util.stream.Collectors;

import static com.usthe.common.util.CommonConstants.MONITOR_NOT_EXIST_CODE;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * Alarm definition management API
 * 告警定义管理API
 * @author tom
 * @date 2021/12/9 10:32
 */
@Tag(name = "Alert Define API | 告警定义管理API")
@RestController
@RequestMapping(path = "/api/alert/define", produces = {APPLICATION_JSON_VALUE})
public class AlertDefineController {

    @Autowired
    private AlertDefineService alertDefineService;

    @PostMapping
    @Operation(summary = "New Alarm Definition | 新增告警定义", description = "Added an alarm definition | 新增一个告警定义")
    public ResponseEntity<Message<Void>> addNewAlertDefine(@Valid @RequestBody AlertDefine alertDefine) {
        // Verify request data
        // 校验请求数据
        alertDefineService.validate(alertDefine, false);
        alertDefineService.addAlertDefine(alertDefine);
        return ResponseEntity.ok(new Message<>("Add success"));
    }

    @PutMapping
    @Operation(summary = "Modifying an Alarm Definition | 修改告警定义", description = "Modify an existing alarm definition | 修改一个已存在告警定义")
    public ResponseEntity<Message<Void>> modifyAlertDefine(@Valid @RequestBody AlertDefine alertDefine) {
        // Verify request data
        // 校验请求数据
        alertDefineService.validate(alertDefine, true);
        alertDefineService.modifyAlertDefine(alertDefine);
        return ResponseEntity.ok(new Message<>("Modify success"));
    }

    @GetMapping(path = "/{id}")
    @Operation(summary = "Querying Alarm Definitions | 查询告警定义",
            description = "You can obtain alarm definition information based on the alarm definition ID | 根据告警定义ID获取告警定义信息")
    public ResponseEntity<Message<AlertDefine>> getAlertDefine(
            @Parameter(description = "Alarm Definition ID ｜ 告警定义ID", example = "6565463543") @PathVariable("id") long id) {
        // Obtaining Monitoring Information
        // 获取监控信息
        AlertDefine alertDefine = alertDefineService.getAlertDefine(id);
        Message.MessageBuilder<AlertDefine> messageBuilder = Message.builder();
        if (alertDefine == null) {
            messageBuilder.code(MONITOR_NOT_EXIST_CODE).msg("AlertDefine not exist.");
        } else {
            messageBuilder.data(alertDefine);
        }
        return ResponseEntity.ok(messageBuilder.build());
    }

    @DeleteMapping(path = "/{id}")
    @Operation(summary = "Deleting an Alarm Definition ｜ 删除告警定义",
            description = "If the alarm definition does not exist, the alarm is deleted successfully ｜ 根据告警定义ID删除告警定义,告警定义不存在也是删除成功")
    public ResponseEntity<Message<Void>> deleteAlertDefine(
            @Parameter(description = "Alarm Definition ID ｜ 告警定义ID", example = "6565463543") @PathVariable("id") long id) {
        // If the alarm definition does not exist or is deleted successfully, the deletion succeeds
        // 删除告警定义不存在或删除成功都返回成功
        alertDefineService.deleteAlertDefine(id);
        return ResponseEntity.ok(new Message<>("Delete success"));
    }

    @PostMapping(path = "/{alertDefineId}/monitors")
    @Operation(summary = "Application alarm definition is associated with monitoring ｜ 应用告警定义与监控关联",
            description = "Applies the association between specified alarm definitions and monitoring ｜ 应用指定告警定义与监控关联关系")
    public ResponseEntity<Message<Void>> applyAlertDefineMonitorsBind(
            @Parameter(description = "Alarm Definition ID ｜ 告警定义ID", example = "6565463543") @PathVariable("alertDefineId") long alertDefineId,
            @RequestBody List<AlertDefineMonitorBind> alertDefineMonitorBinds) {
        alertDefineService.applyBindAlertDefineMonitors(alertDefineId, alertDefineMonitorBinds);
        return ResponseEntity.ok(new Message<>("Apply success"));
    }

    @GetMapping(path = "/{alertDefineId}/monitors")
    @Operation(summary = "Application alarm definition is associated with monitoring ｜ 应用告警定义与监控关联",
            description = "Applies the association between specified alarm definitions and monitoring ｜ 应用指定告警定义与监控关联关系")
    public ResponseEntity<Message<List<AlertDefineMonitorBind>>> getAlertDefineMonitorsBind(
            @Parameter(description = "Alarm Definition ID ｜ 告警定义ID", example = "6565463543") @PathVariable("alertDefineId") long alertDefineId) {
        List<AlertDefineMonitorBind> defineBinds = alertDefineService.getBindAlertDefineMonitors(alertDefineId);
        defineBinds = defineBinds.stream().filter(item -> item.getMonitor() != null).collect(Collectors.toList());
        return ResponseEntity.ok(new Message<>(defineBinds));
    }

}
