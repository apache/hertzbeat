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

package org.apache.hertzbeat.ai.gateway.tool.alert;

import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport;
import org.apache.hertzbeat.alert.service.AlertGroupEvidenceService;
import org.apache.hertzbeat.alert.service.AlertInvestigationReadModelService;
import org.apache.hertzbeat.alert.service.AlertService;
import org.apache.hertzbeat.common.observability.dto.investigation.InvestigationWindow;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.warehouse.query.admission.ObservabilityQueryAdmissionService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

/** Workspace-scoped alert evidence, with existing read-model budgets and admission. */
@Service
public class AgentAlertInvestigationToolService {
    private final AlertInvestigationReadModelService investigation;
    private final AlertGroupEvidenceService evidence;
    private final AlertService alerts;
    private final ObservabilityQueryAdmissionService admission;

    public AgentAlertInvestigationToolService(AlertInvestigationReadModelService investigation,
            AlertGroupEvidenceService evidence, AlertService alerts, ObservabilityQueryAdmissionService admission) {
        this.investigation = investigation;
        this.evidence = evidence;
        this.alerts = alerts;
        this.admission = admission;
    }

    @Tool(name = "alert.investigation", description = "Investigate an exact alert in a maximum 24-hour window. Preserve unavailable and partial signal evidence.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> investigate(Long alertId, Long start, Long end) {
        if (alertId == null || alertId <= 0 || start == null || end == null) {
            throw new IllegalArgumentException("Positive alertId and complete start/end timestamps are required");
        }
        new InvestigationWindow(start, end);
        String workspace = workspace();
        return AgentManagementOutputSupport.view(admission.execute("topology",
                () -> investigation.query(workspace, alertId, start, end)));
    }

    @Tool(name = "alert.group.evidence", description = "Read canonical group status evidence for 1..100 IDs, including missing IDs.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> evidence(List<Long> ids) {
        if (ids == null || ids.isEmpty() || ids.size() > 100 || ids.stream().anyMatch(id -> id == null || id <= 0)) {
            throw new IllegalArgumentException("ids must contain 1..100 positive IDs");
        }
        return AgentManagementOutputSupport.view(evidence.getEvidence(workspace(), ids.stream().map(String::valueOf).toList()));
    }

    @Tool(name = "alert.group.query", description = "Page grouped alerts by exact severity and service/environment correlations.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> groups(
            @ToolParam(required = false) String status, @ToolParam(required = false) String search,
            @ToolParam(required = false) String severity, @ToolParam(required = false) String serviceName,
            @ToolParam(required = false) String serviceNamespace, @ToolParam(required = false) String environment,
            @ToolParam(required = false) Integer pageIndex, @ToolParam(required = false) Integer pageSize) {
        String resolvedStatus = text(status);
        if (resolvedStatus != null && !Set.of("firing", "pending", "acknowledged", "resolved").contains(resolvedStatus)) {
            throw new IllegalArgumentException("Unsupported group status");
        }
        int index = pageIndex == null ? 0 : pageIndex;
        int size = pageSize == null ? 20 : pageSize;
        if (index < 0 || index > 10000 || size < 1 || size > 50) {
            throw new IllegalArgumentException("pageIndex must be 0..10000 and pageSize 1..50");
        }
        return AgentManagementOutputSupport.view(alerts.getGroupAlerts(workspace(), resolvedStatus, text(search),
                text(severity), text(serviceName), text(serviceNamespace), text(environment), "gmtUpdate", "desc", index, size));
    }

    private static String text(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        if (value.length() > 256) {
            throw new IllegalArgumentException("Filter exceeds 256 characters");
        }
        return value.trim();
    }

    private static String workspace() {
        String value = AuthTokenRequestContext.currentWorkspaceId();
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Trusted workspace is required");
        }
        return AuthTokenScopes.normalizeWorkspaceId(value);
    }
}
