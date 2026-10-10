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

import java.time.Instant;
import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.workflow.FileMigrationOperationStore.ExactTransitionDisposition;

/** Durably records only migration failures whose resource cleanup is already known to be complete. */
final class DurableCutoverFailureFinalizer {

    private final FileMigrationOperationStore store;

    DurableCutoverFailureFinalizer(FileMigrationOperationStore store) {
        this.store = Objects.requireNonNull(store, "store");
    }

    Disposition finalizeFailure(
            String operationId, DurableKnownFailure failure, Instant completedAt) {
        Objects.requireNonNull(failure, "failure");
        Objects.requireNonNull(completedAt, "completedAt");
        ExactTransitionDisposition result = store.transformAndTransitionOrConfirmDisposition(
                operationId, current -> replacement(current, failure, completedAt));
        return result == ExactTransitionDisposition.TRANSITIONED
                ? Disposition.TRANSITIONED : Disposition.ALREADY_CONFIRMED;
    }

    private MigrationOperationSnapshot replacement(
            MigrationOperationSnapshot current, DurableKnownFailure failure, Instant completedAt) {
        DurableKnownFailure resolved = failure.resolve(current);
        if (current.state() == MigrationOperationState.FAILED) {
            if (current.errorCode() == resolved.errorCode() && current.completedAt().equals(completedAt)) {
                return current;
            }
            throw conflict();
        }
        if (current.state() != MigrationOperationState.RUNNING
                || current.stage() != resolved.requiredStage()) {
            throw conflict();
        }
        if (completedAt.isBefore(current.startedAt())) {
            throw new IllegalArgumentException("Invalid migration completion time");
        }
        return new MigrationOperationSnapshot(
                current.operationId(), MigrationOperationState.FAILED, current.target(), current.applyMode(),
                MigrationStage.FAILED, resolved.progress(current), current.createdAt(), current.startedAt(),
                completedAt, resolved.verificationState(), resolved.errorCode(), null, 0,
                false, false, false, current.targetIdentityHash(), current.managedCandidateGeneration());
    }

    private static MigrationOperationStoreException conflict() {
        return new MigrationOperationStoreException(SetupErrorCode.OPERATION_CONFLICT);
    }

    enum Disposition { TRANSITIONED, ALREADY_CONFIRMED }
}
