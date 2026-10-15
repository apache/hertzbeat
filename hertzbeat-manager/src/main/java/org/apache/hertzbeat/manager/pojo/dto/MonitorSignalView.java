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
 * Honest bounded investigation view for one persisted Monitor.
 */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record MonitorSignalView(long monitorId,
                                Window window,
                                CollectionBlock collection,
                                AlertsBlock alerts,
                                BindingBlock binding) {

    public MonitorSignalView {
        if (monitorId <= 0L) {
            throw new IllegalArgumentException("monitorId must be positive");
        }
        window = Objects.requireNonNull(window, "window");
        collection = Objects.requireNonNull(collection, "collection");
        alerts = Objects.requireNonNull(alerts, "alerts");
        binding = Objects.requireNonNull(binding, "binding");
    }

    /** Evidence availability without collapsing failure into no data. */
    public enum EvidenceState {
        READY("ready"),
        EMPTY("empty"),
        UNAVAILABLE("unavailable");

        private final String code;

        EvidenceState(String code) {
            this.code = code;
        }

        @JsonValue
        public String code() {
            return code;
        }
    }

    /** Exact requested start-inclusive, end-exclusive window. */
    public record Window(long start, long end) {
    }

    /** Latest persisted native collection execution evidence. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record CollectionBlock(EvidenceState state, String source, CollectionEvent event) {

        private static final String SOURCE = "greptime_collection_events";

        public CollectionBlock {
            state = Objects.requireNonNull(state, "state");
            source = Objects.requireNonNull(source, "source");
            if ((state == EvidenceState.READY) != (event != null)) {
                throw new IllegalArgumentException("Only ready collection evidence may carry an event");
            }
        }

        public static CollectionBlock ready(CollectionEvent event) {
            return new CollectionBlock(EvidenceState.READY, SOURCE, Objects.requireNonNull(event, "event"));
        }

        public static CollectionBlock empty() {
            return new CollectionBlock(EvidenceState.EMPTY, SOURCE, null);
        }

        public static CollectionBlock unavailable() {
            return new CollectionBlock(EvidenceState.UNAVAILABLE, SOURCE, null);
        }
    }

    /** Strictly typed bounded collection event. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record CollectionEvent(long observedAt,
                                  long durationMillis,
                                  String outcome,
                                  String collectorId,
                                  String target,
                                  String metricSet,
                                  String failureClass,
                                  String phase,
                                  int fieldCount,
                                  int rowCount) {
    }

    /** Exact current active-alert count and bounded previews, never alert history. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record AlertsBlock(EvidenceState state,
                              String source,
                              String scope,
                              Long activeCount,
                              List<AlertPreview> previews) {

        private static final String SOURCE = "current_alerts";
        private static final String SCOPE = "current";

        public AlertsBlock {
            state = Objects.requireNonNull(state, "state");
            source = Objects.requireNonNull(source, "source");
            scope = Objects.requireNonNull(scope, "scope");
            previews = previews == null ? List.of() : List.copyOf(previews);
            if (previews.size() > 5) {
                throw new IllegalArgumentException("Alert previews exceed the contract bound");
            }
            if (activeCount != null && activeCount < previews.size()) {
                throw new IllegalArgumentException("Alert preview count exceeds the exact active count");
            }
            if (state == EvidenceState.READY && (activeCount == null || activeCount <= 0L || previews.isEmpty())) {
                throw new IllegalArgumentException("Ready alerts require an exact positive count and previews");
            }
            if (state == EvidenceState.EMPTY && (activeCount == null || activeCount != 0L || !previews.isEmpty())) {
                throw new IllegalArgumentException("Empty alerts require an exact zero count");
            }
            if (state == EvidenceState.UNAVAILABLE && (activeCount != null || !previews.isEmpty())) {
                throw new IllegalArgumentException("Unavailable alerts cannot carry evidence");
            }
        }

        public static AlertsBlock ready(long activeCount, List<AlertPreview> previews) {
            return new AlertsBlock(EvidenceState.READY, SOURCE, SCOPE, activeCount, previews);
        }

        public static AlertsBlock empty() {
            return new AlertsBlock(EvidenceState.EMPTY, SOURCE, SCOPE, 0L, List.of());
        }

        public static AlertsBlock unavailable() {
            return new AlertsBlock(EvidenceState.UNAVAILABLE, SOURCE, SCOPE, null, List.of());
        }
    }

    /** Minimal current active-alert preview. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record AlertPreview(long id,
                               String status,
                               String severity,
                               String summary,
                               Long activeAt) {
    }

    /** Exact visible Entity binding and observed OTLP signals. */
    @JsonInclude(JsonInclude.Include.ALWAYS)
    public record BindingBlock(EvidenceState state, MonitorInvestigationBindingInfo identity) {

        public BindingBlock {
            state = Objects.requireNonNull(state, "state");
            if ((state == EvidenceState.READY) != (identity != null)) {
                throw new IllegalArgumentException("Only a ready binding may carry identity");
            }
        }

        public static BindingBlock ready(MonitorInvestigationBindingInfo identity) {
            return new BindingBlock(EvidenceState.READY, Objects.requireNonNull(identity, "identity"));
        }

        public static BindingBlock empty() {
            return new BindingBlock(EvidenceState.EMPTY, null);
        }

        public static BindingBlock unavailable() {
            return new BindingBlock(EvidenceState.UNAVAILABLE, null);
        }
    }
}
