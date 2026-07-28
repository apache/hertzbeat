/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
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
import lombok.RequiredArgsConstructor;
import org.apache.hertzbeat.alert.dto.AlertSummary;
import org.apache.hertzbeat.alert.service.AlertService;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Dashboard alert summary read API.
 */
@Tag(name = "Alarm Summary API")
@RestController
@RequestMapping(path = "/api/alerts/summary", produces = {APPLICATION_JSON_VALUE})
@RequiredArgsConstructor
public class AlertSummaryController {

    private final AlertService alertService;

    @GetMapping
    @Operation(summary = "Get alarm statistics", description = "Get alarm statistics information")
    public ResponseEntity<Message<AlertSummary>> getAlertsSummary() {
        return ResponseEntity.ok(Message.success(alertService.getAlertsSummary()));
    }
}
