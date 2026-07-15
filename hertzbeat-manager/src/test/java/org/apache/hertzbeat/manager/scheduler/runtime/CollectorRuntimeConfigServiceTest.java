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

package org.apache.hertzbeat.manager.scheduler.runtime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.Optional;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeConfig;
import org.apache.hertzbeat.common.entity.manager.Collector;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.junit.jupiter.api.Test;

class CollectorRuntimeConfigServiceTest {

    @Test
    void persistsOnlyNewerSemanticRevisions() {
        CollectorDao collectorDao = mock(CollectorDao.class);
        Collector collector = Collector.builder().name("edge-west").build();
        when(collectorDao.findCollectorByName("edge-west")).thenReturn(Optional.of(collector));
        CollectorRuntimeConfigService service = new CollectorRuntimeConfigService(collectorDao);
        ManagedOtelRuntimeConfig revisionTwo = config(2);

        service.update("edge-west", revisionTwo);

        assertEquals(revisionTwo, service.current("edge-west").orElseThrow());
        verify(collectorDao).save(collector);
        assertThrows(CommonException.class, () -> service.update("edge-west", config(2)));
    }

    @Test
    void suppliesOneStableDefaultForRegisteredCollector() {
        CollectorDao collectorDao = mock(CollectorDao.class);
        when(collectorDao.findCollectorByName("edge-new"))
                .thenReturn(Optional.of(Collector.builder().name("edge-new").build()));
        CollectorRuntimeConfigService service = new CollectorRuntimeConfigService(collectorDao);

        ManagedOtelRuntimeConfig config = service.current("edge-new").orElseThrow();

        assertEquals(1, config.revision());
        assertEquals(Duration.ofSeconds(10), config.hostMetricsInterval());
    }

    @Test
    void readsThePersistedRevisionInsteadOfKeepingNodeLocalState() {
        CollectorDao collectorDao = mock(CollectorDao.class);
        Collector collector = Collector.builder()
                .name("edge-shared")
                .runtimeConfig(JsonUtil.toJson(config(2)))
                .build();
        when(collectorDao.findCollectorByName("edge-shared")).thenReturn(Optional.of(collector));
        CollectorRuntimeConfigService service = new CollectorRuntimeConfigService(collectorDao);

        assertEquals(2, service.current("edge-shared").orElseThrow().revision());
        collector.setRuntimeConfig(JsonUtil.toJson(config(3)));

        assertEquals(3, service.current("edge-shared").orElseThrow().revision());
    }

    @Test
    void readsLegacySchemaButOnlyPersistsCurrentSchema() {
        CollectorDao collectorDao = mock(CollectorDao.class);
        ManagedOtelRuntimeConfig schemaOne = new ManagedOtelRuntimeConfig(
                1, 2, true, Duration.ofSeconds(30));
        String schemaOneJson = JsonUtil.toJson(schemaOne);
        String legacyJson = schemaOneJson.substring(0, schemaOneJson.indexOf(",\"environment\"")) + "}";
        Collector collector = Collector.builder()
                .name("edge-upgrade")
                .runtimeConfig(legacyJson)
                .build();
        when(collectorDao.findCollectorByName("edge-upgrade")).thenReturn(Optional.of(collector));
        CollectorRuntimeConfigService service = new CollectorRuntimeConfigService(collectorDao);

        assertEquals(1, service.current("edge-upgrade").orElseThrow().schemaVersion());
        assertThrows(CommonException.class, () -> service.update(
                "edge-upgrade", new ManagedOtelRuntimeConfig(1, 3, true, Duration.ofSeconds(30))));
    }

    private ManagedOtelRuntimeConfig config(long revision) {
        return new ManagedOtelRuntimeConfig(
                ManagedOtelRuntimeConfig.CURRENT_SCHEMA_VERSION, revision, true, Duration.ofSeconds(30));
    }
}
