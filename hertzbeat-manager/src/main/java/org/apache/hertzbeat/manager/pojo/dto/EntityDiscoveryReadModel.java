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

import java.util.List;

/**
 * Stable, allowlisted resource-discovery read model for the operator UI.
 */
public record EntityDiscoveryReadModel(
        int schemaVersion,
        int pageIndex,
        int pageSize,
        long totalElements,
        int totalPages,
        List<DiscoveryRow> content) {

    public EntityDiscoveryReadModel {
        content = content == null ? List.of() : List.copyOf(content);
    }

    /**
     * One monitor and its workspace-visible entity candidates.
     */
    public record DiscoveryRow(MonitorSummary monitor, List<Candidate> candidates) {

        public DiscoveryRow {
            candidates = candidates == null ? List.of() : List.copyOf(candidates);
        }
    }

    /**
     * Minimal monitor fields needed by discovery selection.
     */
    public record MonitorSummary(Long id, String name, String app, String instance, byte status) {
    }

    /**
     * Candidate metadata without identity values or matching internals.
     */
    public record Candidate(
            Long resourceId,
            String resourceName,
            String resourceType,
            String match,
            List<String> matchedKeys) {

        public Candidate {
            matchedKeys = matchedKeys == null ? List.of() : List.copyOf(matchedKeys);
        }
    }
}
