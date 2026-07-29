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
import io.swagger.v3.oas.annotations.tags.Tag;
import org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.CatalogResponse;
import org.apache.hertzbeat.alert.integration.api.AlertIntegrationApiContract.IntegrationGuide;
import org.apache.hertzbeat.alert.integration.api.AlertIntegrationRequestException;
import org.apache.hertzbeat.alert.integration.service.AlertIntegrationCatalogService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Read-only catalog for external alert integrations.
 */
@Tag(name = "External Alert Integration Catalog API")
@RestController
@RequestMapping("/api/alerts/integrations")
public class AlertIntegrationCatalogController {

    private final AlertIntegrationCatalogService service;

    public AlertIntegrationCatalogController(AlertIntegrationCatalogService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "List external alert integrations")
    public ResponseEntity<Message<CatalogResponse>> catalog() {
        return ResponseEntity.ok(Message.success(service.catalog()));
    }

    @GetMapping("/{source}")
    @Operation(summary = "Render one external alert integration")
    public ResponseEntity<Message<IntegrationGuide>> render(@PathVariable String source) {
        return ResponseEntity.ok(Message.success(service.render(source)));
    }

    @ExceptionHandler(AlertIntegrationRequestException.class)
    public ResponseEntity<Message<Void>> handleRequestFailure(AlertIntegrationRequestException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Message.fail(CommonConstants.FAIL_CODE, exception.errorCode().code()));
    }
}
