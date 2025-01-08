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
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.HashSet;
import java.util.List;
import org.apache.hertzbeat.alert.service.AlertGroupConvergeService;
import org.apache.hertzbeat.common.entity.alerter.AlertGroupConverge;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Converge the batch API for alarms
 */
@Tag(name = "Alert Converge Batch API")
@RestController
@RequestMapping(path = "/api/alert/groups", produces = {APPLICATION_JSON_VALUE})
public class AlertGroupConvergesController {

    @Autowired
    private AlertGroupConvergeService alertGroupConvergeService;

    @GetMapping
    @Operation(summary = "Query the alarm group converge list",
            description = "You can obtain the list of alarm group group converge by querying filter items")
    public ResponseEntity<Message<Page<AlertGroupConverge>>> getAlertGroupConverges(
            @Parameter(description = "Alarm Converge ID", example = "6565463543") @RequestParam(required = false) List<Long> ids,
            @Parameter(description = "Search Name", example = "x") @RequestParam(required = false) String search,
            @Parameter(description = "Sort field, default id", example = "id") @RequestParam(defaultValue = "id") String sort,
            @Parameter(description = "Sort mode: asc: ascending, desc: descending", example = "desc") @RequestParam(defaultValue = "desc") String order,
            @Parameter(description = "List current page", example = "0") @RequestParam(defaultValue = "0") int pageIndex,
            @Parameter(description = "Number of list pages", example = "8") @RequestParam(defaultValue = "8") int pageSize) {
        Page<AlertGroupConverge> alertGroupConvergePage = alertGroupConvergeService.getAlertGroupConverges(ids, search, sort, order, pageIndex, pageSize);
        return ResponseEntity.ok(Message.success(alertGroupConvergePage));
    }

    @DeleteMapping
    @Operation(summary = "Delete alarm group converge in batches",
            description = "Delete alarm group converge in batches based on the alarm group converge ID list")
    public ResponseEntity<Message<Void>> deleteAlertDefines(
            @Parameter(description = "Alarm Converge IDs", example = "6565463543") @RequestParam(required = false) List<Long> ids
    ) {
        if (ids != null && !ids.isEmpty()) {
            alertGroupConvergeService.deleteAlertGroupConverges(new HashSet<>(ids));
        }
        return ResponseEntity.ok(Message.success());
    }

}
