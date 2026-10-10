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
 * Source contract that keeps raw identity lookup behind the query boundary.
 */
class EntityIdentityQuerySourceOwnershipTest {

    private static final Path ENTITY_IDENTITY_READ_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityIdentityReadModelService.java");
    private static final Path ENTITY_IDENTITY_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityIdentityQueryService.java");

    @Test
    void identityReadModelDelegatesRawIdentityLookupToQueryBoundary() throws Exception {
        String readModelSource = Files.readString(ENTITY_IDENTITY_READ_MODEL_SERVICE);

        assertTrue(Files.exists(ENTITY_IDENTITY_QUERY_SERVICE),
                "EntityIdentityQueryService should own raw identity storage access");
        String querySource = Files.readString(ENTITY_IDENTITY_QUERY_SERVICE);

        assertFalse(readModelSource.contains("import org.apache.hertzbeat.manager.dao.EntityIdentityDao"),
                "Identity read model should not import the identity DAO directly");
        assertFalse(readModelSource.contains("private final EntityIdentityDao entityIdentityDao"),
                "Identity read model should not own raw identity storage access");
        assertFalse(readModelSource.contains("entityIdentityDao."),
                "Identity read model should not call the identity DAO directly");

        assertTrue(readModelSource.contains("private final EntityIdentityQueryService entityIdentityQueryService"));
        assertTrue(readModelSource.contains("entityIdentityQueryService.findIdentities(entityId)"));
        assertTrue(readModelSource.contains(
                "entityIdentityQueryService.findMatchingIdentities(identityKeys, normalizedValues)"));
        assertTrue(readModelSource.contains("entityIdentityQueryService.countIdentities(entityId)"));

        assertTrue(querySource.contains("import org.apache.hertzbeat.manager.dao.EntityIdentityDao"));
        assertTrue(querySource.contains("private final EntityIdentityDao entityIdentityDao"));
        assertTrue(querySource.contains("public List<EntityIdentity> findIdentities(long entityId)"));
        assertTrue(querySource.contains("entityIdentityDao.findAllByEntityIdOrderByPriorityDescIdAsc(entityId)"));
        assertTrue(querySource.contains(
                "public List<EntityIdentity> findMatchingIdentities(Set<String> identityKeys, Set<String> normalizedValues)"));
        assertTrue(querySource.contains(
                "entityIdentityDao.findAllByIdentityKeyInAndNormalizedValueIn(identityKeys, normalizedValues)"));
        assertTrue(querySource.contains("public long countIdentities(long entityId)"));
        assertTrue(querySource.contains("entityIdentityDao.countByEntityId(entityId)"));
    }
}
