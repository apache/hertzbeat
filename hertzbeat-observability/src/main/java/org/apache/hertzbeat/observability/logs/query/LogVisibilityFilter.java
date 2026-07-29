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

package org.apache.hertzbeat.observability.logs.query;

import java.util.LinkedHashSet;
import java.util.Set;
import org.springframework.util.StringUtils;

/**
 * Shared visibility intent for historical and live log queries.
 */
public record LogVisibilityFilter(boolean hideInternal, boolean hideNoise) {

    private static final Set<String> WORKSPACE_INFRA_SERVICE_NAMES = Set.of(
            "otelcol-contrib",
            "otel-collector",
            "opentelemetry-collector",
            "jaeger",
            "prometheus",
            "grafana",
            "opensearch",
            "frontend-proxy"
    );
    private static final Set<String> DEMO_INFRA_SERVICE_NAMES = Set.of(
            "kafka",
            "load-generator",
            "valkey-cart",
            "postgresql",
            "flagd",
            "flagd-ui"
    );

    /**
     * Service names that storage adapters can exclude before reading rows.
     */
    public Set<String> hiddenServiceNames() {
        if (!hideInternal && !hideNoise) {
            return Set.of();
        }
        Set<String> names = new LinkedHashSet<>(WORKSPACE_INFRA_SERVICE_NAMES);
        if (hideNoise) {
            names.addAll(DEMO_INFRA_SERVICE_NAMES);
        }
        return Set.copyOf(names);
    }

    /**
     * Missing service identity is excluded whenever either visibility filter is active.
     */
    public boolean requireServiceName() {
        return hideInternal || hideNoise;
    }

    /**
     * Return whether a decoded log row must be hidden.
     */
    public boolean hides(String serviceName) {
        if (!StringUtils.hasText(serviceName)) {
            return requireServiceName();
        }
        if (requireServiceName() && WORKSPACE_INFRA_SERVICE_NAMES.contains(serviceName)) {
            return true;
        }
        return hideNoise && DEMO_INFRA_SERVICE_NAMES.contains(serviceName);
    }
}
