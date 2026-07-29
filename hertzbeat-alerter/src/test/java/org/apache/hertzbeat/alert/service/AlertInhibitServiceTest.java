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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.apache.hertzbeat.alert.dao.AlertInhibitDao;
import org.apache.hertzbeat.alert.dto.AlertInhibitRequest;
import org.apache.hertzbeat.alert.reduce.AlarmInhibitReduce;
import org.apache.hertzbeat.alert.service.impl.AlertInhibitServiceImpl;
import org.apache.hertzbeat.common.entity.alerter.AlertInhibit;
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
class AlertInhibitServiceTest {

    @Mock
    private AlertInhibitDao dao;
    @Mock
    private AlarmInhibitReduce reducer;
    private AlertInhibitServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new AlertInhibitServiceImpl(dao, reducer, new AlertInhibitContractMapper());
    }

    @Test
    void createAndUpdateUseAuthoritativeRereads() {
        AlertInhibit saved = entity(7L, "draft");
        AlertInhibit authoritative = entity(7L, "authoritative");
        when(dao.save(any(AlertInhibit.class))).thenReturn(saved);
        when(dao.findById(7L)).thenReturn(Optional.of(authoritative));
        when(dao.findAlertInhibitsByEnableIsTrue()).thenReturn(List.of(authoritative));

        assertEquals("authoritative", service.create(request(null)).name());

        AlertInhibit existing = entity(7L, "existing");
        AlertInhibit updated = entity(7L, "updated");
        when(dao.findById(7L)).thenReturn(Optional.of(existing), Optional.of(updated));
        assertEquals("updated", service.update(request(7L)).name());
        verify(reducer, org.mockito.Mockito.times(2)).refreshInhibitRules(List.of(authoritative));
    }

    @Test
    void missingUpdateDoesNotInsert() {
        when(dao.findById(7L)).thenReturn(Optional.empty());
        assertThrows(AlertInhibitNotFoundException.class, () -> service.update(request(7L)));
        verify(dao, never()).save(any());
    }

    @Test
    void deleteRereadsAndReportsMissingIds() {
        when(dao.findAllById(Set.of(7L, 8L))).thenReturn(List.of(entity(7L, "existing")), List.of());
        when(dao.findAlertInhibitsByEnableIsTrue()).thenReturn(List.of());

        var result = service.delete(Set.of(7L, 8L));

        assertEquals("partial", result.status());
        assertEquals(Set.of(7L), result.deletedIds());
        assertEquals(Set.of(8L), result.missingIds());
        InOrder order = inOrder(dao);
        order.verify(dao).findAllById(Set.of(7L, 8L));
        order.verify(dao).deleteAlertInhibitsByIdIn(Set.of(7L));
        order.verify(dao).findAllById(Set.of(7L, 8L));
    }

    @Test
    void uncertainDeleteLeavesCacheUnpublished() {
        when(dao.findAllById(Set.of(7L))).thenReturn(List.of(entity(7L, "existing")),
                List.of(entity(7L, "remaining")));

        assertThrows(AlertInhibitOperationException.class, () -> service.delete(Set.of(7L)));
        verify(reducer, never()).refreshInhibitRules(any());
    }

    @Test
    void listMapsExplicitPageAndRejectsUnsafeControls() {
        AlertInhibit listed = entity(7L, "listed");
        when(dao.findAll(any(Specification.class), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(listed), PageRequest.of(0, 8), 1));

        var result = service.list(null, " listed ", "id", "desc", 0, 8);

        assertEquals(1, result.totalElements());
        assertEquals("listed", result.content().getFirst().name());
        assertThrows(IllegalArgumentException.class,
                () -> service.list(null, null, "sourceLabels", "desc", 0, 8));
        assertThrows(IllegalArgumentException.class,
                () -> service.list(null, null, "id", "desc", -1, 8));
    }

    private AlertInhibitRequest request(Long id) {
        AlertInhibitRequest request = new AlertInhibitRequest();
        request.setId(id);
        request.setName("Host suppression");
        request.setEnable(true);
        request.setSourceLabels(Map.of("severity", "critical"));
        request.setTargetLabels(Map.of("severity", "warning"));
        request.setEqualLabels(List.of("instance"));
        return request;
    }

    private AlertInhibit entity(Long id, String name) {
        return AlertInhibit.builder().id(id).name(name).enable(true)
                .sourceLabels(Map.of("severity", "critical"))
                .targetLabels(Map.of("severity", "warning"))
                .equalLabels(List.of("instance")).build();
    }
}
