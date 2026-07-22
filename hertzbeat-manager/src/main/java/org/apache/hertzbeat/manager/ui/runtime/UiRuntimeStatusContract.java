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

package org.apache.hertzbeat.manager.ui.runtime;

import com.fasterxml.jackson.annotation.JsonValue;
import java.time.Instant;
import java.util.Objects;

/** Version 1 public contract for the UI runtime-status endpoint. */
public final class UiRuntimeStatusContract {

    public static final int CURRENT_SCHEMA_VERSION = 1;

    private UiRuntimeStatusContract() {
    }

    /** Complete versioned runtime-status response. */
    public record RuntimeStatusResponse(int schemaVersion, Instant observedAt, ComponentStatus server,
                                        StorageStatus storage, CollectorsStatus collectors) {

        public RuntimeStatusResponse {
            if (schemaVersion != CURRENT_SCHEMA_VERSION) {
                throw new IllegalArgumentException("Unsupported UI runtime-status schema version");
            }
            Objects.requireNonNull(observedAt, "observedAt");
            Objects.requireNonNull(server, "server");
            Objects.requireNonNull(storage, "storage");
            Objects.requireNonNull(collectors, "collectors");
        }
    }

    /** Status of the HertzBeat Server process surface. */
    public record ComponentStatus(State status, ErrorCode errorCode) {

        public ComponentStatus {
            validateStatus(status, errorCode);
        }
    }

    /** Status of the configured telemetry storage. */
    public record StorageStatus(StorageKind kind, State status, ErrorCode errorCode) {

        public StorageStatus {
            Objects.requireNonNull(kind, "kind");
            validateStatus(status, errorCode);
        }
    }

    /** Aggregate Collector availability without telemetry payloads or credentials. */
    public record CollectorsStatus(State status, Integer total, Integer online, Integer runtimeHealthy,
                                   Instant lastReportedAt, ErrorCode errorCode) {

        public CollectorsStatus {
            validateStatus(status, errorCode);
            if (status == State.AVAILABLE || status == State.DEGRADED) {
                requireNonNegative(total, "total");
                requireNonNegative(online, "online");
                requireNonNegative(runtimeHealthy, "runtimeHealthy");
                if (online > total || runtimeHealthy > online) {
                    throw new IllegalArgumentException("Collector runtime counts must be internally consistent");
                }
            } else if (total != null || online != null || runtimeHealthy != null || lastReportedAt != null) {
                throw new IllegalArgumentException("Unknown Collector status cannot expose inferred counts");
            }
        }
    }

    private static void validateStatus(State status, ErrorCode errorCode) {
        Objects.requireNonNull(status, "status");
        if (status == State.AVAILABLE && errorCode != null) {
            throw new IllegalArgumentException("Available runtime status cannot have an error code");
        }
        if ((status == State.DEGRADED || status == State.UNAVAILABLE) && errorCode == null) {
            throw new IllegalArgumentException("Degraded or unavailable runtime status requires a safe error code");
        }
    }

    private static void requireNonNegative(Integer value, String label) {
        if (value == null || value < 0) {
            throw new IllegalArgumentException(label + " must be non-negative when Collector status is observed");
        }
    }

    /** Availability state shared by the three runtime-status sections. */
    public enum State {
        AVAILABLE("available"),
        DEGRADED("degraded"),
        UNAVAILABLE("unavailable"),
        UNKNOWN("unknown");

        private final String code;

        State(String code) {
            this.code = code;
        }

        @JsonValue
        public String code() {
            return code;
        }
    }

    /** Supported telemetry storage kind. */
    public enum StorageKind {
        GREPTIME("greptime");

        private final String code;

        StorageKind(String code) {
            this.code = code;
        }

        @JsonValue
        public String code() {
            return code;
        }
    }

    /** Stable and non-sensitive runtime-status error reasons. */
    public enum ErrorCode {
        SERVER_UNAVAILABLE("server_unavailable"),
        STORAGE_UNAVAILABLE("storage_unavailable"),
        STORAGE_QUERY_FAILED("storage_query_failed"),
        COLLECTOR_STATUS_UNAVAILABLE("collector_status_unavailable");

        private final String code;

        ErrorCode(String code) {
            this.code = code;
        }

        @JsonValue
        public String code() {
            return code;
        }
    }
}
