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

package org.apache.hertzbeat.ai.gateway.contract;

import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Objects;
import lombok.Builder;

/**
 * Trusted, non-persistent identifiers describing one automatically correlated alert incident.
 */
@Builder
public record AgentAlertIncidentContext(
        Long analysisPolicyId,
        Long triggerAlertId,
        @Size(max = 256) List<Long> alertIds,
        int alertCount,
        long windowStartedAt) {

    public AgentAlertIncidentContext {
        analysisPolicyId = Objects.requireNonNull(analysisPolicyId, "Analysis policy id is required");
        alertIds = alertIds == null ? List.of() : List.copyOf(alertIds);
        if (alertIds.size() > 256) {
            throw new IllegalArgumentException("Alert incident supports at most 256 alert ids");
        }
        if (alertIds.stream().anyMatch(Objects::isNull)) {
            throw new IllegalArgumentException("Alert incident ids must not contain null values");
        }
        if (alertCount <= 0) {
            throw new IllegalArgumentException("Alert incident count must be positive");
        }
        if (windowStartedAt < 0) {
            throw new IllegalArgumentException("Alert incident window start must not be negative");
        }
    }
}
