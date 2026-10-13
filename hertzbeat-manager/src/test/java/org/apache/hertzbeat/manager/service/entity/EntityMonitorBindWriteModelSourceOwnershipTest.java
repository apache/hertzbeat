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
 * Source contract that keeps raw monitor-bind persistence behind a write-model boundary.
 */
class EntityMonitorBindWriteModelSourceOwnershipTest {

    private static final Path ENTITY_MONITOR_BIND_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityMonitorBindService.java");
    private static final Path ENTITY_MONITOR_BIND_WRITE_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityMonitorBindWriteModelService.java");

    @Test
    void monitorBindPersistenceBelongsToMonitorBindWriteModelBoundary() throws Exception {
        String monitorBindSource = Files.readString(ENTITY_MONITOR_BIND_SERVICE);
        assertTrue(Files.exists(ENTITY_MONITOR_BIND_WRITE_MODEL_SERVICE),
                "EntityMonitorBindWriteModelService should own raw monitor-bind persistence");
        String writeModelSource = Files.readString(ENTITY_MONITOR_BIND_WRITE_MODEL_SERVICE);

        assertTrue(monitorBindSource.contains(
                "private final EntityMonitorBindWriteModelService entityMonitorBindWriteModelService"));
        assertTrue(monitorBindSource.contains("entityMonitorBindWriteModelService.deleteMonitorBinds(entityId)"));
        assertTrue(monitorBindSource.contains("entityMonitorBindWriteModelService.replaceMonitorBinds(entityId, rows)"));
        assertFalse(monitorBindSource.contains("EntityMonitorBindDao"),
                "Monitor-bind domain service should not import raw monitor-bind storage");
        assertFalse(monitorBindSource.contains("entityMonitorBindDao."),
                "Monitor-bind domain service should not call raw monitor-bind storage");

        assertTrue(writeModelSource.contains("private final EntityMonitorBindDao entityMonitorBindDao"));
        assertTrue(writeModelSource.contains("public void deleteMonitorBinds(Long entityId)"));
        assertTrue(writeModelSource.contains("entityMonitorBindDao.deleteAllByEntityId(entityId)"));
        assertTrue(writeModelSource.contains("public void replaceMonitorBinds(Long entityId, List<EntityMonitorBind> rows)"));
        assertTrue(writeModelSource.contains("entityMonitorBindDao.flush()"));
        assertTrue(writeModelSource.contains("entityMonitorBindDao.saveAll(rows)"));
    }
}
