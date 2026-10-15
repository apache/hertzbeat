/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.observability.instrumentation.v2.controller;

import static org.apache.hertzbeat.common.constants.CommonConstants.PARAM_INVALID_CODE;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationCatalogV2.CatalogResponse;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.DetectionRequest;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationDetectionV2.DetectionResponse;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.RenderRequest;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationGuideV2.RenderResponse;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationIntakeProfileV2.IntakeProfilesResponse;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationV2RequestException;
import org.apache.hertzbeat.observability.instrumentation.v2.api.InstrumentationV2RequestException.ErrorCode;
import org.apache.hertzbeat.observability.instrumentation.v2.service.InstrumentationCatalogV2Service;
import org.apache.hertzbeat.observability.instrumentation.v2.service.InstrumentationDetectionV2Service;
import org.apache.hertzbeat.observability.instrumentation.v2.service.InstrumentationGuideV2Renderer;
import org.apache.hertzbeat.observability.instrumentation.v2.service.InstrumentationIntakeProfileV2Service;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Typed instrumentation onboarding API. */
@RestController
@RequestMapping(path = "/api/instrumentation", produces = "application/json")
@Tag(name = "Application Instrumentation Controller")
@RequiredArgsConstructor
public class InstrumentationV2Controller {

    private final InstrumentationCatalogV2Service catalogService;
    private final InstrumentationIntakeProfileV2Service profileService;
    private final InstrumentationGuideV2Renderer guideRenderer;
    private final InstrumentationDetectionV2Service detectionService;

    @GetMapping("/catalog")
    @Operation(summary = "Typed instrumentation source and recipe catalog")
    public ResponseEntity<Message<CatalogResponse>> catalog() {
        return ResponseEntity.ok(Message.success(catalogService.catalog()));
    }

    @GetMapping("/intake-profiles")
    @Operation(summary = "Explicitly advertised non-secret OTLP intake profiles")
    public ResponseEntity<Message<IntakeProfilesResponse>> intakeProfiles() {
        return ResponseEntity.ok(Message.success(profileService.profiles()));
    }

    @PostMapping(path = "/render", consumes = "application/json")
    @Operation(summary = "Render typed onboarding blocks against a server-resolved intake profile")
    public ResponseEntity<Message<RenderResponse>> render(@RequestBody RenderRequest request) {
        return ResponseEntity.ok(Message.success(guideRenderer.render(request)));
    }

    @PostMapping(path = "/detect", consumes = "application/json")
    @Operation(summary = "Detect scoped Metrics, Logs, and Traces reception")
    public ResponseEntity<Message<DetectionResponse>> detect(@RequestBody DetectionRequest request) {
        return ResponseEntity.ok(Message.success(detectionService.detect(request)));
    }

    @ExceptionHandler(InstrumentationV2RequestException.class)
    public ResponseEntity<Message<Void>> requestError(InstrumentationV2RequestException exception) {
        return ResponseEntity.ok(Message.fail(PARAM_INVALID_CODE, exception.errorCode().code()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Message<Void>> unreadableRequest() {
        return ResponseEntity.ok(Message.fail(PARAM_INVALID_CODE, ErrorCode.SELECTION_INVALID.code()));
    }
}
