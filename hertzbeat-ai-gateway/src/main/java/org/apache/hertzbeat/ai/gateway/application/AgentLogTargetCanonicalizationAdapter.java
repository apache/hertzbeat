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
import org.apache.hertzbeat.ai.gateway.application.AgentTargetCanonicalizationService.FailureKind;
import org.apache.hertzbeat.ai.gateway.application.AgentTargetCanonicalizationService.TargetCanonicalizationException;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.ai.gateway.contract.UserInput;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** Isolates strict source/canonical adaptation for one exact non-live Log Explore page. */
@Service
public class AgentLogTargetCanonicalizationAdapter {

    private final AgentLogTargetAuthorityService authorityService;

    public AgentLogTargetCanonicalizationAdapter(AgentLogTargetAuthorityService authorityService) {
        this.authorityService = authorityService;
    }

    public boolean isIntent(AgentTargetRef target) {
        if (target == null) {
            return false;
        }
        AgentTargetAuthority authority = target.getAuthority();
        return target.getLog() != null
                || hasVersion(target.getVersion(), AgentLogTargetAuthorityService.TARGET_VERSION_PREFIX)
                || authority != null && hasVersion(
                        authority.getVersion(), AgentLogTargetAuthorityService.AUTHORITY_VERSION_PREFIX);
    }

    public GatewayCommand.InvokeCommand canonicalize(GatewayCommand.InvokeCommand command) {
        AgentTargetRef source = requireSourceIntent(command.userInput().getTarget());
        try {
            AgentTargetRef target = authorityService.canonicalize(
                    command.envelope().getWorkspaceId(), source.getLog());
            if (!authorityService.isCanonicalTarget(target)
                    || !Objects.equals(authorityService.normalizeSource(source.getLog()), target.getLog())) {
                throw unavailable();
            }
            return withTarget(command, target);
        } catch (AgentLogTargetAuthorityService.UnavailableException failure) {
            throw unavailable();
        } catch (TargetCanonicalizationException failure) {
            throw failure;
        } catch (RuntimeException ignored) {
            throw unavailable();
        }
    }

    public GatewayCommand.InvokeCommand replayCommand(
            GatewayCommand.InvokeCommand command, AgentTargetRef persistedTarget) {
        AgentTargetRef source = requireSourceIntent(command.userInput().getTarget());
        try {
            if (!authorityService.isCanonicalTarget(persistedTarget)
                    || !Objects.equals(authorityService.normalizeSource(source.getLog()), persistedTarget.getLog())) {
                throw mismatch();
            }
            return withTarget(command, persistedTarget);
        } catch (TargetCanonicalizationException failure) {
            throw failure;
        } catch (RuntimeException ignored) {
            throw mismatch();
        }
    }

    public static AgentTargetRef sourceIntent(AgentTargetRef target) {
        return AgentTargetRef.builder().log(target.getLog()).build();
    }

    private AgentTargetRef requireSourceIntent(AgentTargetRef target) {
        if (target == null || target.getLog() == null || target.getVersion() != null || target.getAuthority() != null
                || target.getMonitorId() != null || target.getAlertId() != null || target.getAlertType() != null
                || target.getEntityId() != null || target.getCollector() != null || target.getSignal() != null
                || target.getTopology() != null || target.getTrace() != null || target.getService() != null) {
            throw unavailable();
        }
        return target;
    }

    private GatewayCommand.InvokeCommand withTarget(GatewayCommand.InvokeCommand command, AgentTargetRef target) {
        UserInput userInput = command.userInput().toBuilder().target(target).build();
        return new GatewayCommand.InvokeCommand(command.envelope(), command.replyMode(), command.commandId(), userInput,
                command.entryType());
    }

    private boolean hasVersion(String version, String prefix) {
        return StringUtils.hasText(version) && version.startsWith(prefix);
    }

    private TargetCanonicalizationException mismatch() {
        return new TargetCanonicalizationException(FailureKind.MISMATCH);
    }

    private TargetCanonicalizationException unavailable() {
        return new TargetCanonicalizationException(FailureKind.UNAVAILABLE);
    }
}
