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

import java.util.Objects;
import org.apache.hertzbeat.ai.gateway.application.GatewayCommand.InvokeCommand;
import org.apache.hertzbeat.ai.gateway.contract.AgentServiceRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentSignalRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType;
import org.apache.hertzbeat.ai.gateway.text.GatewayText;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.service.entity.EntityMonitorMetricTargetCanonicalizer;
import org.apache.hertzbeat.manager.service.metric.MonitorMetricQueryContract;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;

/** Adapts untrusted Gateway monitor-metric intent to the manager-authoritative target contract. */
@Service
public class AgentTargetCanonicalizationService {

    private final EntityMonitorMetricTargetCanonicalizer canonicalizer;
    private final AgentSingleAlertTargetAuthorityService alertAuthorityService;
    private final AgentEntityTargetAuthorityService entityAuthorityService;
    private final AgentTopologyTargetAuthorityService topologyAuthorityService;
    private final AgentTraceTargetCanonicalizationAdapter traceAdapter;
    private final AgentLogTargetCanonicalizationAdapter logAdapter;

    public AgentTargetCanonicalizationService(EntityMonitorMetricTargetCanonicalizer canonicalizer,
                                               AgentSingleAlertTargetAuthorityService alertAuthorityService,
                                               AgentEntityTargetAuthorityService entityAuthorityService,
                                               AgentTopologyTargetAuthorityService topologyAuthorityService) {
        this(canonicalizer, alertAuthorityService, entityAuthorityService, topologyAuthorityService, null, null);
    }

    public AgentTargetCanonicalizationService(EntityMonitorMetricTargetCanonicalizer canonicalizer,
                                               AgentSingleAlertTargetAuthorityService alertAuthorityService,
                                               AgentEntityTargetAuthorityService entityAuthorityService,
                                               AgentTopologyTargetAuthorityService topologyAuthorityService,
                                               AgentTraceTargetCanonicalizationAdapter traceAdapter) {
        this(canonicalizer, alertAuthorityService, entityAuthorityService, topologyAuthorityService,
                traceAdapter, null);
    }

    @Autowired
    public AgentTargetCanonicalizationService(EntityMonitorMetricTargetCanonicalizer canonicalizer,
                                               AgentSingleAlertTargetAuthorityService alertAuthorityService,
                                               AgentEntityTargetAuthorityService entityAuthorityService,
                                               AgentTopologyTargetAuthorityService topologyAuthorityService,
                                               AgentTraceTargetCanonicalizationAdapter traceAdapter,
                                               AgentLogTargetCanonicalizationAdapter logAdapter) {
        this.canonicalizer = canonicalizer;
        this.alertAuthorityService = alertAuthorityService;
        this.entityAuthorityService = entityAuthorityService;
        this.topologyAuthorityService = topologyAuthorityService;
        this.traceAdapter = traceAdapter;
        this.logAdapter = logAdapter;
    }

    public boolean requiresCanonicalization(InvokeCommand command) {
        AgentTargetRef target = command.userInput().getTarget();
        AgentSignalRef signal = target == null ? null : target.getSignal();
        return command.entryType() == AgentRuntimeEntryType.USER_INPUT
                && target != null && (hasCanonicalMarker(target) || isAlertIntent(target) || isTopologyIntent(target)
                || isEntityIntent(target) || traceAdapter != null && traceAdapter.isIntent(target)
                || logAdapter != null && logAdapter.isIntent(target)
                || target.getMonitorId() != null && signal != null && "metrics".equals(signal.getType()));
    }

