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

package org.apache.hertzbeat.common.observability.dto.binding;

import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Canonical identity and entity binding summary for OTLP intake center.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OtlpEntityBindingSummaryDto {

    private List<String> canonicalIdentityKeys;

    private List<String> recentServices;

    private List<CanonicalIdentitySample> recentIdentitySamples;

    private List<BoundEntity> recentBoundEntities;

    private List<UnboundEntityCandidate> recentUnboundCandidates;

    /**
     * Recent canonical identity sample derived from telemetry intake.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CanonicalIdentitySample {
        private String key;
        private String value;
        private String signal;
    }

    /**
     * Recently bound entity surfaced in the OTLP intake center.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BoundEntity {
        private Long entityId;
        private String type;
        private String name;
        private String displayName;
        private String namespace;
        private String primaryIdentityKey;
        private String primaryIdentityValue;
        private long monitorBindCount;
    }

    /**
     * Recent telemetry identity that has not been confirmed as a HertzBeat entity.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UnboundEntityCandidate {
        private String suggestedName;
        private String suggestedType;
        private String namespace;
        private String environment;
        private String primaryIdentityKey;
        private String primaryIdentityValue;
        private List<String> signals;
        private Map<String, String> canonicalIdentities;
        private Long latestObservedAt;
    }
}
