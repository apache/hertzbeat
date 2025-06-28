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

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.support.exception.AlertExpressionException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Objects;

import static org.apache.hertzbeat.common.constants.CommonConstants.FAIL_CODE;
import static org.apache.hertzbeat.common.constants.CommonConstants.MONITOR_NOT_EXIST_CODE;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

/**
 * Alarm definition management API
 */
@Tag(name = "Alert Define API")
@RestController
@RequestMapping(path = "/api/alert/define", produces = {APPLICATION_JSON_VALUE})
public class AlertDefineController {

    @Autowired
    private AlertDefineService alertDefineService;

    @PostMapping
    @Operation(summary = "New Alarm Definition", description = "Added an alarm definition")
    public ResponseEntity<Message<Void>> addNewAlertDefine(@Valid @RequestBody AlertDefine alertDefine) {
        // Verify request data
        alertDefineService.validate(alertDefine, false);
        alertDefineService.addAlertDefine(alertDefine);
        return ResponseEntity.ok(Message.success("Add success"));
    }

    @PutMapping
    @Operation(summary = "Modifying an Alarm Definition", description = "Modify an existing alarm definition")
    public ResponseEntity<Message<Void>> modifyAlertDefine(@Valid @RequestBody AlertDefine alertDefine) {
        // Verify request data
        alertDefineService.validate(alertDefine, true);
        alertDefineService.modifyAlertDefine(alertDefine);
        return ResponseEntity.ok(Message.success("Modify success"));
    }

    @GetMapping(path = "/{id}")
    @Operation(summary = "Querying Alarm Definitions",
            description = "You can obtain alarm definition information based on the alarm definition ID")
    public ResponseEntity<Message<AlertDefine>> getAlertDefine(
            @Parameter(description = "Alarm Definition ID", example = "6565463543") @PathVariable("id") long id) {
        // Obtaining Monitoring Information
        AlertDefine alertDefine = alertDefineService.getAlertDefine(id);

        return Objects.isNull(alertDefine)
                ? ResponseEntity.ok(Message.fail(MONITOR_NOT_EXIST_CODE, "AlertDefine not exist."))
                : ResponseEntity.ok(Message.success(alertDefine));
    }

    @DeleteMapping(path = "/{id}")
    @Operation(summary = "Deleting an Alarm Definition",
            description = "If the alarm definition does not exist, the alarm is deleted successfully")
    public ResponseEntity<Message<Void>> deleteAlertDefine(
            @Parameter(description = "Alarm Definition ID", example = "6565463543") @PathVariable("id") long id) {
        // If the alarm definition does not exist or is deleted successfully, the deletion succeeds
        alertDefineService.deleteAlertDefine(id);
        return ResponseEntity.ok(Message.success("Delete success"));
    }

    @GetMapping(path = "/preview/{datasource}")
    @Operation(summary = "Alarm definition expression preview",
            description = "If the expression is formal, then the result of the query will be returned, otherwise it will respond with an error")
    public ResponseEntity<Message<List<Map<String, Object>>>> getDefinePreview(
            @Parameter(description = "Data Source Type", example = "promql") @PathVariable("datasource") String datasource,
            @Parameter(description = "alert threshold type:realtime,periodic") @RequestParam String type,
            @Parameter(description = "alert threshold expression") @RequestParam String expr) {
        try {
            return ResponseEntity.ok(Message.successWithData(alertDefineService.getDefinePreview(datasource, type, expr)));
        } catch (AlertExpressionException ae) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Message.fail(FAIL_CODE, ae.getMessage()));
        }
    }

}