    public InvokeCommand canonicalize(InvokeCommand sourceCommand) {
        if (isAlertIntent(sourceCommand.userInput().getTarget())) {
            return canonicalizeAlert(sourceCommand);
        }
        if (isTopologyIntent(sourceCommand.userInput().getTarget())) {
            return canonicalizeTopology(sourceCommand);
        }
        if (traceAdapter != null && traceAdapter.isIntent(sourceCommand.userInput().getTarget())) {
            return traceAdapter.canonicalize(sourceCommand);
        }
        if (logAdapter != null && logAdapter.isIntent(sourceCommand.userInput().getTarget())) {
            return logAdapter.canonicalize(sourceCommand);
        }
        if (isEntityIntent(sourceCommand.userInput().getTarget())) {
            return canonicalizeEntity(sourceCommand);
        }
        AgentTargetRef source = requireSourceIntent(sourceCommand.userInput().getTarget());
        AgentSignalRef signal = source.getSignal();
        EntityMonitorMetricTargetCanonicalizer.CanonicalTarget canonical;
        try {
            canonical = canonicalizer.canonicalize(sourceCommand.envelope().getWorkspaceId(),
                    new EntityMonitorMetricTargetCanonicalizer.SourceIntent(source.getMonitorId(), signal.getType(),
                            signal.getQuery(), signal.getStart(), signal.getEnd(), signal.getTimezone()));
        } catch (EntityMonitorMetricTargetCanonicalizer.CanonicalizationException failure) {
            throw new TargetCanonicalizationException(
                    failure.kind() == EntityMonitorMetricTargetCanonicalizer.FailureKind.MISMATCH
                            ? FailureKind.MISMATCH : FailureKind.UNAVAILABLE);
        } catch (RuntimeException ignored) {
            throw unavailable();
        }
        if (canonical == null || canonical.service() == null || canonical.signal() == null
                || canonical.authority() == null) {
            throw unavailable();
        }
        AgentTargetRef target = AgentTargetRef.builder()
                .version(canonical.version())
                .entityId(canonical.entityId())
                .monitorId(canonical.monitorId())
                .service(AgentServiceRef.builder()
                        .name(canonical.service().name())
                        .namespace(canonical.service().namespace())
                        .environment(canonical.service().environment())
                        .build())
                .signal(AgentSignalRef.builder()
                        .type(canonical.signal().type())
                        .query(canonical.signal().query())
                        .start(canonical.signal().start())
                        .end(canonical.signal().end())
                        .timezone(canonical.signal().timezone())
                        .build())
                .authority(AgentTargetAuthority.builder()
                        .bindingId(canonical.authority().bindingId())
                        .version(canonical.authority().version())
                        .hash(canonical.authority().hash())
                        .build())
                .build();
        requireSafeCanonicalTarget(target);
        return withTarget(sourceCommand, target);
    }

    public InvokeCommand replayCommand(InvokeCommand sourceCommand, AgentTargetRef persistedTarget) {
        if (isAlertIntent(sourceCommand.userInput().getTarget())) {
            AgentTargetRef source = requireAlertSourceIntent(sourceCommand.userInput().getTarget());
            if (!isCanonicalAlertTarget(persistedTarget)
                    || !Objects.equals(alertSourceIntent(source), alertSourceIntent(persistedTarget))) {
                throw mismatch();
            }
            return withTarget(sourceCommand, persistedTarget);
        }
        if (isTopologyIntent(sourceCommand.userInput().getTarget())) {
            AgentTargetRef source = requireTopologySourceIntent(sourceCommand.userInput().getTarget());
            if (!isCanonicalTopologyTarget(persistedTarget)
                    || !Objects.equals(normalizedTopologySourceIntent(source), topologySourceIntent(persistedTarget))) {
                throw mismatch();
            }
            return withTarget(sourceCommand, persistedTarget);
        }
        if (traceAdapter != null && traceAdapter.isIntent(sourceCommand.userInput().getTarget())) {
            return traceAdapter.replayCommand(sourceCommand, persistedTarget);
        }
        if (logAdapter != null && logAdapter.isIntent(sourceCommand.userInput().getTarget())) {
            return logAdapter.replayCommand(sourceCommand, persistedTarget);
        }
        if (isEntityIntent(sourceCommand.userInput().getTarget())) {
            AgentTargetRef source = requireEntitySourceIntent(sourceCommand.userInput().getTarget());
            if (!isCanonicalEntityTarget(persistedTarget)
                    || !Objects.equals(entitySourceIntent(source), entitySourceIntent(persistedTarget))) {
                throw mismatch();
            }
            return withTarget(sourceCommand, persistedTarget);
        }
        AgentTargetRef source = requireSourceIntent(sourceCommand.userInput().getTarget());
        if (!isCanonicalTarget(persistedTarget)
                || !Objects.equals(sourceIntent(source), sourceIntent(persistedTarget))) {
            throw mismatch();
        }
        return withTarget(sourceCommand, persistedTarget);
    }

