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
 * Source contract that keeps latest definition activity lookup behind the activity read boundary.
 */
class EntitySummaryDefinitionActivitySourceOwnershipTest {

    private static final Path ENTITY_SUMMARY_READ_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntitySummaryReadModelService.java");
    private static final Path ENTITY_ACTIVITY_READ_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityActivityReadModelService.java");
    private static final Path ENTITY_ACTIVITY_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityActivityQueryService.java");

    @Test
    void summaryReadModelDelegatesLatestDefinitionActivityLookupToActivityReadModel() throws Exception {
        String summarySource = Files.readString(ENTITY_SUMMARY_READ_MODEL_SERVICE);
        String activitySource = Files.readString(ENTITY_ACTIVITY_READ_MODEL_SERVICE);
        String querySource = Files.readString(ENTITY_ACTIVITY_QUERY_SERVICE);

        assertFalse(summarySource.contains("EntityDefinitionActivityDao"),
                "Summary read-model should not reach through to activity storage directly");
        assertFalse(summarySource.contains("entityDefinitionActivityDao"),
                "Summary read-model should delegate latest definition activity lookup");
        assertTrue(summarySource.contains("private final EntityActivityReadModelService entityActivityReadModelService"));
        assertTrue(summarySource.contains("entityActivityReadModelService.findLatestDefinitionActivities(entityIds)"));

        assertTrue(activitySource.contains("public Map<Long, EntityDefinitionActivity> findLatestDefinitionActivities("));
        assertTrue(activitySource.contains("entityActivityQueryService.findLatestDefinitionActivities(entityIds)"));
        assertFalse(activitySource.contains("entityDefinitionActivityDao.findAllByEntityIdIn("));
        assertTrue(querySource.contains("entityDefinitionActivityDao.findAllByEntityIdIn("));
        assertTrue(querySource.contains("isDefinitionActivityType(activity.getActivityType())"));
    }
}
