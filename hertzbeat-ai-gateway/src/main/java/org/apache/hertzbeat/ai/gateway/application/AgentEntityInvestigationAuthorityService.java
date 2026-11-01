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

package org.apache.hertzbeat.ai.gateway.application;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.apache.hertzbeat.ai.gateway.contract.AgentServiceRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentSignalRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.common.entity.manager.EntityMonitorBind;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.service.entity.EntityIdentityQueryService;
import org.apache.hertzbeat.manager.service.entity.EntityMonitorBindQueryService;
import org.apache.hertzbeat.manager.service.entity.EntityMonitorMetricTargetCanonicalizer;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** Explicit operator-selected entity investigation; no model-driven scope expansion. */
@Service
public class AgentEntityInvestigationAuthorityService {
    public static final String TARGET_VERSION = "entity-investigation.v1";
    public static final String AUTHORITY_VERSION = "entity-investigation-authority.v1";
    private static final long MAX_WINDOW = 86_400_000L;
    private static final Set<String> QUERY_ARGUMENTS = Set.of("start", "end", "serviceName", "serviceNamespace",
            "environment", "pageIndex", "pageSize");
    private static final Set<String> METRIC_ARGUMENTS = Set.of("monitorId", "metricKey", "start", "end",
            "step", "interval", "maxPoints");
    private final AgentEntityTargetAuthorityService entities;
    private final EntityMonitorBindQueryService bindings;
    private final EntityIdentityQueryService identities;
    private final EntityMonitorMetricTargetCanonicalizer metrics;

    public AgentEntityInvestigationAuthorityService(AgentEntityTargetAuthorityService entities,
                                                     EntityMonitorBindQueryService bindings,
                                                     EntityIdentityQueryService identities,
                                                     EntityMonitorMetricTargetCanonicalizer metrics) {
        this.entities = entities;
        this.bindings = bindings;
        this.identities = identities;
        this.metrics = metrics;
    }

    public AgentTargetRef canonicalize(String workspace, Long entityId, AgentSignalRef signal) {
        if (entityId == null || entityId <= 0 || !validSignal(signal)) {
            throw new IllegalArgumentException("Entity investigation scope is unavailable");
        }
        AgentTargetRef entity = entities.canonicalize(workspace, entityId);
        List<EntityIdentity> identityRows = identities.findIdentities(entityId);
        List<EntityMonitorBind> bindRows = bindings.findMonitorBinds(entityId);
        if (identityRows == null || bindRows == null || identityRows.size() > 256 || bindRows.size() > 128
                || identityRows.stream().anyMatch(row -> row == null || row.getId() == null
                || !entityId.equals(row.getEntityId()))
                || bindRows.stream().anyMatch(row -> row == null || row.getId() == null
                || !entityId.equals(row.getEntityId()))) {
            throw new IllegalArgumentException("Entity investigation bindings are unavailable");
        }
        identityRows = identityRows.stream().sorted(Comparator.comparing(EntityIdentity::getId)).toList();
        bindRows = bindRows.stream().sorted(Comparator.comparing(EntityMonitorBind::getId)).toList();
        String name = identity(identityRows, "service.name");
        String namespace = identity(identityRows, "service.namespace");
        String environment = identity(identityRows, "deployment.environment.name");
        AgentServiceRef service = name == null || namespace == null || environment == null ? null
                : AgentServiceRef.builder().name(name).namespace(namespace).environment(environment).build();
        String hash = GatewayText.sha256(entity.getAuthority().getHash() + ";" + JsonUtil.toJson(identityRows)
                + ";" + JsonUtil.toJson(bindRows) + ";" + JsonUtil.toJson(signal));
        return AgentTargetRef.builder().version(TARGET_VERSION).entityId(entityId).signal(signal.toBuilder().build())
                .service(service).authority(AgentTargetAuthority.builder().bindingId(entityId)
                        .version(AUTHORITY_VERSION).hash("sha256:" + hash).build()).build();
    }

    public boolean verify(String workspace, AgentTargetRef target) {
        if (!isCanonicalTarget(target)) {
            return false;
        }
        try {
            return target.equals(canonicalize(workspace, target.getEntityId(), target.getSignal()));
        } catch (RuntimeException ignored) {
            return false;
        }
    }

