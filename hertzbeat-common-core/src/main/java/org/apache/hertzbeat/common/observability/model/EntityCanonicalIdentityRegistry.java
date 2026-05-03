/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.common.observability.model;

import java.util.List;
import java.util.Map;

/**
 * Canonical telemetry identity registry.
 * <p>
 * This registry freezes the OpenTelemetry resource identity keys HertzBeat treats
 * as the primary compatibility layer for entity discovery, binding, and definition
 * import/export. Workspace/detail aggregation fields are intentionally outside of
 * this contract.
 */
public final class EntityCanonicalIdentityRegistry {

    public static final List<String> CANONICAL_OTEL_RESOURCE_KEYS = List.of(
            "service.name",
            "service.namespace",
            "service.version",
            "service.instance.id",
            "deployment.environment.name",
            "host.name",
            "host.id",
            "k8s.namespace.name",
            "k8s.deployment.name",
            "k8s.pod.name",
            "container.name",
            "cloud.provider",
            "cloud.region",
            "cloud.resource_id"
    );

    private static final Map<String, Integer> CANONICAL_PRIORITY = Map.ofEntries(
            Map.entry("service.instance.id", 140),
            Map.entry("host.id", 140),
            Map.entry("cloud.resource_id", 130),
            Map.entry("service.name", 90),
            Map.entry("host.name", 90),
            Map.entry("k8s.deployment.name", 90),
            Map.entry("k8s.pod.name", 80),
            Map.entry("container.name", 70),
            Map.entry("service.namespace", 30),
            Map.entry("k8s.namespace.name", 30),
            Map.entry("deployment.environment.name", 20),
            Map.entry("service.version", 15),
            Map.entry("cloud.provider", 10),
            Map.entry("cloud.region", 10)
    );

    private EntityCanonicalIdentityRegistry() {
    }

    public static boolean isCanonicalOtelResourceKey(String identityKey) {
        return identityKey != null && CANONICAL_PRIORITY.containsKey(identityKey);
    }

    public static int defaultPriority(String identityKey) {
        return CANONICAL_PRIORITY.getOrDefault(identityKey, 40);
    }
}
