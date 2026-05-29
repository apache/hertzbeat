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
 * Source contract that keeps final catalog row deletion behind the core write model.
 */
class EntityDeletionCatalogRowSourceOwnershipTest {

    private static final Path ENTITY_DELETION_WRITE_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDeletionWriteModelService.java");
    private static final Path ENTITY_CORE_WRITE_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityCoreWriteModelService.java");

    @Test
    void catalogRowDeletionIsOwnedByCoreWriteModel() throws Exception {
        String deletionSource = Files.readString(ENTITY_DELETION_WRITE_MODEL_SERVICE);
        String coreSource = Files.readString(ENTITY_CORE_WRITE_MODEL_SERVICE);

        assertFalse(deletionSource.contains("ObserveEntityDao"),
                "Deletion write-model should not reach through to catalog storage directly");
        assertFalse(deletionSource.contains("observeEntityDao"),
                "Deletion write-model should delegate final catalog row removal to the core write model");
        assertTrue(deletionSource.contains("private final EntityCoreWriteModelService entityCoreWriteModelService"));
        assertTrue(deletionSource.contains("entityCoreWriteModelService.deleteEntityById(entityId)"));

        assertTrue(coreSource.contains("public void deleteEntityById(long entityId)"));
        assertTrue(coreSource.contains("observeEntityDao.deleteById(entityId)"));
    }
}
