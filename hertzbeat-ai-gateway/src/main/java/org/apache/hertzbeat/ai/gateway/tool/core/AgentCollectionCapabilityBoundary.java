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

package org.apache.hertzbeat.ai.gateway.tool.core;

import org.apache.hertzbeat.common.entity.job.Job;

import java.util.Set;

/**
 * Prevents ordinary tools from reaching code-backed collection without an immutable execution
 * preview.
 */
public final class AgentCollectionCapabilityBoundary {
    private AgentCollectionCapabilityBoundary() {}

    public static void requireNonCode(Job definition) {
        if (definition == null
                || definition.getMetrics() == null
                || definition.getMetrics().isEmpty()
                || definition.getMetrics().stream()
                        .anyMatch(
                                metric ->
                                        metric == null
                                                || metric.getProtocol() == null
                                                || metric.getScript() != null
                                                || metric.getSsh() != null
                                                || metric.getJdbc() != null
                                                || Set.of("script", "ssh", "jdbc")
                                                        .contains(metric.getProtocol()))) {
            throw new IllegalArgumentException(
                    "Code-backed collection requires the bound command preview and explicit"
                        + " approval; use an existing paused local inline one-shot plan or the"
                        + " native editor");
        }
    }
}
