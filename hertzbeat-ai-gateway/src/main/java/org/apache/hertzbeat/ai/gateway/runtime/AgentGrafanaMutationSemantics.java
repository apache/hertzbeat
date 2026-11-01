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

package org.apache.hertzbeat.ai.gateway.runtime;

import org.apache.hertzbeat.ai.gateway.tool.application.AgentGrafanaDraft;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * A Grafana task targets exactly one existing monitor binding; remote UIDs are never numeric IDs.
 */
final class AgentGrafanaMutationSemantics {
    static boolean supports(String tool) {
        return "grafana.dashboard_save".equals(tool) || "grafana.dashboard_delete".equals(tool);
    }

    static Set<String> goalFields() {
        return Set.of(
                "title",
                "uid",
                "version",
                "definitionHash",
                "dashboard",
                "panels",
                "tags",
                "description",
                "refresh",
                "time",
                "timezone",
                "schemaVersion");
    }

    static boolean permits(AgentTaskAssessment.Goal goal, String tool, Map<String, Object> args) {
        try {
            if (!supports(tool)
                    || goal == null
                    || !goal.valid()
                    || !goal.changesResources()
                    || !"grafana_dashboard".equals(goal.resourceType())
                    || !Integer.valueOf(1).equals(goal.expectedCount())
                    || !goalFields().containsAll(goal.expectedChanges().keySet())) return false;
            var draft = AgentGrafanaDraft.fromArguments(tool, args);
            if (!goal.resourceIds().equals(List.of(draft.monitorId()))
                    || !goal.operation()
                            .name()
                            .equals(draft.operation().toUpperCase(java.util.Locale.ROOT))
                    || !draft.previewHash().equals(args.get("previewHash"))) return false;
            var fields = goal.expectedChanges();
            return draft.requestedFieldsMatch(fields)
                    && (!fields.containsKey("title") || fields.get("title").equals(draft.title()))
                    && (!fields.containsKey("uid") || fields.get("uid").equals(draft.expectedUid()))
                    && (!fields.containsKey("version")
                            || new java.math.BigDecimal(fields.get("version").toString())
                                            .longValueExact()
                                    == draft.expectedVersion())
                    && (!fields.containsKey("definitionHash")
                            || fields.get("definitionHash").equals(draft.definitionHash()));
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    static boolean verified(
            String tool, Map<String, Object> args, Map<String, Object> data, String trustedHash) {
        try {
            var draft = AgentGrafanaDraft.fromArguments(tool, args);
            boolean delete = "delete".equals(draft.operation());
            String uid =
                    "create".equals(draft.operation())
                            ? "hb-monitor-" + draft.monitorId()
                            : draft.expectedUid();
            long version = number(data.get("version"));
            long previous = number(data.get("previousVersion"));
            if (!supports(tool)
                    || !"grafana-dashboard-mutation.v1".equals(data.get("receiptVersion"))
                    || !tool.equals(data.get("toolName"))
                    || trustedHash == null
                    || !trustedHash.equals(data.get("inputHash"))
                    || !Boolean.TRUE.equals(data.get("verified"))
                    || !Boolean.FALSE.equals(data.get("automaticRetrySafe"))
                    || !Boolean.FALSE.equals(data.get("atomicRemoteVersionPrecondition"))
                    || number(data.get("monitorId")) != draft.monitorId()
                    || !uid.equals(data.get("uid"))
                    || !draft.operation()
                            .toUpperCase(java.util.Locale.ROOT)
                            .equals(data.get("operation"))
                    || !draft.previewHash().equals(data.get("previewHash"))
                    || !draft.previewHash().equals(args.get("previewHash"))
                    || !draft.definitionHash().equals(data.get("definitionHash"))
                    || !draft.title().equals(data.get("title"))
                    || previous != (draft.expectedVersion() == null ? 0 : draft.expectedVersion()))
                return false;
            if (delete)
                return version == draft.expectedVersion()
                        && Boolean.TRUE.equals(data.get("localBindingRemoved"))
                        && data.get("remoteDashboardRemoved") instanceof Boolean;
            return version > 0
                    && ("create".equals(draft.operation())
                            || version == draft.expectedVersion() + 1)
                    && Boolean.FALSE.equals(data.get("localBindingRemoved"))
                    && Boolean.FALSE.equals(data.get("remoteDashboardRemoved"))
                    && data.get("readbackHash") instanceof String hash
                    && hash.matches("[a-f0-9]{64}");
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    static boolean preview(Map<String, Object> args, Map<String, Object> data, String trustedHash) {
        try {
            var draft = AgentGrafanaDraft.fromArguments("grafana.dashboard_preview", args);
            return "grafana-dashboard-preview.v1".equals(data.get("previewVersion"))
                    && trustedHash != null
                    && trustedHash.equals(data.get("inputHash"))
                    && number(data.get("monitorId")) == draft.monitorId()
                    && draft.operation().equals(data.get("operation"))
                    && Boolean.TRUE.equals(data.get("valid"))
                    && Boolean.FALSE.equals(data.get("persisted"))
                    && Boolean.TRUE.equals(data.get("nativeDomainValidationPending"))
                    && Boolean.TRUE.equals(data.get("requiresExplicitAdminApproval"))
                    && Boolean.FALSE.equals(data.get("remoteDeleteAtomicVersionPrecondition"))
                    && java.util.Objects.equals(
                            "update".equals(draft.operation()), data.get("fullReplacement"))
                    && draft.previewHash().equals(data.get("previewHash"))
                    && draft.definitionHash().equals(data.get("definitionHash"));
        } catch (RuntimeException invalid) {
            return false;
        }
    }

    static long number(Object value) {
        if (!(value instanceof Number)) throw new IllegalArgumentException();
        return new java.math.BigDecimal(value.toString()).longValueExact();
    }
}
