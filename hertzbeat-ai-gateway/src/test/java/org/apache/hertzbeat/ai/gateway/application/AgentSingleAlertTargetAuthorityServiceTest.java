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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import org.apache.hertzbeat.alert.service.AlertService;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Server-authoritative exact SingleAlert target contracts. */
@ExtendWith(MockitoExtension.class)
class AgentSingleAlertTargetAuthorityServiceTest {

    @Mock
    private AlertService alertService;

    @Test
    void exactPersistedSingleAlertShouldProduceWorkspaceBoundCanonicalTarget() {
        when(alertService.findSingleAlert("team-a", 42L)).thenReturn(Optional.of(alert("team-a", "firing")));

        var target = service().canonicalize("team-a", 42L);

        assertEquals(AgentSingleAlertTargetAuthorityService.TARGET_VERSION, target.getVersion());
        assertEquals("single", target.getAlertType());
        assertEquals(42L, target.getAlertId());
        assertEquals(AgentSingleAlertTargetAuthorityService.AUTHORITY_VERSION,
                target.getAuthority().getVersion());
        assertTrue(service().verify("team-a", target));
        assertFalse(service().verify("team-b", target));
    }

    @Test
    void missingOrForeignAlertShouldFailWithTheSameCauseFreeUnavailableContract() {
        when(alertService.findSingleAlert("team-a", 42L)).thenReturn(Optional.empty());

        var failure = assertThrows(AgentSingleAlertTargetAuthorityService.UnavailableException.class,
                () -> service().canonicalize("team-a", 42L));

        assertEquals("Single alert target is unavailable", failure.getMessage());
        assertEquals(null, failure.getCause());
    }

    @Test
    void everyPersistedFieldThatChangesAlertGetOutputShouldInvalidateAuthority() {
        SingleAlert initial = alert("team-a", "firing");
        SingleAlert changed = alert("team-a", "resolved");
        when(alertService.findSingleAlert("team-a", 42L)).thenReturn(Optional.of(initial), Optional.of(changed));

        var before = service().canonicalize("team-a", 42L);
        var after = service().canonicalize("team-a", 42L);

        assertNotEquals(before.getAuthority().getHash(), after.getAuthority().getHash());
        assertFalse(service().matches(before, after));
    }

    private AgentSingleAlertTargetAuthorityService service() {
        return new AgentSingleAlertTargetAuthorityService(alertService);
    }

    private SingleAlert alert(String workspaceId, String status) {
        return SingleAlert.builder()
                .workspaceId(workspaceId)
                .id(42L)
                .fingerprint("fingerprint-42")
                .labels(Map.of("alertname", "HighLatency"))
                .annotations(Map.of("summary", "Latency exceeded"))
                .content("Latency exceeded")
                .status(status)
                .triggerTimes(3)
                .startAt(1_000L)
                .activeAt(2_000L)
                .endAt("resolved".equals(status) ? 3_000L : null)
                .gmtCreate(LocalDateTime.of(2026, 8, 15, 8, 0))
                .gmtUpdate(LocalDateTime.of(2026, 8, 15, 9, 0))
                .build();
    }
}
