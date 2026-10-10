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
import java.util.Objects;

/** Honest availability state for one investigation evidence block. */
public enum InvestigationEvidenceState {
    READY("ready"),
    EMPTY("empty"),
    UNAVAILABLE("unavailable");

    private final String code;

    InvestigationEvidenceState(String code) {
        this.code = code;
    }

    @JsonValue
    public String code() {
        return code;
    }

    static void validate(InvestigationEvidenceState state, InvestigationReason reason) {
        Objects.requireNonNull(state, "state");
        Objects.requireNonNull(reason, "reason");
        boolean valid = switch (state) {
            case READY -> reason == InvestigationReason.OBSERVED;
            case EMPTY -> reason == InvestigationReason.NO_DATA
                    || reason == InvestigationReason.NOT_FOUND
                    || reason == InvestigationReason.NOT_CORRELATED;
            case UNAVAILABLE -> reason == InvestigationReason.STORAGE_UNAVAILABLE
                    || reason == InvestigationReason.MALFORMED_DATA
                    || reason == InvestigationReason.LIMIT_EXCEEDED
                    || reason == InvestigationReason.IDENTITY_UNAVAILABLE
                    || reason == InvestigationReason.UPSTREAM_UNAVAILABLE
                    || reason == InvestigationReason.QUERY_STRATEGY_UNAVAILABLE;
        };
        if (!valid) {
            throw new IllegalArgumentException("Investigation state and reason are inconsistent");
        }
    }
}
