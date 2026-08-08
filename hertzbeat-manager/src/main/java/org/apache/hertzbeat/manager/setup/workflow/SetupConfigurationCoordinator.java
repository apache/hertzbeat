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

package org.apache.hertzbeat.manager.setup.workflow;

import java.io.IOException;
import org.apache.hertzbeat.manager.setup.api.SetupApiException;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigurationRequest;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ConfigurationResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupOperationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigCapability;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigurationTransaction;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigurationBundle;
import org.springframework.http.HttpStatus;

/** Owns required-configuration application and its operation state transitions. */
public final class SetupConfigurationCoordinator {
    private final ManagedConfigurationTransaction transaction;
    private final SetupOperationRegistry operations;

    public SetupConfigurationCoordinator(
            ManagedConfigurationTransaction transaction, SetupOperationRegistry operations) {
        this.transaction = transaction;
        this.operations = operations;
    }

    public ConfigurationResponse configure(ConfigurationRequest request, ManagedConfigCapability capability) {
        if (request.expectedPhase() != SetupPhase.CONFIGURATION_REQUIRED
                || request.applyMode() != capability.applyMode()) {
            throw new SetupWorkflowConflict();
        }
        String operationId = operations.begin(SetupPhase.CONFIGURATION_REQUIRED);
        if (request.applyMode() == ApplyMode.EXTERNAL_APPLY) {
            operations.finish(operationId, SetupOperationState.AWAITING_EXTERNAL_APPLY,
                    SetupPhase.EXTERNAL_APPLY_REQUIRED, null, true);
            return response(operationId);
        }
        try {
            return applyManaged(operationId, request);
        } catch (IOException failure) {
            operations.finish(operationId, SetupOperationState.FAILED,
                    SetupPhase.CONFIGURATION_REQUIRED, SetupErrorCode.CONFIG_WRITE_FAILED, false);
            throw new SetupApiException(SetupErrorCode.CONFIG_WRITE_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    public ConfigurationResponse configure(HeadlessSetupWorkflow.RequiredConfiguration request,
                                           ManagedConfigurationBundle bundle,
                                           ManagedConfigCapability capability) {
        try (bundle) {
            if (request.applyMode() != capability.applyMode()) {
                throw new SetupWorkflowConflict();
            }
            String operationId = operations.begin(SetupPhase.CONFIGURATION_REQUIRED);
            if (request.applyMode() == ApplyMode.EXTERNAL_APPLY) {
                operations.finish(operationId, SetupOperationState.AWAITING_EXTERNAL_APPLY,
                        SetupPhase.EXTERNAL_APPLY_REQUIRED, null, true);
                return response(operationId);
            }
            try {
                return applyManaged(operationId, bundle);
            } catch (IOException failure) {
                operations.finish(operationId, SetupOperationState.FAILED,
                        SetupPhase.CONFIGURATION_REQUIRED, SetupErrorCode.CONFIG_WRITE_FAILED, false);
                throw new SetupApiException(SetupErrorCode.CONFIG_WRITE_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
            }
        }
    }

    private ConfigurationResponse applyManaged(String operationId, ConfigurationRequest request) throws IOException {
        try (ManagedConfigurationBundle bundle = SetupConfigurationMapper.map(request)) {
            return applyManaged(operationId, bundle);
        }
    }

    private ConfigurationResponse applyManaged(String operationId, ManagedConfigurationBundle bundle)
            throws IOException {
        ManagedConfigurationTransaction.Outcome outcome = transaction.apply(bundle);
        if (outcome == ManagedConfigurationTransaction.Outcome.RECOVERY_REQUIRED) {
            operations.finish(operationId, SetupOperationState.FAILED,
                    SetupPhase.RECOVERY_REQUIRED, SetupErrorCode.CONFIG_RECOVERY_REQUIRED, false);
            throw new SetupApiException(SetupErrorCode.CONFIG_RECOVERY_REQUIRED, HttpStatus.CONFLICT);
        }
        if (outcome != ManagedConfigurationTransaction.Outcome.APPLIED) {
            operations.finish(operationId, SetupOperationState.ROLLED_BACK,
                    SetupPhase.CONFIGURATION_REQUIRED, SetupErrorCode.CONFIG_WRITE_FAILED, false);
            throw new SetupApiException(SetupErrorCode.CONFIG_WRITE_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
        }
        operations.finish(operationId, SetupOperationState.AWAITING_RESTART,
                SetupPhase.APPLICATION_STARTING, null, false);
        return response(operationId);
    }

    private ConfigurationResponse response(String operationId) {
        var operation = operations.get(operationId);
        return new ConfigurationResponse(operation.operationId(), operation.state(), operation.phase(),
                operation.nextPollAfterMillis(), operation.exportAvailable());
    }
}
