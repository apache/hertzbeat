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

import static org.apache.hertzbeat.common.constants.CommonConstants.MONITOR_NOT_EXIST_CODE;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.apache.hertzbeat.alert.service.AlertSilenceService;
import org.apache.hertzbeat.common.entity.alerter.AlertSilence;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Alarm Silence management API
 */
@Tag(name = "Alert Silence API")
@RestController
@RequestMapping(path = "/api/alert/silence", produces = {APPLICATION_JSON_VALUE})
public class AlertSilenceController {

    @Autowired
    private AlertSilenceService alertSilenceService;

    @PostMapping
    @Operation(summary = "New Alarm Silence", description = "Added an alarm Silence")
    public ResponseEntity<Message<Void>> addNewAlertSilence(@Valid @RequestBody AlertSilence alertSilence) {
        alertSilenceService.validate(alertSilence, false);
        alertSilenceService.addAlertSilence(alertSilence);
        return ResponseEntity.ok(Message.success("Add success"));
    }

    @PutMapping
    @Operation(summary = "Modifying an Alarm Silence", description = "Modify an existing alarm Silence")
    public ResponseEntity<Message<Void>> modifyAlertSilence(@Valid @RequestBody AlertSilence alertSilence) {
        alertSilenceService.validate(alertSilence, true);
        alertSilenceService.modifyAlertSilence(alertSilence);
        return ResponseEntity.ok(Message.success("Modify success"));
    }

    @GetMapping(path = "/{id}")
    @Operation(summary = "Querying Alarm Silence",
            description = "You can obtain alarm Silence information based on the alarm Silence ID")
    public ResponseEntity<Message<AlertSilence>> getAlertSilence(
            @Parameter(description = "Alarm Silence ID", example = "6565463543") @PathVariable("id") long id) {
        AlertSilence alertSilence = alertSilenceService.getAlertSilence(id);
        if (alertSilence == null) {
            return ResponseEntity.ok(Message.fail(MONITOR_NOT_EXIST_CODE, "AlertSilence not exist."));
        } else {
            return ResponseEntity.ok(Message.success(alertSilence));
        }
    }

}
