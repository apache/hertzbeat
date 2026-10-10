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
import java.util.Objects;

/** Pins and retries one exact durable known-cleanup failure replacement. */
final class MigrationFailureFinalization {

    private final String operationId;
    private final DurableCutoverFailureFinalizer finalizer;
    private final Clock clock;
    private DurableKnownFailure pendingFailure;
    private Instant completedAt;

    MigrationFailureFinalization(
            String operationId, FileMigrationOperationStore store, Clock clock) {
        this.operationId = Objects.requireNonNull(operationId, "operationId");
        finalizer = new DurableCutoverFailureFinalizer(store);
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    void finalizeKnown(MetadataMigrationException failure) {
        DurableKnownFailure known = switch (failure.code()) {
            case SCHEMA, COPY, VERIFICATION, SEQUENCE -> DurableKnownFailure.CURRENT_PHASE;
            default -> null;
        };
        if (known == null) {
            return;
        }
        synchronized (this) {
            if (pendingFailure == null) {
                pendingFailure = known;
                completedAt = clock.instant();
            }
        }
        retry();
    }

    void retry() {
        DurableKnownFailure known;
        Instant pinnedCompletedAt;
        synchronized (this) {
            known = Objects.requireNonNull(pendingFailure, "pendingFailure");
            pinnedCompletedAt = Objects.requireNonNull(completedAt, "completedAt");
        }
        finalizer.finalizeFailure(operationId, known, pinnedCompletedAt);
        synchronized (this) {
            pendingFailure = null;
            completedAt = null;
        }
    }

    synchronized boolean pending() {
        return pendingFailure != null;
    }
}