    public static AgentTargetRef retrySourceIntent(AgentTargetRef target) {
        if (isCanonicalAlertTarget(target)) {
            return alertSourceIntent(target);
        }
        if (isCanonicalEntityTarget(target)) {
            return entitySourceIntent(target);
        }
        if (isCanonicalTopologyTarget(target)) {
            return topologySourceIntent(target);
        }
        if (AgentTraceTargetAuthorityService.TARGET_VERSION.equals(target == null ? null : target.getVersion())) {
            return AgentTraceTargetCanonicalizationAdapter.sourceIntent(target);
        }
        if (AgentLogTargetAuthorityService.TARGET_VERSION.equals(target == null ? null : target.getVersion())) {
            return AgentLogTargetCanonicalizationAdapter.sourceIntent(target);
        }
        return isCanonicalTarget(target) ? sourceIntent(target) : target;
    }

    public static boolean isCanonicalTarget(AgentTargetRef target) {
        return target != null
                && EntityMonitorMetricTargetCanonicalizer.TARGET_VERSION.equals(target.getVersion())
                && target.getEntityId() != null && target.getMonitorId() != null
                && target.getService() != null && target.getAuthority() != null
                && target.getSignal() != null && "metrics".equals(target.getSignal().getType())
                && target.getAlertId() == null && target.getAlertType() == null
                && target.getCollector() == null && target.getTopology() == null && target.getTrace() == null
                && target.getLog() == null;
    }

    public static boolean isCanonicalAlertTarget(AgentTargetRef target) {
        AgentTargetAuthority authority = target == null ? null : target.getAuthority();
        return target != null
                && AgentSingleAlertTargetAuthorityService.TARGET_VERSION.equals(target.getVersion())
                && target.getAlertId() != null && target.getAlertId() > 0
                && AgentSingleAlertTargetAuthorityService.ALERT_TYPE.equals(target.getAlertType())
                && authority != null
                && Objects.equals(target.getAlertId(), authority.getBindingId())
                && AgentSingleAlertTargetAuthorityService.AUTHORITY_VERSION.equals(authority.getVersion())
                && StringUtils.hasText(authority.getHash())
                && target.getMonitorId() == null && target.getEntityId() == null
                && target.getCollector() == null && target.getSignal() == null
                && target.getTopology() == null && target.getTrace() == null && target.getLog() == null
                && target.getService() == null;
    }

    public static boolean isCanonicalEntityTarget(AgentTargetRef target) {
        AgentTargetAuthority authority = target == null ? null : target.getAuthority();
        return target != null
                && AgentEntityTargetAuthorityService.TARGET_VERSION.equals(target.getVersion())
                && target.getEntityId() != null && target.getEntityId() > 0
                && authority != null
                && Objects.equals(target.getEntityId(), authority.getBindingId())
                && AgentEntityTargetAuthorityService.AUTHORITY_VERSION.equals(authority.getVersion())
                && StringUtils.hasText(authority.getHash())
                && target.getMonitorId() == null && target.getAlertId() == null
                && target.getAlertType() == null && target.getCollector() == null
                && target.getSignal() == null && target.getTopology() == null && target.getTrace() == null
                && target.getLog() == null
                && target.getService() == null;
    }

    public static boolean isCanonicalTopologyTarget(AgentTargetRef target) {
        AgentTargetAuthority authority = target == null ? null : target.getAuthority();
        return target != null
                && AgentTopologyTargetAuthorityService.TARGET_VERSION.equals(target.getVersion())
                && target.getEntityId() != null && target.getEntityId() > 0
                && target.getTopology() != null
                && Objects.equals(target.getEntityId(), target.getTopology().getRootEntityId())
                && authority != null
                && Objects.equals(target.getEntityId(), authority.getBindingId())
                && AgentTopologyTargetAuthorityService.AUTHORITY_VERSION.equals(authority.getVersion())
                && StringUtils.hasText(authority.getHash())
                && target.getMonitorId() == null && target.getAlertId() == null && target.getAlertType() == null
                && target.getCollector() == null && target.getSignal() == null && target.getTrace() == null
                && target.getLog() == null
                && target.getService() == null;
    }

    private AgentTargetRef requireSourceIntent(AgentTargetRef target) {
        if (target == null || target.getMonitorId() == null || target.getSignal() == null
                || target.getVersion() != null || target.getEntityId() != null || target.getService() != null
                || target.getAuthority() != null || target.getAlertId() != null || target.getAlertType() != null
                || target.getCollector() != null
                || target.getTopology() != null || target.getTrace() != null || target.getLog() != null
                || target.getSignal().getTimeRange() != null
                || !MonitorMetricQueryContract.isExactWindowAllowed(
                        target.getSignal().getStart(), target.getSignal().getEnd())) {
            throw mismatch();
        }
        return target;
    }

