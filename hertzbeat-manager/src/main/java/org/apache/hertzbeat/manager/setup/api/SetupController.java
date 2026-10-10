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

package org.apache.hertzbeat.manager.setup.api;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.io.IOException;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.AdministratorRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.AdministratorResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.CompleteRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.CompleteResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigurationRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigurationResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ExportRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.OperationResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.OptionsRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.OptionsResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.StatusResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.UnlockRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.UnlockResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ValidateRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ValidationResponse;
import org.apache.hertzbeat.manager.setup.runtime.SetupResponseTransition;
import org.apache.hertzbeat.manager.setup.security.SetupHttpUnlockService;
import org.apache.hertzbeat.manager.setup.workflow.SetupExportRenderer;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

/** Transport-only adapter for the frozen first-install setup routes. */
@RestController
public class SetupController {
    private final SetupWorkflow workflow;
    private final SetupHttpUnlockService unlockService;
    private final SetupResponseTransition responseTransition;
    private final SetupExportRenderer exportRenderer;

    public SetupController(SetupWorkflow workflow, SetupHttpUnlockService unlockService,
                           SetupResponseTransition responseTransition, SetupExportRenderer exportRenderer) {
        this.workflow = workflow;
        this.unlockService = unlockService;
        this.responseTransition = responseTransition;
        this.exportRenderer = exportRenderer;
    }

    @GetMapping(SetupApiContract.STATUS_PATH)
    public ResponseEntity<StatusResponse> status() {
        return SetupHttpContract.noStore().body(workflow.status());
    }

    @PostMapping(SetupApiContract.UNLOCK_PATH)
    public ResponseEntity<UnlockResponse> unlock(
            @Valid @RequestBody UnlockRequest request, HttpServletRequest servletRequest) throws IOException {
        if (unlockService.requiresUnlock(servletRequest)) {
            var exchange = unlockService.redeem(request, servletRequest);
            return SetupHttpContract.noStore().header(HttpHeaders.SET_COOKIE,
                    exchange.cookie().toString()).body(exchange.response());
        }
        return SetupHttpContract.noStore().body(workflow.unlock(request));
    }

    @PostMapping(SetupApiContract.VALIDATE_PATH)
    public ResponseEntity<ValidationResponse> validate(@Valid @RequestBody ValidateRequest request) {
        return SetupHttpContract.noStore().body(workflow.validate(request));
    }

    @PostMapping(SetupApiContract.CONFIGURATION_PATH)
    public ResponseEntity<ConfigurationResponse> configure(
            @Valid @RequestBody ConfigurationRequest request, HttpServletRequest servletRequest) {
        ConfigurationResponse response = workflow.configure(request);
        if (response.phase() == SetupPhase.APPLICATION_STARTING) {
            responseTransition.arm(servletRequest);
        }
        return SetupHttpContract.noStore().body(response);
    }

    @GetMapping(SetupApiContract.OPERATION_PATH)
    public ResponseEntity<OperationResponse> operation(@PathVariable String operationId) {
        OperationResponse response = workflow.operation(operationId);
        if (response == null) {
            throw new SetupApiException(SetupErrorCode.OPERATION_NOT_FOUND, HttpStatus.NOT_FOUND);
        }
        return SetupHttpContract.noStore().body(response);
    }

    @PostMapping(SetupApiContract.ADMINISTRATOR_PATH)
    public ResponseEntity<AdministratorResponse> administrator(@Valid @RequestBody AdministratorRequest request) {
        return SetupHttpContract.noStore().body(workflow.createAdministrator(request));
    }

    @PostMapping(SetupApiContract.OPTIONS_PATH)
    public ResponseEntity<OptionsResponse> options(@Valid @RequestBody OptionsRequest request) {
        return SetupHttpContract.noStore().body(workflow.configureOptions(request));
    }

    @PostMapping(SetupApiContract.EXPORT_PATH)
    public ResponseEntity<StreamingResponseBody> export(@Valid @RequestBody ExportRequest request) {
        var metadata = workflow.prepareExport(request);
        // Async response I/O failures propagate to the servlet container after attachment headers are committed.
        StreamingResponseBody body = output -> exportRenderer.write(request, output);
        return SetupHttpContract.noStore()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + metadata.fileName() + "\"")
                .header(HttpHeaders.CONTENT_TYPE, metadata.mediaType()).body(body);
    }

    @PostMapping(SetupApiContract.COMPLETE_PATH)
    public ResponseEntity<CompleteResponse> complete(
            @Valid @RequestBody CompleteRequest request, HttpServletRequest servletRequest) {
        CompleteResponse response = workflow.complete(request);
        responseTransition.armCompletion(servletRequest);
        return SetupHttpContract.noStore().body(response);
    }
}
