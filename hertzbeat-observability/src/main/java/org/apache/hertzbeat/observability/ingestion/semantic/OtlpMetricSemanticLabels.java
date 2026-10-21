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

package org.apache.hertzbeat.observability.ingestion.semantic;

import java.util.Locale;

/**
 * Canonical Prometheus-compatible label names produced from HertzBeat OTLP resource attributes.
 */
public final class OtlpMetricSemanticLabels {

    public static final String HERTZBEAT_WORKSPACE_ID = "hertzbeat_workspace_id";
    public static final String HERTZBEAT_COLLECTOR_ID = "hertzbeat_collector_id";
    public static final String HERTZBEAT_COLLECTOR = "hertzbeat_collector";
    public static final String HTTP_ROUTE = "http_route";
    public static final String SERVICE_INSTANCE_ID = "service_instance_id";

    private OtlpMetricSemanticLabels() {
    }

    /**
     * Whether a resource or promoted metric label names workspace authority.
     *
     * @param label label name before an operator is applied
     * @return {@code true} for canonical and historical workspace aliases
     */
    public static boolean isWorkspaceIdentifier(String label) {
        if (label == null) {
            return false;
        }
        String normalized = label.trim()
                .toLowerCase(Locale.ROOT)
                .replace('.', '_')
                .replace('-', '_');
        return "workspace_id".equals(normalized) || HERTZBEAT_WORKSPACE_ID.equals(normalized);
    }
}
