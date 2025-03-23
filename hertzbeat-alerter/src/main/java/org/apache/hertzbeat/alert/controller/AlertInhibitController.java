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
import java.util.Objects;
import org.apache.hertzbeat.alert.service.AlertInhibitService;
import org.apache.hertzbeat.common.entity.alerter.AlertInhibit;
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
 * Alarm Inhibit management API
 */
@Tag(name = "Alert Inhibit API")
@RestController
@RequestMapping(path = "/api/alert/inhibit", produces = {APPLICATION_JSON_VALUE})
public class AlertInhibitController {

    @Autowired
    private AlertInhibitService alertInhibitService;

    @PostMapping
    @Operation(summary = "New Alarm Inhibit", description = "Added an alarm Inhibit")
    public ResponseEntity<Message<Void>> addNewAlertInhibit(@Valid @RequestBody AlertInhibit alertInhibit) {
        alertInhibitService.validate(alertInhibit, false);
        alertInhibitService.addAlertInhibit(alertInhibit);
        return ResponseEntity.ok(Message.success("Add success"));
    }

    @PutMapping
    @Operation(summary = "Modifying an Alarm Inhibit", description = "Modify an existing alarm Inhibit")
    public ResponseEntity<Message<Void>> modifyAlertInhibit(@Valid @RequestBody AlertInhibit alertInhibit) {
        alertInhibitService.validate(alertInhibit, true);
        alertInhibitService.modifyAlertInhibit(alertInhibit);
        return ResponseEntity.ok(Message.success("Modify success"));
    }

    @GetMapping(path = "/{id}")
    @Operation(summary = "Querying Alarm Inhibit",
            description = "You can obtain alarm Inhibit information based on the alarm Inhibit ID")
    public ResponseEntity<Message<AlertInhibit>> getAlertInhibit(
            @Parameter(description = "Alarm Inhibit ID", example = "6565463543") @PathVariable("id") long id) {
        AlertInhibit alertInhibit = alertInhibitService.getAlertInhibit(id);

        return Objects.isNull(alertInhibit)
                ? ResponseEntity.ok(Message.fail(MONITOR_NOT_EXIST_CODE, "AlertInhibit not exist."))
                : ResponseEntity.ok(Message.success(alertInhibit));
    }

}
