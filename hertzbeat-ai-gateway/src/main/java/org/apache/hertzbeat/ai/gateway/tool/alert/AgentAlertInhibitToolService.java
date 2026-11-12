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

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolContextSupport;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport;
import org.apache.hertzbeat.alert.dto.AlertInhibitRequest;
import org.apache.hertzbeat.alert.dto.AlertInhibitResponse;
import org.apache.hertzbeat.alert.service.AlertInhibitContractMapper;
import org.apache.hertzbeat.alert.service.AlertInhibitNotFoundException;
import org.apache.hertzbeat.alert.service.AlertInhibitService;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Set;

/** Explicit native inhibition policy operations, not notification delivery. */
@Service
public class AgentAlertInhibitToolService {
    private final AlertInhibitService service;

    public AgentAlertInhibitToolService(AlertInhibitService service) {
        this.service = service;
    }

    /** Complete editable native policy, excluding persistence identity and audit fields. */
    public record Configuration(
            String name,
            Map<String, String> sourceLabels,
            Map<String, String> targetLabels,
            List<String> equalLabels,
            Boolean enable) {}

    @Tool(
            name = "alert_inhibit.list",
            description =
                    "List bounded native inhibition policies with optional exact IDs, name search"
                            + " and pagination. Metadata is not proof an alert was suppressed.")
    @AgentToolPolicy(
            risk = AgentToolRisk.READ,
            exposure = AgentToolExposure.MODEL_ON_DEMAND,
            access = AgentToolAccess.STANDARD)
    public Map<String, Object> readList(
            @ToolParam(required = false) List<Long> ids,
            @ToolParam(required = false) String search,
            @ToolParam(required = false) Integer pageIndex,
            @ToolParam(required = false) Integer pageSize) {
        if (ids != null
                && (ids.isEmpty()
                        || ids.size() > 100
                        || ids.stream().anyMatch(i -> i == null || i <= 0)
                        || Set.copyOf(ids).size() != ids.size()))
            throw new IllegalArgumentException("Distinct bounded positive ids are required");
        int page = pageIndex == null ? 0 : pageIndex;
        int size = pageSize == null ? 20 : pageSize;
        if (page < 0 || size < 1 || size > 100) throw new IllegalArgumentException("Invalid page");
        var out =
                AgentManagementOutputSupport.view(
                        service.list(ids, search, "gmtCreate", "desc", page, size));
        out.put("readVersion", "alert-inhibit-read.v1");
        return out;
    }

    public Map<String, Object> list(String search, Integer pageIndex, Integer pageSize) {
        return readList(null, search, pageIndex, pageSize);
    }

    @Tool(
            name = "alert_inhibit.get",
            description =
                    "Read exact native policy and sourceHash. This source hash is a snapshot"
                            + " precondition, not atomic CAS.")
    @AgentToolPolicy(
            risk = AgentToolRisk.READ,
            exposure = AgentToolExposure.MODEL_ON_DEMAND,
            access = AgentToolAccess.STANDARD)
    public Map<String, Object> get(Long inhibitId) {
        var row = required(inhibitId);
        var out = AgentManagementOutputSupport.view(row);
        out.put("readVersion", "alert-inhibit-read.v1");
        if (Boolean.FALSE.equals(out.get("partial")))
            out.put("sourceHash", AgentAlertInhibitWriteProof.sourceHash(row));
        return out;
    }

    private AlertInhibitResponse required(Long id) {
        requireId(id);
        var value = service.get(id);
        if (value == null || !id.equals(value.id()))
            throw new IllegalArgumentException("Exact policy was not returned");
        return value;
    }

    @Tool(
            name = "alert_inhibit.create",
            description =
                    "Create one inhibition policy; matching target alerts may stop notifying."
                            + " Supply the complete native configuration.")
    @AgentToolPolicy(
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND,
            access = AgentToolAccess.USER)
    public Map<String, Object> createPolicy(Configuration configuration) {
        var request = request(null, configuration);
        var args =
                AgentToolContextSupport.arguments(
                        "configuration", AgentAlertInhibitWriteProof.fields(request));
        AgentAlertInhibitWriteProof.guard("alert_inhibit.create", args);
        String expected = AgentAlertInhibitWriteProof.contentHash(request);
        var saved = service.create(request);
        if (saved == null || saved.id() == null)
            throw new IllegalStateException("ALERT_INHIBIT_WRITE_OUTCOME_UNKNOWN_DO_NOT_RETRY");
        return written("alert_inhibit.create", args, expected, required(saved.id()));
    }

    @Tool(
            name = "alert_inhibit.update",
            description =
                    "Replace exact policy at sourceHash, preserving fields not explicitly"
                        + " requested. Snapshot check is not atomic CAS. May change notification"
                        + " suppression. For name-only rename copy all other fields exactly from native get, including equalLabels. "
                        + "equalLabels contains label NAMES, not label=value matchers.")
    @AgentToolPolicy(
            risk = AgentToolRisk.CHANGE,
            exposure = AgentToolExposure.MODEL_ON_DEMAND,
            access = AgentToolAccess.USER)
    public Map<String, Object> updatePolicy(
            Long inhibitId, Configuration configuration, String sourceHash) {
        var request = request(inhibitId, configuration);
        AgentAlertInhibitWriteProof.requireSource(required(inhibitId), sourceHash);
        var args =
                AgentToolContextSupport.arguments(
                        "inhibitId",
                        inhibitId,
                        "configuration",
                        AgentAlertInhibitWriteProof.fields(request),
                        "sourceHash",
                        sourceHash);
        AgentAlertInhibitWriteProof.guard("alert_inhibit.update", args);
        String expected = AgentAlertInhibitWriteProof.contentHash(request);
        service.update(request);
        return written("alert_inhibit.update", args, expected, required(inhibitId));
    }

