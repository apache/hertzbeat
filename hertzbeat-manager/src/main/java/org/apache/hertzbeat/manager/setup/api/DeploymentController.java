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

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.io.IOException;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.ActivateMigrationRequest;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.DeploymentView;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MetadataMigrationRequest;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MetadataMigrationValidationRequest;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationExportRequest;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationView;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ExportResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ValidationResponse;
import org.apache.hertzbeat.manager.setup.workflow.PreparedMigrationExport;
import org.apache.hertzbeat.manager.setup.workflow.StagedMigrationExport;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Transport-only adapter that fails safely until the migration workflow is available. */
@RestController
public final class DeploymentController {

    private final ObjectProvider<DeploymentWorkflow> workflowProvider;

    public DeploymentController(ObjectProvider<DeploymentWorkflow> workflowProvider) {
        this.workflowProvider = workflowProvider;
    }

    @GetMapping(DeploymentApiContract.DEPLOYMENT_PATH)
    public ResponseEntity<DeploymentView> deployment() {
        return SetupHttpContract.noStore().body(workflow().deployment());
    }

    @PostMapping(DeploymentApiContract.VALIDATE_PATH)
    public ResponseEntity<ValidationResponse> validate(
            @Valid @RequestBody MetadataMigrationValidationRequest request) {
        return SetupHttpContract.noStore().body(workflow().validate(request));
    }

    @PostMapping(DeploymentApiContract.MIGRATION_PATH)
    public ResponseEntity<MigrationView> migrate(@Valid @RequestBody MetadataMigrationRequest request) {
        return SetupHttpContract.noStore().body(workflow().migrate(request));
    }

    @GetMapping(DeploymentApiContract.MIGRATION_OPERATION_PATH)
    public ResponseEntity<MigrationView> migration(@PathVariable String operationId) {
        requireOperationId(operationId);
        MigrationView migration = workflow().migration(operationId);
        if (migration == null) {
            throw new SetupApiException(SetupApiContract.SetupErrorCode.OPERATION_NOT_FOUND, HttpStatus.NOT_FOUND);
        }
        return SetupHttpContract.noStore().body(migration);
    }

    @PostMapping(DeploymentApiContract.ACTIVATE_PATH)
    public ResponseEntity<MigrationView> activate(
            @PathVariable String operationId, @Valid @RequestBody ActivateMigrationRequest request) {
        requireOperationId(operationId);
        return SetupHttpContract.noStore().body(workflow().activate(operationId, request));
    }

    @PostMapping(DeploymentApiContract.EXPORT_PATH)
    public void export(
            @PathVariable String operationId, @Valid @RequestBody MigrationExportRequest request,
            HttpServletResponse response) throws IOException {
        requireOperationId(operationId);
        boolean responseMutated = false;
        try (PreparedMigrationExport prepared = workflow().prepareExport(operationId, request);
                StagedMigrationExport staged = prepared.stage()) {
            ExportResponse metadata = staged.metadata();
            responseMutated = true;
            response.setHeader("Cache-Control", "no-store");
            response.setHeader("Content-Disposition", "attachment; filename=\"" + metadata.fileName() + "\"");
            response.setContentType(metadata.mediaType());
            response.setContentLength(staged.size());
            staged.writeTo(response.getOutputStream());
            response.flushBuffer();
        } catch (IOException | RuntimeException failure) {
            resetUncommitted(response, responseMutated);
            throw failure;
        }
    }

    private DeploymentWorkflow workflow() {
        DeploymentWorkflow workflow = workflowProvider.getIfUnique();
        if (workflow == null) {
            throw unavailable();
        }
        return workflow;
    }

    private void requireOperationId(String operationId) {
        if (!OperationIdValidator.isSafe(operationId)) {
            throw new SetupApiException(SetupApiContract.SetupErrorCode.INVALID_REQUEST, HttpStatus.BAD_REQUEST);
        }
    }

    private SetupApiException unavailable() {
        return new SetupApiException(
                SetupApiContract.SetupErrorCode.MIGRATION_UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE);
    }

    private void resetUncommitted(HttpServletResponse response, boolean responseMutated) {
        if (!responseMutated) {
            return;
        }
        try {
            if (!response.isCommitted()) {
                response.reset();
            }
        } catch (RuntimeException ignored) {
            // Preserve the original safe transport failure; response rollback is best effort.
        }
    }

}
