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

package org.apache.hertzbeat.ai.gateway.tool.monitor;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Versioned, non-secret expected postconditions. This receipt never substitutes for a later
 * readback.
 */
public record AgentMonitorMutationReceipt(
        String version, String toolName, String inputHash, List<Target> targets) {
    public static final String VERSION = "monitor-mutation.v1";
    public static final String READBACK_VERSION = "monitor-state.v1";
    public static final java.util.Set<String> WEBSITE_FIELDS =
            java.util.Set.of("host", "port", "ssl", "uri", "timeout");

    public AgentMonitorMutationReceipt {
        targets = targets == null ? List.of() : List.copyOf(targets);
    }

    /** One exact resource and the canonical values expected from monitor.get. */
    public record Target(
            Long monitorId, Map<String, Object> fields, Map<String, String> parameters) {
        public Target {
            fields =
                    fields == null
                            ? Map.of()
                            : Collections.unmodifiableMap(new LinkedHashMap<>(fields));
            parameters = parameters == null ? Map.of() : Map.copyOf(parameters);
        }
    }
}