    @Tool(
            name = "alert_inhibit.delete",
            description =
                    "Permanently delete one exact policy at sourceHash; target notifications may"
                            + " resume. Snapshot check is not atomic CAS.")
    @AgentToolPolicy(
            risk = AgentToolRisk.DANGEROUS,
            exposure = AgentToolExposure.MODEL_ON_DEMAND,
            access = AgentToolAccess.ADMIN)
    public Map<String, Object> deletePolicy(Long inhibitId, String reason, String sourceHash) {
        AgentAlertInhibitWriteProof.requireSource(required(inhibitId), sourceHash);
        if (reason == null || reason.isBlank() || reason.length() > 500)
            throw new IllegalArgumentException("Bounded deletion reason is required");
        var args =
                AgentToolContextSupport.arguments(
                        "inhibitId", inhibitId, "reason", reason, "sourceHash", sourceHash);
        AgentAlertInhibitWriteProof.guard("alert_inhibit.delete", args);
        var deleted = service.delete(Set.of(inhibitId));
        if (deleted == null
                || !"deleted".equals(deleted.status())
                || !Set.of(inhibitId).equals(deleted.deletedIds())
                || !deleted.missingIds().isEmpty())
            throw new IllegalStateException("ALERT_INHIBIT_DELETE_OUTCOME_UNKNOWN_DO_NOT_RETRY");
        boolean absent = false;
        try {
            service.get(inhibitId);
        } catch (AlertInhibitNotFoundException missing) {
            absent = true;
        }
        if (!absent)
            throw new IllegalStateException("ALERT_INHIBIT_DELETE_OUTCOME_UNKNOWN_DO_NOT_RETRY");
        return Map.of(
                "deletedId",
                inhibitId,
                "mutationReceipt",
                AgentAlertInhibitWriteProof.receipt(
                        "alert_inhibit.delete", inhibitId, args, "absent", true));
    }

    private AlertInhibitRequest request(Long id, Configuration config) {
        if (config == null)
            throw new IllegalArgumentException("Complete configuration is required");
        var copy = JsonUtil.fromJson(JsonUtil.toJson(config), AlertInhibitRequest.class);
        copy.setId(id);
        var mapper = new AlertInhibitContractMapper();
        org.apache.hertzbeat.common.entity.alerter.AlertInhibit normalized;
        if (id == null) normalized = mapper.toNewEntity(copy);
        else {
            requireId(id);
            var current = new org.apache.hertzbeat.common.entity.alerter.AlertInhibit();
            current.setId(id);
            normalized = mapper.toExistingEntity(copy, current);
        }
        var projected = AgentManagementOutputSupport.view(config);
        if (!AgentAlertInhibitWriteProof.contentHash(copy)
                        .equals(AgentAlertInhibitWriteProof.contentHash(normalized))
                || !Boolean.FALSE.equals(projected.get("partial"))
                || !AgentAlertInhibitWriteProof.contentHash(config)
                        .equals(AgentAlertInhibitWriteProof.contentHash(projected.get("data"))))
            throw new IllegalArgumentException(
                    "Canonical public configuration is required; use the native editor for"
                        + " protected values");
        return copy;
    }

    private Map<String, Object> written(
            String tool, Map<String, Object> args, String expected, AlertInhibitResponse observed) {
        if (!expected.equals(AgentAlertInhibitWriteProof.contentHash(observed)))
            throw new IllegalStateException("ALERT_INHIBIT_WRITE_OUTCOME_UNKNOWN_DO_NOT_RETRY");
        Map<String, Object> row = JsonUtil.fromJson(JsonUtil.toJson(observed), Map.class);
        row.put(
                "mutationReceipt",
                AgentAlertInhibitWriteProof.receipt(tool, observed.id(), args, expected, false));
        return AgentManagementOutputSupport.view(row);
    }

    private void requireId(Long id) {
        if (id == null || id <= 0) throw new IllegalArgumentException("inhibitId must be positive");
    }

    // Existing Java callers retain native DTO contracts; only annotated methods are model tools.
    public Map<String, Object> create(AlertInhibitRequest config) {
        if (config == null || config.getId() != null)
            throw new IllegalArgumentException("New configuration must not include an id");
        return AgentManagementOutputSupport.view(service.create(config));
    }

    public Map<String, Object> update(Long id, AlertInhibitRequest config) {
        requireId(id);
        if (config == null || config.getId() != null && !id.equals(config.getId()))
            throw new IllegalArgumentException("Exact id required");
        config.setId(id);
        return AgentManagementOutputSupport.view(service.update(config));
    }

    public Map<String, Object> delete(Long id, String reason) {
        requireId(id);
        if (reason == null || reason.isBlank())
            throw new IllegalArgumentException("Reason required");
        service.get(id);
        service.delete(Set.of(id));
        return Map.of("deletedId", id);
    }
}
