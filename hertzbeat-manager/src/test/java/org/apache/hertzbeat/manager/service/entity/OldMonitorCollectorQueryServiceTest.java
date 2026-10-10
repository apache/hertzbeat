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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.Optional;
import org.apache.hertzbeat.common.entity.manager.Collector;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Contract for old monitor collector lookup evidence.
 */
@ExtendWith(MockitoExtension.class)
class OldMonitorCollectorQueryServiceTest {

    @InjectMocks
    private OldMonitorCollectorQueryService oldMonitorCollectorQueryService;

    @Mock
    private CollectorDao collectorDao;

    @Test
    void existsCollectorReturnsTrueForPersistedCollector() {
        when(collectorDao.findCollectorByName("collector-a")).thenReturn(Optional.of(new Collector()));

        assertTrue(oldMonitorCollectorQueryService.existsCollector("collector-a"));

        verify(collectorDao).findCollectorByName("collector-a");
    }

    @Test
    void existsCollectorReturnsFalseForMissingCollector() {
        when(collectorDao.findCollectorByName("collector-a")).thenReturn(Optional.empty());

        assertFalse(oldMonitorCollectorQueryService.existsCollector("collector-a"));

        verify(collectorDao).findCollectorByName("collector-a");
    }

    @Test
    void existsCollectorSkipsBlankCollector() {
        assertFalse(oldMonitorCollectorQueryService.existsCollector(" "));

        verifyNoInteractions(collectorDao);
    }
}
