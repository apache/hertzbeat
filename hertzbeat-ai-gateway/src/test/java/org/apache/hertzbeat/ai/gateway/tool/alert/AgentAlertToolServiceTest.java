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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.apache.hertzbeat.alert.service.AlertService;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

/** Test Agent alert query contracts. */
class AgentAlertToolServiceTest {

    private AlertService alertService;
    private AgentAlertToolService service;

    @BeforeEach
    void setUp() {
        alertService = mock(AlertService.class);
        service = new AgentAlertToolService(alertService);
    }

    @Test
    void shouldTreatAllStatusAsNoDatabaseFilter() {
        SingleAlert alert = SingleAlert.builder().id(42L).status("firing").content("CPU high").build();
        when(alertService.getSingleAlerts(isNull(), isNull(), eq("gmtUpdate"), eq("desc"), eq(0), eq(10)))
                .thenReturn(new PageImpl<>(List.of(alert), PageRequest.of(0, 10), 1));

        Map<String, Object> response = service.alertQuery("single", "all", null, null, null, null, null);

        verify(alertService).getSingleAlerts(isNull(), isNull(), eq("gmtUpdate"), eq("desc"), eq(0), eq(10));
        assertEquals("single", response.get("alertType"));
    }

    @Test
    void shouldGetAlertByExactId() {
        SingleAlert alert = SingleAlert.builder().id(42L).status("resolved").content("Recovered").build();
        when(alertService.findSingleAlert(42L)).thenReturn(Optional.of(alert));
        when(alertService.findGroupAlert(42L)).thenReturn(Optional.empty());

        Map<String, Object> response = service.alertGet(42L);

        assertEquals(42L, response.get("alertId"));
        assertFalse(response.containsKey("group"));
        assertEquals(42L, ((Map<?, ?>) response.get("single")).get("id"));
    }

    @Test
    void shouldResolveExactExistingAlerts() {
        when(alertService.findSingleAlert(42L)).thenReturn(Optional.of(SingleAlert.builder().id(42L).build()));

        Map<String, Object> result = service.resolveAlerts("single", List.of(42L), "incident recovered");

        verify(alertService).editSingleAlertStatus("resolved", List.of(42L));
        assertEquals(1, result.get("affectedCount"));
    }

    @Test
    void shouldRejectMissingAlertBeforeMutation() {
        when(alertService.findSingleAlert(42L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> service.resolveAlerts("single", List.of(42L), "incident recovered"));
    }
}
