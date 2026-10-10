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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.apache.hertzbeat.ai.gateway.contract.AgentServiceRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentSignalRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.manager.service.entity.EntityMonitorMetricTargetCanonicalizer;
import org.apache.hertzbeat.manager.service.entity.EntityMonitorMetricTargetVerifier;
import org.junit.jupiter.api.Test;

/** Gateway-to-manager authority snapshot adaptation. */
class AgentEntityMonitorMetricAuthorityVerifierTest {

    private final EntityMonitorMetricTargetVerifier managerVerifier = mock(EntityMonitorMetricTargetVerifier.class);
    private final AgentEntityMonitorMetricAuthorityVerifier verifier =
            new AgentEntityMonitorMetricAuthorityVerifier(managerVerifier);

    @Test
    void completeCanonicalTargetShouldPreserveEveryAuthorityFieldForManagerVerification() {
        AgentTargetRef target = target();
        when(managerVerifier.verify("workspace-a", canonicalTarget())).thenReturn(true);

        assertTrue(verifier.isCanonicalTarget(target));
        assertTrue(verifier.verify("workspace-a", target));
        verify(managerVerifier).verify(org.mockito.ArgumentMatchers.eq("workspace-a"), argThat(candidate ->
                canonicalTarget().equals(candidate)));
    }

    @Test
    void partialOrNonCanonicalEntityTargetsShouldFailBeforeManagerVerification() {
        assertFalse(verifier.verify("workspace-a", target().toBuilder().authority(null).build()));
        assertFalse(verifier.verify("workspace-a", AgentTargetRef.builder().entityId(7L).monitorId(42L).build()));
        assertFalse(verifier.verify("workspace-a", target().toBuilder()
                .signal(target().getSignal().toBuilder().timeRange("30m").build()).build()));
        verify(managerVerifier, org.mockito.Mockito.never()).verify(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    private AgentTargetRef target() {
        return AgentTargetRef.builder().version("entity-monitor-metric.v1").entityId(7L).monitorId(42L)
                .service(AgentServiceRef.builder().name("checkout").namespace("commerce").environment("prod").build())
                .signal(AgentSignalRef.builder().type("metrics").query("basic.qps")
                        .start(1_000L).end(2_000L).timezone("UTC").build())
                .authority(AgentTargetAuthority.builder().bindingId(11L).version("2026-08-15T00:00")
                        .hash("sha256:" + "a".repeat(64)).build()).build();
    }

    private EntityMonitorMetricTargetCanonicalizer.CanonicalTarget canonicalTarget() {
        return new EntityMonitorMetricTargetCanonicalizer.CanonicalTarget(
                "entity-monitor-metric.v1", 7L, 42L,
                new EntityMonitorMetricTargetCanonicalizer.ServiceIdentity("checkout", "commerce", "prod"),
                new EntityMonitorMetricTargetCanonicalizer.CanonicalSignal(
                        "metrics", "basic.qps", 1_000L, 2_000L, "UTC"),
                new EntityMonitorMetricTargetCanonicalizer.Authority(
                        11L, "2026-08-15T00:00", "sha256:" + "a".repeat(64)));
    }
}