    private static AgentTargetRef sourceIntent(AgentTargetRef target) {
        AgentSignalRef signal = target.getSignal();
        return AgentTargetRef.builder()
                .monitorId(target.getMonitorId())
                .signal(AgentSignalRef.builder()
                        .type(signal.getType())
                        .query(signal.getQuery())
                        .start(signal.getStart())
                        .end(signal.getEnd())
                        .timezone(signal.getTimezone())
                        .build())
                .build();
    }

    private InvokeCommand canonicalizeAlert(InvokeCommand command) {
        AgentTargetRef source = requireAlertSourceIntent(command.userInput().getTarget());
        if (alertAuthorityService == null) {
            throw unavailable();
        }
        try {
            AgentTargetRef target = alertAuthorityService.canonicalize(
                    command.envelope().getWorkspaceId(), source.getAlertId());
            requireSafeCanonicalTarget(target);
            return withTarget(command, target);
        } catch (AgentSingleAlertTargetAuthorityService.UnavailableException failure) {
            throw unavailable();
        } catch (RuntimeException ignored) {
            throw unavailable();
        }
    }

    private AgentTargetRef requireAlertSourceIntent(AgentTargetRef target) {
        if (target == null || target.getAlertId() == null || target.getAlertId() <= 0
                || !AgentSingleAlertTargetAuthorityService.ALERT_TYPE.equals(target.getAlertType())
                || target.getVersion() != null || target.getAuthority() != null
                || target.getMonitorId() != null || target.getEntityId() != null
                || target.getCollector() != null || target.getSignal() != null
                || target.getTopology() != null || target.getTrace() != null || target.getLog() != null
                || target.getService() != null) {
            throw unavailable();
        }
        return target;
    }

    private static AgentTargetRef alertSourceIntent(AgentTargetRef target) {
        return AgentTargetRef.builder()
                .alertId(target.getAlertId())
                .alertType(AgentSingleAlertTargetAuthorityService.ALERT_TYPE)
                .build();
    }

    private InvokeCommand canonicalizeEntity(InvokeCommand command) {
        AgentTargetRef source = requireEntitySourceIntent(command.userInput().getTarget());
        if (entityAuthorityService == null) {
            throw unavailable();
        }
        try {
            AgentTargetRef target = entityAuthorityService.canonicalize(
                    command.envelope().getWorkspaceId(), source.getEntityId());
            requireSafeCanonicalTarget(target);
            return withTarget(command, target);
        } catch (AgentEntityTargetAuthorityService.UnavailableException failure) {
            throw unavailable();
        } catch (RuntimeException ignored) {
            throw unavailable();
        }
    }

    private AgentTargetRef requireEntitySourceIntent(AgentTargetRef target) {
        if (target == null || target.getEntityId() == null || target.getEntityId() <= 0
                || target.getVersion() != null || target.getAuthority() != null
                || target.getMonitorId() != null || target.getAlertId() != null || target.getAlertType() != null
                || target.getCollector() != null || target.getSignal() != null
                || target.getTopology() != null || target.getTrace() != null || target.getLog() != null
                || target.getService() != null) {
            throw unavailable();
        }
        return target;
    }

    private static AgentTargetRef entitySourceIntent(AgentTargetRef target) {
        return AgentTargetRef.builder().entityId(target.getEntityId()).build();
    }

    private InvokeCommand canonicalizeTopology(InvokeCommand command) {
        AgentTargetRef source = requireTopologySourceIntent(command.userInput().getTarget());
        if (topologyAuthorityService == null) {
            throw unavailable();
        }
        try {
            AgentTargetRef target = topologyAuthorityService.canonicalize(
                    command.envelope().getWorkspaceId(), source.getTopology());
            requireSafeCanonicalTarget(target);
            return withTarget(command, target);
        } catch (AgentTopologyTargetAuthorityService.UnavailableException failure) {
            throw unavailable();
        } catch (RuntimeException ignored) {
            throw unavailable();
        }
    }

    private AgentTargetRef requireTopologySourceIntent(AgentTargetRef target) {
        if (target == null || target.getTopology() == null
                || target.getTopology().getRootEntityId() == null || target.getTopology().getRootEntityId() <= 0
                || target.getTopology().getDepth() == null || target.getTopology().getDepth() < 1
                || target.getTopology().getDepth() > 2
                || target.getTopology().getNodeId() != null && target.getTopology().getEdgeId() != null
                || target.getVersion() != null || target.getAuthority() != null || target.getEntityId() != null
                || target.getMonitorId() != null || target.getAlertId() != null || target.getAlertType() != null
                || target.getCollector() != null || target.getSignal() != null || target.getTrace() != null
                || target.getLog() != null
                || target.getService() != null) {
            throw unavailable();
        }
        return target;
    }

