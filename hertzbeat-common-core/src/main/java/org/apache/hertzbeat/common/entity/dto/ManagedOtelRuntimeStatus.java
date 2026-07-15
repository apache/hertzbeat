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
import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;

/**
 * Versioned status reported by the optional managed telemetry runtime.
 *
 * <p>The Java Collector remains online independently of this status. This contract contains no
 * credential value or process-local identifier.</p>
 */
public record ManagedOtelRuntimeStatus(int schemaVersion, boolean enabled, RuntimeState state,
                                       long desiredRevision, long activeRevision,
                                       IntakeCredentialState intakeCredentialState,
                                       int restartCount, Instant changedAt, String lastError,
                                       List<ManagedOtelSourceStatus> sources) {

    public static final int CURRENT_SCHEMA_VERSION = 2;
    private static final int LEGACY_SCHEMA_VERSION = 1;
    private static final int MAXIMUM_DIAGNOSTIC_LENGTH = 512;
    // Active sources plus both sides of one pending/rejected replacement revision.
    private static final int MAXIMUM_SOURCE_STATUSES = 147;
    private static final Pattern SOURCE_NAME = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._-]{0,63}");

    public ManagedOtelRuntimeStatus(int schemaVersion, boolean enabled, RuntimeState state,
                                    long desiredRevision, long activeRevision,
                                    IntakeCredentialState intakeCredentialState,
                                    int restartCount, Instant changedAt, String lastError) {
        this(schemaVersion, enabled, state, desiredRevision, activeRevision, intakeCredentialState,
                restartCount, changedAt, lastError, List.of());
    }

    public ManagedOtelRuntimeStatus {
        if (schemaVersion < LEGACY_SCHEMA_VERSION || schemaVersion > CURRENT_SCHEMA_VERSION) {
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
        sources = sources == null ? List.of() : List.copyOf(sources);
        if (sources.size() > MAXIMUM_SOURCE_STATUSES) {
            throw new IllegalArgumentException("Managed runtime has too many source status entries");
        }
        if (schemaVersion == LEGACY_SCHEMA_VERSION && !sources.isEmpty()) {
            throw new IllegalArgumentException("Source status requires managed runtime status schema 2");
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

    /**
     * One bounded, payload-free source lifecycle entry.
     */
    public record ManagedOtelSourceStatus(SourceType type, String name, long revision,
                                          SourceState state, String lastError) {

        public ManagedOtelSourceStatus {
            type = Objects.requireNonNull(type, "type");
            state = Objects.requireNonNull(state, "state");
            if (name == null || !SOURCE_NAME.matcher(name).matches()) {
                throw new IllegalArgumentException("Managed runtime source name is invalid");
            }
            if (revision < 1) {
                throw new IllegalArgumentException("Managed runtime source revision must be positive");
            }
            lastError = Objects.requireNonNullElse(lastError, "");
            if (lastError.length() > MAXIMUM_DIAGNOSTIC_LENGTH) {
                throw new IllegalArgumentException("Managed runtime source diagnostic is too long");
            }
        }
    }

    /**
     * Supported managed source categories.
     */
    public enum SourceType {
        HOST_METRICS,
        PROMETHEUS,
        FILE_LOG
    }

    /**
     * Lifecycle of one semantic source revision.
     */
    public enum SourceState {
        DESIRED,
        ACTIVE,
        REJECTED
    }
}
