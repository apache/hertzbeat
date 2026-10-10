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
 * Source contract that keeps old monitor deletion cleanup behind the entity monitor-bind boundary.
 */
class OldMonitorDeletionEntityBindSourceOwnershipTest {

    private static final Path MONITOR_SERVICE_IMPL = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/impl/MonitorServiceImpl.java");
    private static final Path ENTITY_MONITOR_BIND_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityMonitorBindService.java");
    private static final Path ENTITY_MONITOR_BIND_WRITE_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityMonitorBindWriteModelService.java");

    @Test
    void oldMonitorDeletionDelegatesEntityBindCleanupToEntityBoundary() throws Exception {
        String monitorSource = Files.readString(MONITOR_SERVICE_IMPL);
        String bindSource = Files.readString(ENTITY_MONITOR_BIND_SERVICE);
        String writeModelSource = Files.readString(ENTITY_MONITOR_BIND_WRITE_MODEL_SERVICE);

        assertFalse(monitorSource.contains("import org.apache.hertzbeat.manager.dao.EntityMonitorBindDao"),
                "Monitor service should not import entity monitor-bind DAO directly");
        assertFalse(monitorSource.contains("private EntityMonitorBindDao entityMonitorBindDao"),
                "Monitor service should not own entity monitor-bind persistence");
        assertFalse(monitorSource.contains("entityMonitorBindDao.deleteAllByMonitorIdIn"),
                "Monitor service should not delete entity monitor binds through the DAO");

        assertTrue(monitorSource.contains("private EntityMonitorBindService entityMonitorBindService"),
                "Old monitor deletion should delegate entity bind cleanup to the entity monitor-bind boundary");
        assertTrue(monitorSource.contains("entityMonitorBindService.deleteMonitorBindsByMonitorIds(monitorIds)"));
        assertTrue(bindSource.contains("public void deleteMonitorBindsByMonitorIds(Set<Long> monitorIds)"));
        assertTrue(bindSource.contains("entityMonitorBindWriteModelService.deleteMonitorBindsByMonitorIds(monitorIds)"));
        assertTrue(writeModelSource.contains("public void deleteMonitorBindsByMonitorIds(Set<Long> monitorIds)"));
        assertTrue(writeModelSource.contains("entityMonitorBindDao.deleteAllByMonitorIdIn(monitorIds)"));
    }
}