    private static AgentTargetRef topologySourceIntent(AgentTargetRef target) {
        return AgentTargetRef.builder().topology(target.getTopology()).build();
    }

    private AgentTargetRef normalizedTopologySourceIntent(AgentTargetRef target) {
        if (topologyAuthorityService == null) {
            throw mismatch();
        }
        try {
            return AgentTargetRef.builder()
                    .topology(topologyAuthorityService.normalizeSource(target.getTopology()))
                    .build();
        } catch (RuntimeException ignored) {
            throw mismatch();
        }
    }

    private boolean isAlertIntent(AgentTargetRef target) {
        if (target == null) {
            return false;
        }
        AgentTargetAuthority authority = target.getAuthority();
        return target.getAlertId() != null || target.getAlertType() != null
                || hasSingleAlertVersion(target.getVersion(), AgentSingleAlertTargetAuthorityService.TARGET_VERSION_PREFIX)
                || authority != null && hasSingleAlertVersion(
                        authority.getVersion(), AgentSingleAlertTargetAuthorityService.AUTHORITY_VERSION_PREFIX);
    }

    private boolean isEntityIntent(AgentTargetRef target) {
        if (target == null) {
            return false;
        }
        AgentTargetAuthority authority = target.getAuthority();
        return target.getTopology() == null && target.getTrace() == null && target.getLog() == null
                && target.getEntityId() != null && (target.getMonitorId() == null || target.getSignal() == null)
                || hasEntityVersion(target.getVersion(), AgentEntityTargetAuthorityService.TARGET_VERSION_PREFIX)
                || authority != null && hasEntityVersion(
                        authority.getVersion(), AgentEntityTargetAuthorityService.AUTHORITY_VERSION_PREFIX);
    }

    private boolean isTopologyIntent(AgentTargetRef target) {
        if (target == null) {
            return false;
        }
        AgentTargetAuthority authority = target.getAuthority();
        return target.getTopology() != null
                || hasTopologyVersion(target.getVersion(), AgentTopologyTargetAuthorityService.TARGET_VERSION_PREFIX)
                || authority != null && hasTopologyVersion(
                        authority.getVersion(), AgentTopologyTargetAuthorityService.AUTHORITY_VERSION_PREFIX);
    }

    private boolean hasCanonicalMarker(AgentTargetRef target) {
        return target.getVersion() != null || target.getAuthority() != null;
    }

    private boolean hasSingleAlertVersion(String version, String prefix) {
        return StringUtils.hasText(version) && version.startsWith(prefix);
    }

    private boolean hasEntityVersion(String version, String prefix) {
        return StringUtils.hasText(version) && version.startsWith(prefix);
    }

    private boolean hasTopologyVersion(String version, String prefix) {
        return StringUtils.hasText(version) && version.startsWith(prefix);
    }

    private InvokeCommand withTarget(InvokeCommand command, AgentTargetRef target) {
        UserInput userInput = command.userInput().toBuilder().target(target).build();
        return new InvokeCommand(command.envelope(), command.replyMode(), command.commandId(), userInput,
                command.entryType());
    }

    private void requireSafeCanonicalTarget(AgentTargetRef target) {
        String json = JsonUtil.toJson(target);
        if (!StringUtils.hasText(json) || !Objects.equals(json, GatewayText.redactSecrets(json))) {
            throw unavailable();
        }
    }

    private TargetCanonicalizationException mismatch() {
        return new TargetCanonicalizationException(FailureKind.MISMATCH);
    }

    private TargetCanonicalizationException unavailable() {
        return new TargetCanonicalizationException(FailureKind.UNAVAILABLE);
    }

    /** Stable cause-free failure categories for channel presentation. */
    public enum FailureKind {
        MISMATCH,
        UNAVAILABLE
    }

    /** Cause-free exception used at the channel boundary. */
    public static final class TargetCanonicalizationException extends IllegalArgumentException {

        private final FailureKind kind;

        public TargetCanonicalizationException(FailureKind kind) {
            super(kind == FailureKind.MISMATCH ? "Investigation target does not match"
                    : "Investigation target is unavailable");
            this.kind = kind;
        }

        public FailureKind kind() {
            return kind;
        }
    }
}
