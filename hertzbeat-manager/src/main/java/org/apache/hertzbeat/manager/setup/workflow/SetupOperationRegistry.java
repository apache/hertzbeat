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
    private final Map<String, OperationResponse> operations = new LinkedHashMap<>();
    private String activeOperationId;

    public SetupOperationRegistry(Clock clock) {
        this.clock = clock;
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

    public synchronized OperationResponse finish(
            String id, SetupOperationState state, SetupPhase phase, SetupErrorCode errorCode, boolean exportAvailable) {
        OperationResponse current = require(id);
        Instant completedAt = terminal(state) ? clock.instant() : null;
        OperationResponse updated = new OperationResponse(id, state, phase, current.createdAt(),
                current.startedAt(), completedAt, errorCode,
                terminal(state) ? 0 : POLL_AFTER_MILLIS, exportAvailable);
        operations.put(id, updated);
        if (terminal(state)) {
            activeOperationId = null;
        }
        return updated;
    }

    public synchronized OperationResponse get(String id) {
        return operations.get(id);
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
}
