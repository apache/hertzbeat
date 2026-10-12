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
 * Source contract that keeps runtime health calculation separate from catalog-row persistence.
 */
class EntityRuntimeHealthWriteModelSourceOwnershipTest {

    private static final Path ENTITY_RUNTIME_HEALTH_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityRuntimeHealthService.java");
    private static final Path ENTITY_RUNTIME_HEALTH_WRITE_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityRuntimeHealthWriteModelService.java");
    private static final Path ENTITY_CORE_WRITE_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityCoreWriteModelService.java");

    @Test
    void runtimeHealthDelegatesChangedStatusPersistenceToWriteModel() throws Exception {
        String runtimeHealthSource = Files.readString(ENTITY_RUNTIME_HEALTH_SERVICE);
        assertTrue(Files.exists(ENTITY_RUNTIME_HEALTH_WRITE_MODEL_SERVICE),
                "EntityRuntimeHealthWriteModelService should own catalog-row status persistence");
        String writeModelSource = Files.readString(ENTITY_RUNTIME_HEALTH_WRITE_MODEL_SERVICE);
        String coreWriteModelSource = Files.readString(ENTITY_CORE_WRITE_MODEL_SERVICE);

        assertTrue(runtimeHealthSource.contains(
                "private final EntityRuntimeHealthWriteModelService entityRuntimeHealthWriteModelService"));
        assertTrue(runtimeHealthSource.contains("entityRuntimeHealthWriteModelService.persistStatus(entity, status)"));
        assertFalse(runtimeHealthSource.contains("import org.apache.hertzbeat.manager.dao.ObserveEntityDao"),
                "Runtime health calculation should not import the catalog DAO");
        assertFalse(runtimeHealthSource.contains("private final ObserveEntityDao observeEntityDao"),
                "Runtime health calculation should not own catalog-row persistence directly");
        assertFalse(runtimeHealthSource.contains("observeEntityDao.save(entity)"),
                "Runtime health calculation should delegate changed-status persistence");

        assertFalse(writeModelSource.contains("import org.apache.hertzbeat.manager.dao.ObserveEntityDao"),
                "Runtime health write model should not own the raw catalog DAO after the core write boundary exists");
        assertFalse(writeModelSource.contains("private final ObserveEntityDao observeEntityDao"),
                "Runtime health write model should delegate catalog-row writes to EntityCoreWriteModelService");
        assertFalse(writeModelSource.contains("observeEntityDao.save(entity)"),
                "Runtime health write model should not save catalog rows directly");
        assertTrue(writeModelSource.contains(
                "private final EntityCoreWriteModelService entityCoreWriteModelService"));
        assertTrue(writeModelSource.contains("ObserveEntity persistStatus(ObserveEntity entity, String status)"));
        assertTrue(writeModelSource.contains("return entityCoreWriteModelService.persistStatus(entity, status);"));

        assertTrue(coreWriteModelSource.contains("private final ObserveEntityDao observeEntityDao"));
        assertTrue(coreWriteModelSource.contains("public ObserveEntity persistStatus(ObserveEntity entity, String status)"));
        assertTrue(coreWriteModelSource.contains("entity.setStatus(status);"));
        assertTrue(coreWriteModelSource.contains("return observeEntityDao.save(entity);"));
    }
}
