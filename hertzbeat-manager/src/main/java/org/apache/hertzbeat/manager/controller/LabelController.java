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

package org.apache.hertzbeat.manager.controller;

import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.HashSet;
import java.util.List;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.entity.manager.Label;
import org.apache.hertzbeat.manager.service.LabelService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Label management API
 */
@Tag(name = "Label Manage API")
@RestController
@RequestMapping(path = "/api/label", produces = {APPLICATION_JSON_VALUE})
public class LabelController {
    
    @Autowired
    private LabelService labelService;

    @PostMapping
    @Operation(summary = "Add Label", description = "Add Label")
    public ResponseEntity<Message<Void>> addNewLabels(@Valid @RequestBody Label label) {
        labelService.addLabel(label);
        return ResponseEntity.ok(Message.success("Add success"));
    }

    @PutMapping
    @Operation(summary = "Modify an existing Label", description = "Modify an existing Label")
    public ResponseEntity<Message<Void>> modifyLabel(@Valid @RequestBody Label label) {
        if (label.getId() == null) {
            throw new IllegalArgumentException("ID cannot be null.");
        }
        labelService.modifyLabel(label);
        return ResponseEntity.ok(Message.success("Modify success"));
    }

    @GetMapping()
    @Operation(summary = "Get labels information", description = "Obtain label information based on conditions")
    public ResponseEntity<Message<Page<Label>>> getLabels(
            @Parameter(description = "Label content search", example = "status") @RequestParam(required = false) String search,
            @Parameter(description = "Label type", example = "0") @RequestParam(required = false) Byte type,
            @Parameter(description = "List current page", example = "0") @RequestParam(defaultValue = "0") int pageIndex,
            @Parameter(description = "Number of list pagination", example = "8") @RequestParam(defaultValue = "8") int pageSize) {
        return ResponseEntity.ok(Message.success(labelService.getLabels(search, type, pageIndex, pageSize)));
    }

    @DeleteMapping()
    @Operation(summary = "Delete Label based on ID", description = "Delete Label based on ID")
    public ResponseEntity<Message<Void>> deleteLabels(
            @Parameter(description = "Label id ", example = "6565463543") @RequestParam(required = false) List<Long> ids) {
        labelService.deleteLabels(new HashSet<>(ids));
        return ResponseEntity.ok(Message.success("Delete success"));
    }
}
