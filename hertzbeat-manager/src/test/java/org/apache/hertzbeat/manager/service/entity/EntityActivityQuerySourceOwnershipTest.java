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
 * Source contract that keeps raw definition activity lookup behind the query boundary.
 */
class EntityActivityQuerySourceOwnershipTest {

    private static final Path ENTITY_ACTIVITY_READ_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityActivityReadModelService.java");
    private static final Path ENTITY_ACTIVITY_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityActivityQueryService.java");

    @Test
    void activityReadModelDelegatesRawActivityLookupToQueryBoundary() throws Exception {
        String readModelSource = Files.readString(ENTITY_ACTIVITY_READ_MODEL_SERVICE);

        assertTrue(Files.exists(ENTITY_ACTIVITY_QUERY_SERVICE),
                "EntityActivityQueryService should own raw definition activity storage access");
        String querySource = Files.readString(ENTITY_ACTIVITY_QUERY_SERVICE);

        assertFalse(readModelSource.contains("import org.apache.hertzbeat.manager.dao.EntityDefinitionActivityDao"),
                "Activity read model should not import the activity DAO directly");
        assertFalse(readModelSource.contains("private final EntityDefinitionActivityDao entityDefinitionActivityDao"),
                "Activity read model should not own raw activity storage access");
        assertFalse(readModelSource.contains("entityDefinitionActivityDao."),
                "Activity read model should not call the activity DAO directly");
        assertFalse(readModelSource.contains("entityWorkspaceAccessService.findAccessibleEntityById("),
                "Entity-scoped activity access belongs to the activity query boundary");
        assertFalse(readModelSource.contains("private boolean isEntityAccessibleForWorkspace("),
                "Entity-scoped activity access belongs to the activity query boundary");
        assertFalse(readModelSource.contains("private boolean matchesActivityWorkspace("),
                "Activity workspace row filtering belongs to the activity query boundary");
        assertFalse(readModelSource.contains("private boolean isDefinitionActivityType("),
                "Latest definition activity row selection belongs to the activity query boundary");

        assertTrue(readModelSource.contains("private final EntityActivityQueryService entityActivityQueryService"));
        assertTrue(readModelSource.contains("entityActivityQueryService.findDefinitionActivities("));
        assertTrue(readModelSource.contains("entityActivityQueryService.findLatestDefinitionActivities("));
        assertTrue(readModelSource.contains("private EntityDefinitionActivityInfo toDefinitionActivityInfo("));

        assertTrue(querySource.contains("import org.apache.hertzbeat.manager.dao.EntityDefinitionActivityDao"));
        assertTrue(querySource.contains("private final EntityDefinitionActivityDao entityDefinitionActivityDao"));
        assertTrue(querySource.contains("private final EntityWorkspaceAccessService entityWorkspaceAccessService"));
        assertTrue(querySource.contains("public List<EntityDefinitionActivity> findDefinitionActivities("));
        assertTrue(querySource.contains("public Map<Long, EntityDefinitionActivity> findLatestDefinitionActivities("));
        assertTrue(querySource.contains("entityWorkspaceAccessService.isEntityAccessibleForRequestWorkspace("));
        assertTrue(querySource.contains("entityDefinitionActivityDao.findAllByEntityId("));
        assertTrue(querySource.contains("entityDefinitionActivityDao.findAllByWorkspaceId("));
        assertTrue(querySource.contains("entityDefinitionActivityDao.findAllByEntityIdIn("));
        assertTrue(querySource.contains("matchesActivityWorkspace("));
        assertTrue(querySource.contains("isDefinitionActivityType("));
    }
}
