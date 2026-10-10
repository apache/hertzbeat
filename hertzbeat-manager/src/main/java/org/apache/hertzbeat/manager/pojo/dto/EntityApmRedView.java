/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.pojo.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.List;
import java.util.Objects;

/**
 * Honest entity-scoped APM RED read contract backed by the Greptime Flow rollup.
 */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record EntityApmRedView(State state,
                               String source,
                               int resolutionSeconds,
                               Window window,
                               Identity identity,
                               RedSummary summary,
                               List<RedPoint> series) {

    private static final String GREPTIME_FLOW = "greptime_flow";
    private static final int RESOLUTION_SECONDS = 60;

    public EntityApmRedView {
        state = Objects.requireNonNull(state, "state");
        source = Objects.requireNonNull(source, "source");
        window = Objects.requireNonNull(window, "window");
        identity = Objects.requireNonNull(identity, "identity");
        series = series == null ? List.of() : List.copyOf(series);
        if (state == State.READY && (summary == null || series.isEmpty())) {
            throw new IllegalArgumentException("Ready APM RED view requires observed values");
        }
        if (state != State.READY && (summary != null || !series.isEmpty())) {
            throw new IllegalArgumentException("Non-ready APM RED view cannot contain values");
        }
    }

    public static EntityApmRedView ready(long start,
                                         long end,
                                         Identity identity,
                                         RedSummary summary,
                                         List<RedPoint> series) {
        return new EntityApmRedView(
                State.READY, GREPTIME_FLOW, RESOLUTION_SECONDS,
                new Window(start, end), identity, summary, series);
    }

    public static EntityApmRedView empty(long start, long end, Identity identity) {
        return new EntityApmRedView(
                State.EMPTY, GREPTIME_FLOW, RESOLUTION_SECONDS,
                new Window(start, end), identity, null, List.of());
    }

    public static EntityApmRedView unavailable(long start, long end, Identity identity) {
        return new EntityApmRedView(
                State.UNAVAILABLE, GREPTIME_FLOW, RESOLUTION_SECONDS,
                new Window(start, end), identity, null, List.of());
    }

    /** Availability state that does not collapse storage failure into no data. */
    public enum State {
        READY("ready"),
        EMPTY("empty"),
        UNAVAILABLE("unavailable");

        private final String code;

        State(String code) {
            this.code = code;
        }

        @JsonValue
        public String code() {
            return code;
        }
    }

    /** Exact requested time range, start-inclusive and end-exclusive. */
    public record Window(long start, long end) {
    }

    /** Trusted entity and canonical service identity used for the storage query. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record Identity(String workspaceId,
                           String entityId,
                           String entityType,
                           String serviceName,
                           String serviceNamespace,
                           String deploymentEnvironment) {
    }

    /** RED values aggregated across the requested window. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record RedSummary(long requestCount,
                             long errorCount,
                             double requestRatePerSecond,
                             double errorRate,
                             Double latencyAverageMs,
                             Double latencyP95Ms) {
    }

    /** RED values for one Flow-owned minute bucket. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record RedPoint(long timestamp,
                           long requestCount,
                           long errorCount,
                           double requestRatePerSecond,
                           double errorRate,
                           Double latencyAverageMs,
                           Double latencyP95Ms) {
    }
}
