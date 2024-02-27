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

package org.dromara.hertzbeat.alert.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.dromara.hertzbeat.alert.service.AlertConvergeService;
import org.dromara.hertzbeat.common.entity.alerter.AlertConverge;
import org.dromara.hertzbeat.common.entity.dto.Message;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

import static org.dromara.hertzbeat.common.constants.CommonConstants.MONITOR_NOT_EXIST_CODE;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * Alarm Converge management API
 * @author tom
 */
@Tag(name = "Alert Converge API | 告警收敛管理API")
@RestController
@RequestMapping(path = "/api/alert/converge", produces = {APPLICATION_JSON_VALUE})
public class AlertConvergeController {

    @Autowired
    private AlertConvergeService alertConvergeService;

    @PostMapping
    @Operation(summary = "New Alarm Converge | 新增告警收敛", description = "Added an alarm Converge | 新增一个告警收敛")
    public ResponseEntity<Message<Void>> addNewAlertConverge(@Valid @RequestBody AlertConverge alertConverge) {
        alertConvergeService.validate(alertConverge, false);
        alertConvergeService.addAlertConverge(alertConverge);
        return ResponseEntity.ok(Message.success("Add success"));
    }

    @PutMapping
    @Operation(summary = "Modifying an Alarm Converge | 修改告警收敛", description = "Modify an existing alarm Converge | 修改一个已存在告警收敛")
    public ResponseEntity<Message<Void>> modifyAlertConverge(@Valid @RequestBody AlertConverge alertConverge) {
        alertConvergeService.validate(alertConverge, true);
        alertConvergeService.modifyAlertConverge(alertConverge);
        return ResponseEntity.ok(Message.success("Modify success"));
    }

    @GetMapping(path = "/{id}")
    @Operation(summary = "Querying Alarm Converge | 查询告警收敛",
            description = "You can obtain alarm Converge information based on the alarm Converge ID | 根据告警收敛ID获取告警收敛信息")
    public ResponseEntity<Message<AlertConverge>> getAlertConverge(
            @Parameter(description = "Alarm Converge ID ｜ 告警收敛ID", example = "6565463543") @PathVariable("id") long id) {
        AlertConverge alertConverge = alertConvergeService.getAlertConverge(id);
        if (alertConverge == null) {
            return ResponseEntity.ok(Message.fail(MONITOR_NOT_EXIST_CODE, "AlertConverge not exist."));
        } else {
            return ResponseEntity.ok(Message.success(alertConverge));
        }
    }

}