    public boolean permits(String workspace, AgentTargetRef target, String tool, Map<String, Object> arguments) {
        if (!argumentsAllowed(target, tool, arguments) || !verify(workspace, target)) {
            return false;
        }
        if (!"metrics.history".equals(tool)) {
            return true;
        }
        try {
            var resolved = metrics.canonicalize(workspace, new EntityMonitorMetricTargetCanonicalizer.SourceIntent(
                    number(arguments.get("monitorId")), "metrics", (String) arguments.get("metricKey"),
                    number(arguments.get("start")), number(arguments.get("end")), target.getSignal().getTimezone()));
            return Objects.equals(target.getEntityId(), resolved.entityId());
        } catch (RuntimeException ignored) {
            return false;
        }
    }

    public static boolean isCanonicalTarget(AgentTargetRef target) {
        return target != null && TARGET_VERSION.equals(target.getVersion()) && target.getEntityId() != null
                && target.getEntityId() > 0 && validSignal(target.getSignal()) && target.getAuthority() != null
                && Objects.equals(target.getEntityId(), target.getAuthority().getBindingId())
                && AUTHORITY_VERSION.equals(target.getAuthority().getVersion())
                && target.getAuthority().getHash() != null
                && target.getAuthority().getHash().matches("sha256:[0-9a-f]{64}")
                && target.getMonitorId() == null && target.getAlertId() == null && target.getAlertType() == null
                && target.getCollector() == null && target.getTopology() == null && target.getTrace() == null
                && target.getLog() == null && target.getIncident() == null;
    }

    /** Syntax-only scope matching also used to validate durable evidence; execution additionally rechecks DB authority. */
    public static boolean argumentsAllowed(AgentTargetRef target, String tool, Map<String, Object> args) {
        if (!isCanonicalTarget(target) || args == null) {
            return false;
        }
        if (Set.of("tool.search", "skill.load").contains(tool)) {
            return true;
        }
        if ("entity.get".equals(tool)) {
            return args.keySet().equals(Set.of("entityId")) && Objects.equals(number(args.get("entityId")), target.getEntityId());
        }
        Long start = number(args.get("start"));
        Long end = number(args.get("end"));
        if (start == null || end == null || start < target.getSignal().getStart()
                || end > target.getSignal().getEnd() || end <= start) {
            return false;
        }
        if ("metrics.history".equals(tool)) {
            Long monitorId = number(args.get("monitorId"));
            Long maxPoints = number(args.get("maxPoints"));
            return METRIC_ARGUMENTS.containsAll(args.keySet()) && monitorId != null && monitorId > 0
                    && args.get("metricKey") instanceof String key && key.matches("[A-Za-z0-9_-]+[.][A-Za-z0-9_-]+")
                    && maxPoints != null && maxPoints >= 1 && maxPoints <= 1000;
        }
        if (!("traces.query".equals(tool) || "logs.query".equals(tool))
                || !QUERY_ARGUMENTS.equals(args.keySet()) || target.getService() == null) {
            return false;
        }
        AgentServiceRef service = target.getService();
        Long pageIndex = number(args.get("pageIndex"));
        Long pageSize = number(args.get("pageSize"));
        return StringUtils.hasText(service.getName()) && StringUtils.hasText(service.getNamespace())
                && StringUtils.hasText(service.getEnvironment())
                && Objects.equals(service.getName(), args.get("serviceName"))
                && Objects.equals(service.getNamespace(), args.get("serviceNamespace"))
                && Objects.equals(service.getEnvironment(), args.get("environment"))
                && pageIndex != null && pageIndex >= 0 && pageIndex <= 10
                && pageSize != null && pageSize >= 1 && pageSize <= 50;
    }

    private static boolean validSignal(AgentSignalRef signal) {
        return signal != null && "investigation".equals(signal.getType()) && signal.getQuery() == null
                && signal.getTimeRange() == null && signal.getStart() != null && signal.getStart() >= 0
                && signal.getEnd() != null && signal.getEnd() > signal.getStart()
                && signal.getEnd() - signal.getStart() <= MAX_WINDOW
                && StringUtils.hasText(signal.getTimezone()) && signal.isTimezoneValid();
    }

    private String identity(List<EntityIdentity> rows, String key) {
        List<String> values = rows.stream().filter(row -> key.equals(row.getIdentityKey()))
                .map(EntityIdentity::getIdentityValue).filter(StringUtils::hasText).toList();
        return values.size() == 1 ? values.getFirst() : null;
    }

    private static Long number(Object value) {
        if (!(value instanceof Number number)) {
            return null;
        }
        try {
            return new BigDecimal(number.toString()).longValueExact();
        } catch (ArithmeticException | NumberFormatException ignored) {
            return null;
        }
    }
}
