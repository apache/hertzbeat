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

package org.apache.hertzbeat.alert.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.apache.hertzbeat.alert.dao.GroupAlertDao;
import org.apache.hertzbeat.alert.dto.AlertGroupEvidence;
import org.apache.hertzbeat.alert.dto.AlertGroupStatusEvidence;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Bounded canonical alert-group evidence query contracts.
 */
@ExtendWith(MockitoExtension.class)
class AlertGroupEvidenceServiceTest {

    @Mock
    private GroupAlertDao groupAlertDao;

    @InjectMocks
    private AlertGroupEvidenceService evidenceService;

    @Test
    void sortsGroupsAndMissingIdsWithoutChildHydration() {
        List<String> rawIds = List.of("4", "1", "5", "2", "3", "1");
        List<Long> normalizedIds = List.of(1L, 2L, 3L, 4L, 5L);
        when(groupAlertDao.findStatusEvidenceByIdIn(normalizedIds)).thenReturn(List.of(
                new AlertGroupStatusEvidence(4L, CommonConstants.ALERT_STATUS_RESOLVED),
                new AlertGroupStatusEvidence(2L, CommonConstants.ALERT_STATUS_PENDING),
                new AlertGroupStatusEvidence(1L, CommonConstants.ALERT_STATUS_FIRING),
                new AlertGroupStatusEvidence(3L, CommonConstants.ALERT_STATUS_ACKNOWLEDGED)));
        long before = System.currentTimeMillis();

        AlertGroupEvidence result = evidenceService.getEvidence(rawIds);

        long after = System.currentTimeMillis();
        assertEquals(List.of(
                new AlertGroupStatusEvidence(1L, CommonConstants.ALERT_STATUS_FIRING),
                new AlertGroupStatusEvidence(2L, CommonConstants.ALERT_STATUS_PENDING),
                new AlertGroupStatusEvidence(3L, CommonConstants.ALERT_STATUS_ACKNOWLEDGED),
                new AlertGroupStatusEvidence(4L, CommonConstants.ALERT_STATUS_RESOLVED)), result.groups());
        assertEquals(List.of(5L), result.missingIds());
        assertTrue(result.observedAt() >= before);
        assertTrue(result.observedAt() <= after);
        verify(groupAlertDao).findStatusEvidenceByIdIn(normalizedIds);
        verify(groupAlertDao, never()).findAllById(any());
    }

    @Test
    void rejectsInvalidIdsBeforeQuery() {
        List<List<String>> invalidRequests = new ArrayList<>();
        invalidRequests.add(null);
        invalidRequests.add(List.of());
        invalidRequests.add(List.of(""));
        invalidRequests.add(List.of("0"));
        invalidRequests.add(List.of("-1"));
        invalidRequests.add(List.of("not-a-number"));

        for (List<String> invalidRequest : invalidRequests) {
            assertThrows(AlertGroupEvidenceRequestException.class,
                    () -> evidenceService.getEvidence(invalidRequest));
        }
        verifyNoInteractions(groupAlertDao);
    }

    @Test
    void limitsRawEntriesBeforeDeduplication() {
        List<String> repeatedIds = Collections.nCopies(101, "1");

        assertThrows(AlertGroupEvidenceRequestException.class,
                () -> evidenceService.getEvidence(repeatedIds));

        verifyNoInteractions(groupAlertDao);
    }

    @Test
    void rejectsUnknownPersistedStatus() {
        when(groupAlertDao.findStatusEvidenceByIdIn(List.of(1L))).thenReturn(List.of(
                new AlertGroupStatusEvidence(1L, "private-unknown-status")));

        assertThrows(AlertGroupStatusNotSupportedException.class,
                () -> evidenceService.getEvidence(List.of("1")));
    }

    @Test
    void doesNotHideDuplicateDaoRows() {
        when(groupAlertDao.findStatusEvidenceByIdIn(List.of(1L))).thenReturn(List.of(
                new AlertGroupStatusEvidence(1L, CommonConstants.ALERT_STATUS_FIRING),
                new AlertGroupStatusEvidence(1L, CommonConstants.ALERT_STATUS_RESOLVED)));

        assertThrows(IllegalStateException.class,
                () -> evidenceService.getEvidence(List.of("1")));
    }
}
