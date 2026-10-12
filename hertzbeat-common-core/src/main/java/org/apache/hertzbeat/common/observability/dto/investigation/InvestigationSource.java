/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.common.observability.dto.investigation;

import com.fasterxml.jackson.annotation.JsonValue;

/** Physical evidence source exposed by the investigation contract. */
public enum InvestigationSource {
    PERSISTED_ALERT("persisted_alert"),
    GREPTIME_TRACES("greptime_traces"),
    GREPTIME_LOGS("greptime_logs"),
    GREPTIME_FLOW("greptime_flow"),
    GREPTIME_SEMANTIC_GRAPH("greptime_semantic_graph"),
    GREPTIME_COLLECTION_EVENTS("greptime_collection_events"),
    OTLP_METRICS("otlp_metrics");

    private final String code;

    InvestigationSource(String code) {
        this.code = code;
    }

    @JsonValue
    public String code() {
        return code;
    }
}
