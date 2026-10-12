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
 * Source contract that keeps identity detail rows and counts behind the identity read boundary.
 */
class EntityIdentityReadEvidenceSourceOwnershipTest {

    private static final Path ENTITY_DETAIL_READ_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityDetailReadModelService.java");
    private static final Path ENTITY_SUMMARY_READ_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntitySummaryReadModelService.java");
    private static final Path ENTITY_IDENTITY_READ_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityIdentityReadModelService.java");
    private static final Path ENTITY_IDENTITY_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityIdentityQueryService.java");

    @Test
    void identityRowsAndCountsAreOwnedByIdentityReadModel() throws Exception {
        String detailSource = Files.readString(ENTITY_DETAIL_READ_MODEL_SERVICE);
        String summarySource = Files.readString(ENTITY_SUMMARY_READ_MODEL_SERVICE);

        assertFalse(detailSource.contains("EntityIdentityDao"),
                "Detail read-model should not reach through to identity storage directly");
        assertFalse(detailSource.contains("entityIdentityDao"),
                "Detail read-model should delegate persisted identity rows to the identity read boundary");
        assertFalse(summarySource.contains("EntityIdentityDao"),
                "Summary read-model should not reach through to identity storage directly");
        assertFalse(summarySource.contains("entityIdentityDao"),
                "Summary read-model should delegate identity counts to the identity read boundary");
        assertTrue(detailSource.contains("private final EntityIdentityReadModelService entityIdentityReadModelService"));
        assertTrue(detailSource.contains("entityIdentityReadModelService.findIdentities(entityId)"));
        assertTrue(summarySource.contains("private final EntityIdentityReadModelService entityIdentityReadModelService"));
        assertTrue(summarySource.contains("entityIdentityReadModelService.countIdentities(entity.getId())"));

        assertTrue(Files.exists(ENTITY_IDENTITY_READ_MODEL_SERVICE),
                "A dedicated identity read-model boundary should own identity row and count lookup");
        String identityReadSource = Files.readString(ENTITY_IDENTITY_READ_MODEL_SERVICE);
        assertFalse(identityReadSource.contains("private final EntityIdentityDao entityIdentityDao"));
        assertFalse(identityReadSource.contains("entityIdentityDao."));
        assertTrue(identityReadSource.contains("private final EntityIdentityQueryService entityIdentityQueryService"));
        assertTrue(identityReadSource.contains("public List<EntityIdentity> findIdentities(long entityId)"));
        assertTrue(identityReadSource.contains("entityIdentityQueryService.findIdentities(entityId)"));
        assertTrue(identityReadSource.contains("public long countIdentities(long entityId)"));
        assertTrue(identityReadSource.contains("entityIdentityQueryService.countIdentities(entityId)"));

        assertTrue(Files.exists(ENTITY_IDENTITY_QUERY_SERVICE),
                "A dedicated identity query boundary should own raw identity row and count lookup");
        String identityQuerySource = Files.readString(ENTITY_IDENTITY_QUERY_SERVICE);
        assertTrue(identityQuerySource.contains("private final EntityIdentityDao entityIdentityDao"));
        assertTrue(identityQuerySource.contains("entityIdentityDao.findAllByEntityIdOrderByPriorityDescIdAsc(entityId)"));
        assertTrue(identityQuerySource.contains("entityIdentityDao.countByEntityId(entityId)"));
    }
}
