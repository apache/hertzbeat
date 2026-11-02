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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.ai.gateway.contract.AgentServiceRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentSignalRef;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetAuthority;
import org.apache.hertzbeat.ai.gateway.contract.AgentTargetRef;
import org.apache.hertzbeat.common.entity.manager.EntityIdentity;
import org.apache.hertzbeat.manager.service.entity.EntityIdentityQueryService;
import org.apache.hertzbeat.manager.service.entity.EntityMonitorBindQueryService;
import org.apache.hertzbeat.manager.service.entity.EntityMonitorMetricTargetCanonicalizer;
import org.junit.jupiter.api.Test;

class AgentEntityInvestigationAuthorityServiceTest {
    @Test
    void boundQueriesCannotExpandWindowIdentityPaginationOrTool() {
        var target = target();
        assertTrue(allowed(target, "traces.query", query("ops", 1000L, 2000L)));
        assertTrue(allowed(target, "logs.query", query("ops", 1100L, 1900L)));
        assertFalse(allowed(target, "logs.query", query("other", 1000L, 2000L)));
        assertFalse(allowed(target, "traces.query", query("ops", 999L, 2000L)));
        assertFalse(allowed(target, "traces.query", query("ops", 1000L, 2001L)));
        assertFalse(allowed(target, "traces.get", Map.of("traceId", "other")));
        assertFalse(allowed(target, "monitor.delete", Map.of("monitorId", 42L)));
        assertFalse(allowed(target, "entity.get", Map.of("entityId", 43L)));
        assertTrue(allowed(target, "entity.get", Map.of("entityId", 42L)));
        target.setService(null);
        assertFalse(allowed(target, "logs.query", query("ops", 1000L, 2000L)));
    }

    @Test
    void missingServiceIdentityDegradesAndIdentityChangesInvalidateAuthority() {
        var entities = mock(AgentEntityTargetAuthorityService.class);
        var binds = mock(EntityMonitorBindQueryService.class);
        var identities = mock(EntityIdentityQueryService.class);
        var metrics = mock(EntityMonitorMetricTargetCanonicalizer.class);
        var service = new AgentEntityInvestigationAuthorityService(entities, binds, identities, metrics);
        when(entities.canonicalize("w", 42L)).thenReturn(AgentTargetRef.builder().entityId(42L)
                .authority(AgentTargetAuthority.builder().hash("sha256:" + "b".repeat(64)).build()).build());
        when(binds.findMonitorBinds(42L)).thenReturn(List.of());
        when(identities.findIdentities(42L)).thenReturn(List.of());
        var target = service.canonicalize("w", 42L, target().getSignal());
        assertTrue(service.verify("w", target));
        assertFalse(service.permits("w", target, "logs.query", query("ops", 1000L, 2000L)));
        when(identities.findIdentities(42L)).thenReturn(List.of(EntityIdentity.builder().id(1L).entityId(42L)
                .identityKey("service.name").identityValue("changed").build()));
        assertFalse(service.verify("w", target));
    }

    private boolean allowed(AgentTargetRef target, String tool, Map<String, Object> args) {
        return AgentEntityInvestigationAuthorityService.argumentsAllowed(target, tool, args);
    }

    private Map<String, Object> query(String namespace, long start, long end) {
        return Map.of("start", start, "end", end, "serviceName", "orders", "serviceNamespace", namespace,
                "environment", "prod", "pageIndex", 0, "pageSize", 20);
    }

    private AgentTargetRef target() {
        return AgentTargetRef.builder().version("entity-investigation.v1").entityId(42L)
                .signal(AgentSignalRef.builder().type("investigation").start(1000L).end(2000L).timezone("UTC").build())
                .service(AgentServiceRef.builder().name("orders").namespace("ops").environment("prod").build())
                .authority(AgentTargetAuthority.builder().bindingId(42L).version("entity-investigation-authority.v1")
                        .hash("sha256:" + "a".repeat(64)).build()).build();
    }
}
