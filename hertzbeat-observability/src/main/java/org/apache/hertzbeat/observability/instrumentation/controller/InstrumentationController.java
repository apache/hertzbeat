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

package org.apache.hertzbeat.observability.instrumentation.controller;

import static org.apache.hertzbeat.common.constants.CommonConstants.PARAM_INVALID_CODE;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.CatalogResponse;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionRequest;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.DetectionResponse;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.GuideRenderRequest;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.GuideRenderResponse;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationApiContract.RequestErrorCode;
import org.apache.hertzbeat.observability.instrumentation.api.InstrumentationRequestException;
import org.apache.hertzbeat.observability.instrumentation.service.InstrumentationCatalogService;
import org.apache.hertzbeat.observability.instrumentation.service.InstrumentationDetectionService;
import org.apache.hertzbeat.observability.instrumentation.service.InstrumentationGuideRenderer;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Version 1 application instrumentation onboarding API.
 */
@RestController
@RequestMapping(path = "/api/instrumentation/v1", produces = "application/json")
@Tag(name = "Application Instrumentation Controller")
@RequiredArgsConstructor
public class InstrumentationController {

    private final InstrumentationCatalogService catalogService;
    private final InstrumentationGuideRenderer guideRenderer;
    private final InstrumentationDetectionService detectionService;

    @GetMapping("/catalog")
    @Operation(summary = "Official instrumentation language and capability catalog")
    public ResponseEntity<Message<CatalogResponse>> catalog() {
        return ResponseEntity.ok(Message.success(catalogService.catalog()));
    }

    @PostMapping(path = "/render", consumes = "application/json")
    @Operation(summary = "Render structured installation and configuration guidance")
    public ResponseEntity<Message<GuideRenderResponse>> render(@RequestBody GuideRenderRequest request) {
        return ResponseEntity.ok(Message.success(guideRenderer.render(request)));
    }

    @PostMapping(path = "/detect", consumes = "application/json")
    @Operation(summary = "Detect scoped Metrics, Logs, and Traces reception")
    public ResponseEntity<Message<DetectionResponse>> detect(@RequestBody DetectionRequest request) {
        return ResponseEntity.ok(Message.success(detectionService.detect(request)));
    }

    @ExceptionHandler(InstrumentationRequestException.class)
    public ResponseEntity<Message<Void>> requestError(InstrumentationRequestException exception) {
        return ResponseEntity.ok(Message.fail(PARAM_INVALID_CODE, exception.errorCode().code()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Message<Void>> unreadableRequest() {
        return ResponseEntity.ok(Message.fail(PARAM_INVALID_CODE, RequestErrorCode.SELECTION_INVALID.code()));
    }
}
