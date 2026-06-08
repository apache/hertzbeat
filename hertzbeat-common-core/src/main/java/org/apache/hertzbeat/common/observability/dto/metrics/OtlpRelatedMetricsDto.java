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

package org.apache.hertzbeat.common.observability.dto.metrics;

import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Backend-owned related metrics discovery for a signal/resource context.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class OtlpRelatedMetricsDto {

    private OtlpMetricsConsoleDto.Context context;

    private String filter;

    private String source;

    private int candidateCount;

    private List<ResourceMatcher> resourceMatchers;

    private List<Candidate> candidates;

    /**
     * Parsed resource matcher used to correlate metrics with logs or traces.
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ResourceMatcher {

        private String label;

        private String operator;

        private String value;
    }

    /**
     * Related metric candidate that can be queried by the metrics console.
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Candidate {

        private String query;

        private String source;

        private String family;

        private String reason;

        private List<String> matchedLabels;

        private Map<String, String> resourceMatch;
    }
}
