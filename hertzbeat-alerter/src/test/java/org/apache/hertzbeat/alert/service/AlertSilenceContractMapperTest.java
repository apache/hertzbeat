/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.alert.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.alert.dto.AlertSilenceRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class AlertSilenceContractMapperTest {

    private AlertSilenceContractMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new AlertSilenceContractMapper();
    }

    @Test
    void oneTimeSilenceRequiresOrderedInstantsAndNoDays() {
        AlertSilenceRequest request = request((byte) 0);
        assertEquals(List.of(), mapper.toNewEntity(request).getDays());
        request.setPeriodEnd(request.getPeriodStart());
        assertThrows(IllegalArgumentException.class, () -> mapper.toNewEntity(request));
        request.setPeriodEnd(ZonedDateTime.parse("2026-07-17T11:00:00Z"));
        request.setDays(List.of((byte) 1));
        assertThrows(IllegalArgumentException.class, () -> mapper.toNewEntity(request));
    }

    @Test
    void recurringSilenceSupportsCrossMidnightWithUniqueDays() {
        AlertSilenceRequest request = request((byte) 1);
        request.setDays(List.of((byte) 1, (byte) 5));
        request.setPeriodStart(ZonedDateTime.parse("2026-07-17T22:00:00Z"));
        request.setPeriodEnd(ZonedDateTime.parse("2026-07-17T02:00:00Z"));
        assertEquals(List.of((byte) 1, (byte) 5), mapper.toNewEntity(request).getDays());
        request.setDays(List.of((byte) 1, (byte) 1));
        assertThrows(IllegalArgumentException.class, () -> mapper.toNewEntity(request));
    }

    @Test
    void matcherScopeIsStrictAndBounded() {
        AlertSilenceRequest request = request((byte) 0);
        request.setMatchAll(false);
        request.setLabels(Map.of(" service ", " checkout "));
        assertEquals(Map.of("service", "checkout"), mapper.toNewEntity(request).getLabels());
        request.setLabels(Map.of());
        assertThrows(IllegalArgumentException.class, () -> mapper.toNewEntity(request));
        request.setMatchAll(true);
        request.setLabels(Map.of("service", "sensitive-value"));
        assertThrows(IllegalArgumentException.class, () -> mapper.toNewEntity(request));
    }

    @Test
    void updatePreservesResponseOnlyAndAuditFields() {
        AlertSilenceRequest request = request((byte) 0);
        request.setId(7L);
        var existing = org.apache.hertzbeat.common.entity.alerter.AlertSilence.builder()
                .id(7L).times(9).creator("creator").build();
        var updated = mapper.toExistingEntity(request, existing);
        assertEquals(9, updated.getTimes());
        assertEquals("creator", updated.getCreator());
    }

    @Test
    void nullRequestFailsValidation() {
        var existing = org.apache.hertzbeat.common.entity.alerter.AlertSilence.builder().id(7L).build();

        assertThrows(IllegalArgumentException.class, () -> mapper.toNewEntity(null));
        assertThrows(IllegalArgumentException.class, () -> mapper.toExistingEntity(null, existing));
    }

    private AlertSilenceRequest request(byte type) {
        AlertSilenceRequest request = new AlertSilenceRequest();
        request.setName("Maintenance");
        request.setEnable(true);
        request.setMatchAll(true);
        request.setType(type);
        request.setLabels(Map.of());
        request.setDays(List.of());
        request.setPeriodStart(ZonedDateTime.parse("2026-07-17T10:00:00Z"));
        request.setPeriodEnd(ZonedDateTime.parse("2026-07-17T11:00:00Z"));
        return request;
    }
}
