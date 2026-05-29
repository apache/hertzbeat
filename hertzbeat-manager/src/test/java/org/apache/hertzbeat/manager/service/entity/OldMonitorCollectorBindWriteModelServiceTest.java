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

package org.apache.hertzbeat.manager.service.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;

import org.apache.hertzbeat.common.entity.manager.CollectorMonitorBind;
import org.apache.hertzbeat.manager.dao.CollectorMonitorBindDao;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for old monitor collector-bind cleanup persistence.
 */
@ExtendWith(MockitoExtension.class)
class OldMonitorCollectorBindWriteModelServiceTest {

    @InjectMocks
    private OldMonitorCollectorBindWriteModelService oldMonitorCollectorBindWriteModelService;

    @Mock
    private CollectorMonitorBindDao collectorMonitorBindDao;

    @Test
    void deleteCollectorBindByMonitorIdDeletesPersistedRows() {
        oldMonitorCollectorBindWriteModelService.deleteCollectorBindByMonitorId(42L);

        verify(collectorMonitorBindDao).deleteCollectorMonitorBindsByMonitorId(42L);
    }

    @Test
    void deleteCollectorBindByMonitorIdSkipsMissingId() {
        oldMonitorCollectorBindWriteModelService.deleteCollectorBindByMonitorId(null);

        verifyNoInteractions(collectorMonitorBindDao);
    }

    @Test
    void replaceCollectorBindDeletesExistingAndSavesSubmittedCollector() {
        oldMonitorCollectorBindWriteModelService.replaceCollectorBind(42L, "collector-a");

        InOrder inOrder = inOrder(collectorMonitorBindDao);
        inOrder.verify(collectorMonitorBindDao).deleteCollectorMonitorBindsByMonitorId(42L);
        ArgumentCaptor<CollectorMonitorBind> bindCaptor = ArgumentCaptor.forClass(CollectorMonitorBind.class);
        inOrder.verify(collectorMonitorBindDao).save(bindCaptor.capture());
        assertEquals(42L, bindCaptor.getValue().getMonitorId());
        assertEquals("collector-a", bindCaptor.getValue().getCollector());
        verifyNoMoreInteractions(collectorMonitorBindDao);
    }

    @Test
    void replaceCollectorBindDeletesExistingAndSkipsBlankCollector() {
        oldMonitorCollectorBindWriteModelService.replaceCollectorBind(42L, " ");

        verify(collectorMonitorBindDao).deleteCollectorMonitorBindsByMonitorId(42L);
        verify(collectorMonitorBindDao, never()).save(any(CollectorMonitorBind.class));
    }

    @Test
    void replaceCollectorBindSkipsMissingId() {
        oldMonitorCollectorBindWriteModelService.replaceCollectorBind(null, "collector-a");

        verifyNoInteractions(collectorMonitorBindDao);
    }

    @Test
    void saveCollectorBindSavesSubmittedCollector() {
        oldMonitorCollectorBindWriteModelService.saveCollectorBind(42L, "collector-a");

        ArgumentCaptor<CollectorMonitorBind> bindCaptor = ArgumentCaptor.forClass(CollectorMonitorBind.class);
        verify(collectorMonitorBindDao).save(bindCaptor.capture());
        assertEquals(42L, bindCaptor.getValue().getMonitorId());
        assertEquals("collector-a", bindCaptor.getValue().getCollector());
        verifyNoMoreInteractions(collectorMonitorBindDao);
    }

    @Test
    void saveCollectorBindSkipsBlankCollector() {
        oldMonitorCollectorBindWriteModelService.saveCollectorBind(42L, " ");

        verifyNoInteractions(collectorMonitorBindDao);
    }

    @Test
    void saveCollectorBindSkipsMissingId() {
        oldMonitorCollectorBindWriteModelService.saveCollectorBind(null, "collector-a");

        verifyNoInteractions(collectorMonitorBindDao);
    }
}
