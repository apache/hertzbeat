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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.apache.hertzbeat.alert.dao.AlertSilenceDao;
import org.apache.hertzbeat.alert.dto.AlertSilenceRequest;
import org.apache.hertzbeat.alert.service.impl.AlertSilenceServiceImpl;
import org.apache.hertzbeat.common.entity.alerter.AlertSilence;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

@ExtendWith(MockitoExtension.class)
class AlertSilenceServiceTest {

    @Mock
    private AlertSilenceDao dao;
    private AlertSilenceServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new AlertSilenceServiceImpl(dao, new AlertSilenceContractMapper());
    }

    @Test
    void createUsesAuthoritativeReread() {
        AlertSilenceRequest request = onceRequest(null);
        AlertSilence saved = entity(7L, "draft");
        AlertSilence authoritative = entity(7L, "authoritative");
        when(dao.save(any(AlertSilence.class))).thenReturn(saved);
        when(dao.findById(7L)).thenReturn(Optional.of(authoritative));

        assertEquals("authoritative", service.create(request).name());
        InOrder order = inOrder(dao);
        order.verify(dao).save(any(AlertSilence.class));
        order.verify(dao).findById(7L);
    }

    @Test
    void updateRequiresExistingIdentityAndAuthoritativeReread() {
        AlertSilenceRequest request = onceRequest(7L);
        AlertSilence existing = entity(7L, "existing");
        AlertSilence authoritative = entity(7L, "updated");
        when(dao.findById(7L)).thenReturn(Optional.of(existing), Optional.of(authoritative));
        when(dao.save(any(AlertSilence.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assertEquals("updated", service.update(request).name());
        verify(dao).save(any(AlertSilence.class));
    }

    @Test
    void missingUpdateAndDetailAreDistinct() {
        AlertSilenceRequest request = onceRequest(7L);
        when(dao.findById(7L)).thenReturn(Optional.empty());
        assertThrows(AlertSilenceNotFoundException.class, () -> service.update(request));
        assertThrows(AlertSilenceNotFoundException.class, () -> service.get(7L));
    }

    @Test
    void deleteRereadsAndReportsMissingIds() {
        when(dao.findAllById(Set.of(7L, 8L))).thenReturn(List.of(entity(7L, "existing")), List.of());
        var result = service.delete(Set.of(7L, 8L));
        assertEquals("partial", result.status());
        assertEquals(Set.of(7L), result.deletedIds());
        assertEquals(Set.of(8L), result.missingIds());
        verify(dao).deleteAlertSilencesByIdIn(Set.of(7L));
    }

    @Test
    void listMapsExplicitPageAndRejectsUnsafeQueryControls() {
        AlertSilence entity = entity(7L, "listed");
        when(dao.findAll(any(Specification.class), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(entity), PageRequest.of(0, 8), 1));
        var result = service.list(null, " listed ", "id", "desc", 0, 8);
        assertEquals(1, result.totalElements());
        assertEquals("listed", result.content().getFirst().name());
        assertThrows(IllegalArgumentException.class,
                () -> service.list(null, null, "labels", "desc", 0, 8));
        assertThrows(IllegalArgumentException.class,
                () -> service.list(null, null, "id", "desc", -1, 8));
    }

    private AlertSilenceRequest onceRequest(Long id) {
        AlertSilenceRequest request = new AlertSilenceRequest();
        request.setId(id);
        request.setName("Maintenance");
        request.setEnable(true);
        request.setMatchAll(true);
        request.setType((byte) 0);
        request.setLabels(java.util.Map.of());
        request.setDays(List.of());
        request.setPeriodStart(java.time.ZonedDateTime.parse("2026-07-17T10:00:00Z"));
        request.setPeriodEnd(java.time.ZonedDateTime.parse("2026-07-17T11:00:00Z"));
        return request;
    }

    private AlertSilence entity(Long id, String name) {
        return AlertSilence.builder().id(id).name(name).enable(true).matchAll(true).type((byte) 0)
                .periodStart(java.time.ZonedDateTime.parse("2026-07-17T10:00:00Z"))
                .periodEnd(java.time.ZonedDateTime.parse("2026-07-17T11:00:00Z")).build();
    }
}
