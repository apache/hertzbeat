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

package org.apache.hertzbeat.ai.gateway.tool.application;

import java.util.Map;
import java.util.Set;

/** Fixed native reason codes only; never forwards provider bodies or exception chains. */
public final class AgentGrafanaFailureProof {
    private AgentGrafanaFailureProof() {}

    private static final Set<String> NO_WRITE =
            Set.of(
                    "GRAFANA_INTEGRATION_DISABLED",
                    "GRAFANA_MONITOR_NOT_AVAILABLE",
                    "GRAFANA_BINDING_ALREADY_EXISTS",
                    "GRAFANA_BINDING_VERSION_MISMATCH",
                    "GRAFANA_SHARED_UPDATE_REQUIRES_NATIVE_EDITOR",
                    "GRAFANA_DRAFT_INVALID",
                    "GRAFANA_JSON_INVALID",
                    "GRAFANA_EXISTING_TOKEN_UNAVAILABLE",
                    "GRAFANA_SNAPSHOT_UNAVAILABLE",
                    "GRAFANA_SNAPSHOT_INVALID",
                    "GRAFANA_REMOTE_VERSION_MISMATCH",
                    "GRAFANA_BINDING_SET_INVALID",
                    "GRAFANA_UID_INVALID",
                    "GRAFANA_OPERATION_CANCELLED_BEFORE_WRITE",
                    "GRAFANA_VERSION_CONFLICT",
                    "GRAFANA_NATIVE_SECURE_EDITOR_REQUIRED");
    private static final Set<String> UNKNOWN =
            Set.of(
                    "GRAFANA_SAVE_OUTCOME_UNVERIFIED_DO_NOT_RETRY",
                    "GRAFANA_REMOTE_SAVED_LOCAL_OUTCOME_UNVERIFIED_DO_NOT_RETRY",
                    "GRAFANA_DELETE_OUTCOME_UNVERIFIED_DO_NOT_RETRY",
                    "GRAFANA_REMOTE_DELETED_LOCAL_OUTCOME_UNVERIFIED_DO_NOT_RETRY",
                    "GRAFANA_LOCAL_DETACH_OUTCOME_UNVERIFIED",
                    "GRAFANA_READBACK_UNVERIFIED_DO_NOT_RETRY");

    public static String safeReason(RuntimeException failure) {
        String reason = failure.getMessage();
        return reason != null && (NO_WRITE.contains(reason) || UNKNOWN.contains(reason))
                ? reason
                : "GRAFANA_OPERATION_UNVERIFIED_DO_NOT_RETRY";
    }

    public static boolean definitelyNoWrite(String code) {
        return code != null && NO_WRITE.contains(code);
    }

    public static boolean matchesKnownNoWrite(
            String tool, Map<String, Object> args, Map<String, Object> data, String hash) {
        try {
            var draft = AgentGrafanaDraft.fromArguments(tool, args);
            return "grafana-dashboard-failure.v1".equals(data.get("failureVersion"))
                    && tool.equals(data.get("toolName"))
                    && hash != null
                    && hash.equals(data.get("inputHash"))
                    && Boolean.FALSE.equals(data.get("outcomeUnknown"))
                    && draft.monitorId().longValue()
                            == new java.math.BigDecimal(data.get("monitorId").toString())
                                    .longValueExact()
                    && draft.operation().equals(data.get("operation"))
                    && definitelyNoWrite((String) data.get("reasonCode"));
        } catch (RuntimeException invalid) {
            return false;
        }
    }
}
