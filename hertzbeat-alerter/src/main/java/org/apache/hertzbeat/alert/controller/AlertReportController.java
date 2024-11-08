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
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.dto.GeneralCloudAlertReport;
import org.apache.hertzbeat.alert.service.AlertService;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Extern Alarm Manage API
 */
@Tag(name = "Extern Alarm Manage API")
@RestController
@RequestMapping(path = "/api/alerts/report", produces = {APPLICATION_JSON_VALUE})
@Slf4j
public class AlertReportController {

    @Autowired
    private AlertService alertService;

    @PostMapping("/{cloud}")
    @Operation(summary = "Interface for reporting external alarm information of cloud service")
    public ResponseEntity<Message<Void>> addNewAlertReportFromCloud(@PathVariable("cloud") String cloudServiceName,
                                                                    @RequestBody String alertReport) {
        alertService.addNewAlertReportFromCloud(cloudServiceName, alertReport);
        return ResponseEntity.ok(Message.success("Add report success"));
    }
    
    @PostMapping
    @Operation(summary = "Interface for reporting external and general alarm information",
            description = "The interface is used to report external and general alarm information")
    public ResponseEntity<Message<Void>> addNewAlertReport(@RequestBody GeneralCloudAlertReport alertReport) {
        alertReport.refreshAlertTime();
        alertService.addNewAlertReport(alertReport);
        return ResponseEntity.ok(Message.success("Add report success"));
    }
}
