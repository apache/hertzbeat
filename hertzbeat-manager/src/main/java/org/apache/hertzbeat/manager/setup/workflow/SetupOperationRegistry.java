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

import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.OperationResponse;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupOperationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupPhase;

/** Bounded, secret-free setup operation registry with one active mutation at a time. */
public final class SetupOperationRegistry {
    private static final int MAX_HISTORY = 64;
    private static final long POLL_AFTER_MILLIS = 1_000;
    private final Clock clock;
    private final SetupOperationCheckpointStore checkpointStore;
    private final SetupPhase recoveredPhase;
    private final Map<String, OperationResponse> operations = new LinkedHashMap<>();
    private String activeOperationId;
    private String restoredCheckpointOperationId;

    public SetupOperationRegistry(Clock clock) {
        this(clock, null, null);
    }

    public SetupOperationRegistry(Clock clock, Path installationRoot, SetupPhase recoveredPhase) {
        this.clock = clock;
        checkpointStore = installationRoot == null ? null : new SetupOperationCheckpointStore(installationRoot);
        this.recoveredPhase = recoveredPhase;
        restoreCheckpoint();
    }

    public synchronized String begin(SetupPhase phase) {
        if (activeOperationId != null) {
            throw new SetupWorkflowConflict();
        }
        String id = UUID.randomUUID().toString();
        Instant now = clock.instant();
        operations.put(id, new OperationResponse(id, SetupOperationState.RUNNING, phase,
                now, now, null, null, POLL_AFTER_MILLIS, false));
        activeOperationId = id;
        trimHistory();
        return id;
    }

    public synchronized String replaceExternalApply(SetupPhase phase) {
        if (activeOperationId == null
                || operations.get(activeOperationId).state() != SetupOperationState.AWAITING_EXTERNAL_APPLY) {
            throw new SetupWorkflowConflict();
        }
        activeOperationId = null;
        return begin(phase);
    }

    public synchronized OperationResponse finish(
            String id, SetupOperationState state, SetupPhase phase, SetupErrorCode errorCode, boolean exportAvailable) {
        OperationResponse current = require(id);
        Instant completedAt = terminal(state) ? clock.instant() : null;
        OperationResponse updated = new OperationResponse(id, state, phase, current.createdAt(),
                current.startedAt(), completedAt, errorCode,
                terminal(state) ? 0 : POLL_AFTER_MILLIS, exportAvailable);
        operations.put(id, updated);
        if (state == SetupOperationState.AWAITING_RESTART) {
            saveCheckpoint(updated);
        }
        if (terminal(state)) {
            activeOperationId = null;
        }
        return updated;
    }

    public synchronized OperationResponse get(String id) {
        OperationResponse operation = operations.get(id);
        if (operation != null && id.equals(restoredCheckpointOperationId) && terminal(operation.state())) {
            // A terminal bridge is consumed only after the rebuilt context exposes it to the caller.
            checkpointStore.delete();
            restoredCheckpointOperationId = null;
        }
        return operation;
    }

    private OperationResponse require(String id) {
        OperationResponse operation = operations.get(id);
        if (operation == null || !id.equals(activeOperationId)) {
            throw new SetupWorkflowConflict();
        }
        return operation;
    }

    private void trimHistory() {
        while (operations.size() > MAX_HISTORY) {
            String first = operations.keySet().iterator().next();
            if (first.equals(activeOperationId)) {
                return;
            }
            operations.remove(first);
        }
    }

    private static boolean terminal(SetupOperationState state) {
        return state == SetupOperationState.SUCCEEDED || state == SetupOperationState.FAILED
                || state == SetupOperationState.ROLLED_BACK;
    }

    private void restoreCheckpoint() {
        if (checkpointStore == null || recoveredPhase == null) {
            return;
        }
        checkpointStore.load().ifPresent(checkpoint -> {
            OperationResponse restored = recoveredOperation(checkpoint.operationId(), checkpoint.createdAt());
            operations.put(checkpoint.operationId(), restored);
            restoredCheckpointOperationId = checkpoint.operationId();
            if (!terminal(restored.state())) {
                activeOperationId = checkpoint.operationId();
            }
        });
    }

    private OperationResponse recoveredOperation(String id, Instant createdAt) {
        Instant now = clock.instant();
        if (recoveredPhase == SetupPhase.RECOVERY_REQUIRED) {
            return new OperationResponse(id, SetupOperationState.FAILED, recoveredPhase,
                    createdAt, createdAt, now, SetupErrorCode.CONFIG_RECOVERY_REQUIRED, 0, false);
        }
        if (recoveredPhase == SetupPhase.ADMINISTRATOR_REQUIRED
                || recoveredPhase == SetupPhase.OPTIONAL_CONFIGURATION
                || recoveredPhase == SetupPhase.COMPLETE) {
            return new OperationResponse(id, SetupOperationState.SUCCEEDED, recoveredPhase,
                    createdAt, createdAt, now, null, 0, false);
        }
        if (recoveredPhase == SetupPhase.APPLICATION_STARTING) {
            return new OperationResponse(id, SetupOperationState.AWAITING_RESTART,
                    recoveredPhase, createdAt, createdAt, null, null, POLL_AFTER_MILLIS, false);
        }
        // A rebuilt context asking for configuration again proves the prior apply did not converge.
        return new OperationResponse(id, SetupOperationState.ROLLED_BACK, recoveredPhase,
                createdAt, createdAt, now, SetupErrorCode.CONFIG_WRITE_FAILED, 0, false);
    }

    private void saveCheckpoint(OperationResponse operation) {
        if (checkpointStore != null) {
            checkpointStore.save(operation.operationId(), operation.createdAt());
        }
    }
}
