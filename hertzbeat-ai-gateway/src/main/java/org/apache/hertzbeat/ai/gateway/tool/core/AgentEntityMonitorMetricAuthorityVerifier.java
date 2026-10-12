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

package org.apache.hertzbeat.ai.gateway.tool.core;

import org.apache.hertzbeat.ai.gateway.contract.AgentServiceRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentSignalRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.manager.service.entity.EntityMonitorMetricTargetCanonicalizer;
import org.apache.hertzbeat.manager.service.entity.EntityMonitorMetricTargetVerifier;
import org.springframework.stereotype.Service;

/** Adapts a durable Gateway target to the manager's current authority verifier. */
@Service
public class AgentEntityMonitorMetricAuthorityVerifier {

    private final EntityMonitorMetricTargetVerifier verifier;

    public AgentEntityMonitorMetricAuthorityVerifier(EntityMonitorMetricTargetVerifier verifier) {
        this.verifier = verifier;
    }

    public boolean verify(String workspaceId, AgentTargetRef target) {
        var canonical = canonicalTarget(target);
        return canonical != null && verifier.verify(workspaceId, canonical);
    }

    public boolean isCanonicalTarget(AgentTargetRef target) {
        return canonicalTarget(target) != null;
    }

    private EntityMonitorMetricTargetCanonicalizer.CanonicalTarget canonicalTarget(AgentTargetRef target) {
        if (target == null
                || !EntityMonitorMetricTargetCanonicalizer.TARGET_VERSION.equals(target.getVersion())
                || target.getEntityId() == null || target.getEntityId() <= 0
                || target.getMonitorId() == null || target.getMonitorId() <= 0
                || target.getAlertId() != null || target.getCollector() != null || target.getTopology() != null
                || target.getTrace() != null || target.getLog() != null) {
            return null;
        }
        AgentServiceRef service = target.getService();
        AgentSignalRef signal = target.getSignal();
        AgentTargetAuthority authority = target.getAuthority();
        if (service == null || signal == null || authority == null || signal.getTimeRange() != null) {
            return null;
        }
        return new EntityMonitorMetricTargetCanonicalizer.CanonicalTarget(
                target.getVersion(), target.getEntityId(), target.getMonitorId(),
                new EntityMonitorMetricTargetCanonicalizer.ServiceIdentity(
                        service.getName(), service.getNamespace(), service.getEnvironment()),
                new EntityMonitorMetricTargetCanonicalizer.CanonicalSignal(
                        signal.getType(), signal.getQuery(), signal.getStart(), signal.getEnd(), signal.getTimezone()),
                new EntityMonitorMetricTargetCanonicalizer.Authority(
                        authority.getBindingId(), authority.getVersion(), authority.getHash()));
    }
}
