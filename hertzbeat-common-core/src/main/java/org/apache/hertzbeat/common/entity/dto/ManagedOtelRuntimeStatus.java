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
 * <p>The Java Collector remains online independently of this status. The optional child PID is
 * operational metadata; this contract contains no credential or telemetry payload value.</p>
 */
public record ManagedOtelRuntimeStatus(int schemaVersion, boolean enabled, RuntimeState state,
                                       long desiredRevision, long activeRevision,
                                       long pid,
                                       IntakeCredentialState intakeCredentialState,
                                       int restartCount, Instant changedAt, String lastError,
                                       FailureCode failureCode, RuntimeTelemetry telemetry,
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
        this(schemaVersion, enabled, state, desiredRevision, activeRevision, -1,
                intakeCredentialState, restartCount, changedAt, lastError, FailureCode.NONE,
                RuntimeTelemetry.unavailable(false), List.of());
    }

    public ManagedOtelRuntimeStatus(int schemaVersion, boolean enabled, RuntimeState state,
                                    long desiredRevision, long activeRevision,
                                    IntakeCredentialState intakeCredentialState,
                                    int restartCount, Instant changedAt, String lastError,
                                    List<ManagedOtelSourceStatus> sources) {
        this(schemaVersion, enabled, state, desiredRevision, activeRevision, -1,
                intakeCredentialState, restartCount, changedAt, lastError, FailureCode.NONE,
                RuntimeTelemetry.unavailable(hasFileSource(sources)), sources);
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
        if (pid == 0) {
            pid = -1;
        }
        if (pid < -1) {
            throw new IllegalArgumentException("Managed runtime process identifier is invalid");
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
        failureCode = Objects.requireNonNullElse(failureCode, FailureCode.NONE);
        telemetry = telemetry == null ? RuntimeTelemetry.unavailable(hasFileSource(sources)) : telemetry;
    }

    private static boolean hasFileSource(List<ManagedOtelSourceStatus> sources) {
        return sources != null && sources.stream().anyMatch(source -> source.type() == SourceType.FILE_LOG);
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
     * Stable operational failure categories. Free-form diagnostics remain optional and bounded.
     */
    public enum FailureCode {
        NONE,
        CONFIGURATION_ERROR,
        PORT_CONFLICT,
        BACKEND_UNAVAILABLE,
        AUTHENTICATION_FAILED,
        QUEUE_FULL,
        STORAGE_FULL,
        STORAGE_CORRUPTED,
        PROCESS_CRASH,
        UNKNOWN
    }

    /**
     * Availability of one numeric runtime metric. Zero is meaningful only when available.
     */
    public enum ValueState {
        AVAILABLE,
        UNAVAILABLE,
        NOT_APPLICABLE
    }

    /**
     * One non-negative operational value with explicit availability.
     */
    public record ObservedLong(ValueState state, long value) {

        public ObservedLong {
            state = Objects.requireNonNull(state, "state");
            if (value < 0 || state != ValueState.AVAILABLE && value != 0) {
                throw new IllegalArgumentException("Managed runtime metric value is invalid");
            }
        }

        public static ObservedLong available(long value) {
            return new ObservedLong(ValueState.AVAILABLE, value);
        }

        public static ObservedLong unavailable() {
            return new ObservedLong(ValueState.UNAVAILABLE, 0);
        }

        public static ObservedLong notApplicable() {
            return new ObservedLong(ValueState.NOT_APPLICABLE, 0);
        }
    }

    /**
     * Per-signal counters without telemetry payload content.
     */
    public record SignalCounters(ObservedLong metrics, ObservedLong logs, ObservedLong traces) {

        public SignalCounters {
            metrics = Objects.requireNonNull(metrics, "metrics");
            logs = Objects.requireNonNull(logs, "logs");
            traces = Objects.requireNonNull(traces, "traces");
        }

        public static SignalCounters unavailable() {
            return new SignalCounters(
                    ObservedLong.unavailable(), ObservedLong.unavailable(), ObservedLong.unavailable());
        }
    }

    /**
     * Per-signal operational gauges. These values contain no telemetry payload content.
     */
    public record SignalGauges(ObservedLong metrics, ObservedLong logs, ObservedLong traces) {

        public SignalGauges {
            metrics = Objects.requireNonNull(metrics, "metrics");
            logs = Objects.requireNonNull(logs, "logs");
            traces = Objects.requireNonNull(traces, "traces");
        }

        public static SignalGauges unavailable() {
            return new SignalGauges(
                    ObservedLong.unavailable(), ObservedLong.unavailable(), ObservedLong.unavailable());
        }
    }

    /**
     * File consumer gauges without file paths or log records.
     */
    public record FileConsumerStatus(ObservedLong openFiles, ObservedLong readingFiles) {

        public FileConsumerStatus {
            openFiles = Objects.requireNonNull(openFiles, "openFiles");
            readingFiles = Objects.requireNonNull(readingFiles, "readingFiles");
        }

        public static FileConsumerStatus unavailable() {
            return new FileConsumerStatus(ObservedLong.unavailable(), ObservedLong.unavailable());
        }

        public static FileConsumerStatus notApplicable() {
            return new FileConsumerStatus(ObservedLong.notApplicable(), ObservedLong.notApplicable());
        }
    }

    /**
     * Bounded internal telemetry carried by the existing heartbeat channel.
     */
    public record RuntimeTelemetry(SignalCounters accepted, SignalCounters refused,
                                   SignalCounters sent, SignalCounters failed,
                                   ObservedLong queueSize, ObservedLong queueCapacity,
                                   FileConsumerStatus fileConsumer,
                                   SignalGauges queueSizeBySignal,
                                   SignalGauges queueCapacityBySignal,
                                   SignalCounters enqueueFailed,
                                   SignalCounters sendFailed) {

        public RuntimeTelemetry(SignalCounters accepted, SignalCounters refused,
                                SignalCounters sent, SignalCounters failed,
                                ObservedLong queueSize, ObservedLong queueCapacity,
                                FileConsumerStatus fileConsumer) {
            this(accepted, refused, sent, failed, queueSize, queueCapacity, fileConsumer,
                    SignalGauges.unavailable(), SignalGauges.unavailable(),
                    SignalCounters.unavailable(), SignalCounters.unavailable());
        }

        public RuntimeTelemetry {
            accepted = Objects.requireNonNull(accepted, "accepted");
            refused = Objects.requireNonNull(refused, "refused");
            sent = Objects.requireNonNull(sent, "sent");
            failed = Objects.requireNonNull(failed, "failed");
            queueSize = Objects.requireNonNull(queueSize, "queueSize");
            queueCapacity = Objects.requireNonNull(queueCapacity, "queueCapacity");
            fileConsumer = Objects.requireNonNull(fileConsumer, "fileConsumer");
            queueSizeBySignal = queueSizeBySignal == null ? SignalGauges.unavailable() : queueSizeBySignal;
            queueCapacityBySignal = queueCapacityBySignal == null
                    ? SignalGauges.unavailable()
                    : queueCapacityBySignal;
            enqueueFailed = enqueueFailed == null ? SignalCounters.unavailable() : enqueueFailed;
            sendFailed = sendFailed == null ? SignalCounters.unavailable() : sendFailed;
        }

        public static RuntimeTelemetry unavailable(boolean fileConsumerConfigured) {
            return new RuntimeTelemetry(
                    SignalCounters.unavailable(),
                    SignalCounters.unavailable(),
                    SignalCounters.unavailable(),
                    SignalCounters.unavailable(),
                    ObservedLong.unavailable(),
                    ObservedLong.unavailable(),
                    fileConsumerConfigured ? FileConsumerStatus.unavailable() : FileConsumerStatus.notApplicable(),
                    SignalGauges.unavailable(),
                    SignalGauges.unavailable(),
                    SignalCounters.unavailable(),
                    SignalCounters.unavailable());
        }
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
