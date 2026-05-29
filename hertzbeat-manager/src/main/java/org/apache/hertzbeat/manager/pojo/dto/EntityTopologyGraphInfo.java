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

package org.apache.hertzbeat.manager.pojo.dto;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * API-backed topology graph payload.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class EntityTopologyGraphInfo {

    private boolean apiBacked;

    private Long focusEntityId;

    private int depth;

    private List<String> sourceKinds = new ArrayList<>();

    private List<Node> nodes = new ArrayList<>();

    private List<Edge> edges = new ArrayList<>();

    private List<TimelineEvent> impactTimeline = new ArrayList<>();

    /**
     * RED metrics attached to topology nodes and edges.
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class RedMetrics {

        private Double requestRatePerSecond;

        private Long requestCount;

        private Double errorRate;

        private Long errorCount;

        private Double latencyP95Ms;

        private Double latencyAvgMs;
    }

    /**
     * Topology node derived from an observable entity.
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Node {

        private String id;

        private Long entityId;

        private String entityName;

        private String entityType;

        private String namespace;

        private String environment;

        private String health;

        private boolean focus;

        private List<String> evidenceBadges = new ArrayList<>();

        private RedMetrics redMetrics = new RedMetrics();
    }

    /**
     * Topology edge derived from persisted relation evidence.
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Edge {

        private String id;

        private Long relationId;

        private String sourceNodeId;

        private String targetNodeId;

        private Long sourceEntityId;

        private Long targetEntityId;

        private String targetRef;

        private String sampleTraceId;

        private String sampleSpanId;

        private String firstSeen;

        private String lastSeen;

        private String relationType;

        private String relationSource;

        private String status;

        private Integer score;

        private List<String> evidenceBadges = new ArrayList<>();

        private RedMetrics redMetrics = new RedMetrics();
    }

    /**
     * Timeline evidence used to explain topology impact changes.
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class TimelineEvent {

        private String id;

        private String edgeId;

        private Long entityId;

        private String sourceKind;

        private String eventType;

        private String title;

        private String detail;

        private String actor;

        private LocalDateTime occurredAt;
    }
}
