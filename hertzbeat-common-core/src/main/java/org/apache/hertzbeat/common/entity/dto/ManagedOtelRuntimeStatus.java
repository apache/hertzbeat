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

package org.apache.hertzbeat.common.entity.dto;

import java.time.Instant;
import java.util.Objects;

/**
 * Versioned status reported by the optional managed telemetry runtime.
 *
 * <p>The Java Collector remains online independently of this status. This contract contains no
 * credential value or process-local identifier.</p>
 */
public record ManagedOtelRuntimeStatus(int schemaVersion, boolean enabled, RuntimeState state,
                                       long desiredRevision, long activeRevision,
                                       IntakeCredentialState intakeCredentialState,
                                       int restartCount, Instant changedAt, String lastError) {

    public static final int CURRENT_SCHEMA_VERSION = 1;
    private static final int MAXIMUM_DIAGNOSTIC_LENGTH = 512;

    public ManagedOtelRuntimeStatus {
        if (schemaVersion != CURRENT_SCHEMA_VERSION) {
            throw new IllegalArgumentException("Unsupported managed runtime status schema: " + schemaVersion);
        }
        state = Objects.requireNonNull(state, "state");
        intakeCredentialState = Objects.requireNonNull(intakeCredentialState, "intakeCredentialState");
        changedAt = Objects.requireNonNull(changedAt, "changedAt");
        if (desiredRevision < 1 || activeRevision < 0 || restartCount < 0) {
            throw new IllegalArgumentException("Managed runtime revisions and restart count are invalid");
        }
        lastError = Objects.requireNonNullElse(lastError, "");
        if (lastError.length() > MAXIMUM_DIAGNOSTIC_LENGTH) {
            throw new IllegalArgumentException("Managed runtime diagnostic is too long");
        }
    }

    /**
     * Lifecycle of only the optional telemetry runtime.
     */
    public enum RuntimeState {
        STOPPED,
        STARTING,
        RUNNING,
        DEGRADED,
        STOPPING,
        FAILED
    }

    /**
     * Local presence of a managed intake credential; this does not claim successful ingestion.
     */
    public enum IntakeCredentialState {
        NOT_REQUIRED,
        MISSING,
        CONFIGURED
    }
}
