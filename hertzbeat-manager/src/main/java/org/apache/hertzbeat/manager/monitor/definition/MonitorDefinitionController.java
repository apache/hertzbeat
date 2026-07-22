/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.monitor.definition;

import static org.apache.hertzbeat.common.constants.CommonConstants.PARAM_INVALID_CODE;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Version 1 monitor-definition read and side-effect-free validation API. */
@RestController
@RequestMapping(path = "/api/monitor-definitions/v1", produces = "application/json")
@Tag(name = "Monitor Definition V1 API")
@RequiredArgsConstructor
public class MonitorDefinitionController {

    private final MonitorDefinitionService service;

    @GetMapping("/catalog")
    @Operation(summary = "Read the stable version 1 monitor-definition catalog")
    public ResponseEntity<Message<MonitorDefinitionCatalogResponse>> catalog(
            @RequestParam(name = "lang", required = false) String lang) {
        return ResponseEntity.ok(Message.success(service.catalog(lang)));
    }

    @GetMapping("/{app}")
    @Operation(summary = "Read one version 1 monitor definition")
    public ResponseEntity<Message<MonitorDefinitionDetailResponse>> detail(
            @PathVariable String app,
            @RequestParam(name = "lang", required = false) String lang) {
        return ResponseEntity.ok(Message.success(service.detail(app, lang)));
    }

    @PostMapping(path = "/validate", consumes = "application/json")
    @Operation(summary = "Validate a monitor definition without persistence or monitor updates")
    public ResponseEntity<Message<MonitorDefinitionValidationResponse>> validate(
            @Valid @RequestBody MonitorDefinitionValidationRequest request) {
        return ResponseEntity.ok(Message.success(service.validate(request)));
    }

    @ExceptionHandler(MonitorDefinitionException.class)
    public ResponseEntity<Message<Void>> contractError(MonitorDefinitionException error) {
        return ResponseEntity.ok(Message.fail(PARAM_INVALID_CODE, error.errorCode().value()));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentNotValidException.class})
    public ResponseEntity<Message<Void>> invalidRequest() {
        return ResponseEntity.ok(Message.fail(
                PARAM_INVALID_CODE, MonitorDefinitionErrorCode.INVALID_DEFINITION.value()));
    }
}
