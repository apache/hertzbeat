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

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

/**
 * Source contract that keeps old monitor delete collector-bind cleanup behind a write boundary.
 */
class OldMonitorCollectorBindDeleteCleanupSourceOwnershipTest {

    private static final Path MONITOR_SERVICE_IMPL = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/impl/MonitorServiceImpl.java");
    private static final Path OLD_MONITOR_COLLECTOR_BIND_WRITE_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/OldMonitorCollectorBindWriteModelService.java");

    @Test
    void oldMonitorDeletionDelegatesCollectorBindCleanupToWriteModelBoundary() throws Exception {
        String source = Files.readString(MONITOR_SERVICE_IMPL);
        String deleteMethod = source.substring(source.indexOf("public void deleteMonitors(Set<Long> ids)"),
                source.indexOf("public MonitorDto getMonitorDto(long id)"));

        assertFalse(deleteMethod.contains("collectorMonitorBindDao.deleteCollectorMonitorBindsByMonitorId"),
                "Old monitor deletion should not delete collector binds through the raw DAO");
        assertTrue(source.contains(
                "private OldMonitorCollectorBindWriteModelService oldMonitorCollectorBindWriteModelService"));
        assertTrue(deleteMethod.contains(
                "oldMonitorCollectorBindWriteModelService.deleteCollectorBindByMonitorId(monitor.getId())"));

        assertTrue(Files.exists(OLD_MONITOR_COLLECTOR_BIND_WRITE_MODEL_SERVICE));
        String writeModelSource = Files.readString(OLD_MONITOR_COLLECTOR_BIND_WRITE_MODEL_SERVICE);
        assertTrue(writeModelSource.contains("private final CollectorMonitorBindDao collectorMonitorBindDao"));
        assertTrue(writeModelSource.contains("public void deleteCollectorBindByMonitorId(Long monitorId)"));
        assertTrue(writeModelSource.contains(
                "collectorMonitorBindDao.deleteCollectorMonitorBindsByMonitorId(monitorId)"));
    }
}
