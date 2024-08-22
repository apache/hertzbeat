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
import jakarta.servlet.http.HttpServletResponse;
import java.util.HashSet;
import java.util.List;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Define the batch API for alarms
 */
@Tag(name = "Alert Define Batch API")
@RestController
@RequestMapping(path = "/api/alert/defines", produces = {APPLICATION_JSON_VALUE})
public class AlertDefinesController {

    @Autowired
    private AlertDefineService alertDefineService;

    @GetMapping
    @Operation(summary = "Example Query the alarm definition list",
            description = "You can obtain the list of alarm definitions by querying filter items")
    public ResponseEntity<Message<Page<AlertDefine>>> getAlertDefines(
            @Parameter(description = "Alarm Definition ID", example = "6565463543") @RequestParam(required = false) List<Long> ids,
            @Parameter(description = "Search-Target Expr Template", example = "x") @RequestParam(required = false) String search,
            @Parameter(description = "Alarm Definition Severity", example = "6565463543") @RequestParam(required = false) Byte priority,
            @Parameter(description = "Sort field, default id", example = "id") @RequestParam(defaultValue = "id") String sort,
            @Parameter(description = "Sort mode: asc: ascending, desc: descending", example = "desc") @RequestParam(defaultValue = "desc") String order,
            @Parameter(description = "List current page", example = "0") @RequestParam(defaultValue = "0") int pageIndex,
            @Parameter(description = "Number of list pages", example = "8") @RequestParam(defaultValue = "8") int pageSize) {
        Page<AlertDefine> alertDefinePage = alertDefineService.getAlertDefines(ids, search, priority, sort, order, pageIndex, pageSize);
        return ResponseEntity.ok(Message.success(alertDefinePage));
    }

    @DeleteMapping
    @Operation(summary = "Delete alarm definitions in batches",
            description = "Delete alarm definitions in batches based on the alarm definition ID list")
    public ResponseEntity<Message<Void>> deleteAlertDefines(
            @Parameter(description = "Alarm Definition IDs", example = "6565463543") @RequestParam(required = false) List<Long> ids
    ) {
        if (ids != null && !ids.isEmpty()) {
            alertDefineService.deleteAlertDefines(new HashSet<>(ids));
        }
        return ResponseEntity.ok(Message.success());
    }

    @GetMapping("/export")
    @Operation(summary = "export alertDefine config", description = "export alarm definition configuration")
    public void export(
        @Parameter(description = "AlertDefine ID List", example = "656937901") @RequestParam List<Long> ids,
        @Parameter(description = "Export Type:JSON,EXCEL,YAML") @RequestParam(defaultValue = "JSON") String type,
        HttpServletResponse res) throws Exception {
        alertDefineService.export(ids, type, res);
    }

    @PostMapping("/import")
    @Operation(summary = "import alertDefine config", description = "import alarm definition configuration")
    public ResponseEntity<Message<Void>> importDefines(MultipartFile file) throws Exception {
        alertDefineService.importConfig(file);
        return ResponseEntity.ok(Message.success("Import success"));
    }
}
