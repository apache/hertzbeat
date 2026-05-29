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
 * Source contract that keeps persisted monitor-bind lookups behind the monitor-bind boundary.
 */
class EntityIdentityMonitorBindSourceOwnershipTest {

    private static final Path ENTITY_IDENTITY_RESOLUTION_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityIdentityResolutionService.java");
    private static final Path ENTITY_MONITOR_BIND_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityMonitorBindService.java");
    private static final Path ENTITY_MONITOR_BIND_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityMonitorBindQueryService.java");

    @Test
    void identityResolutionDelegatesPersistedBindLookupToMonitorBindBoundary() throws Exception {
        String identitySource = Files.readString(ENTITY_IDENTITY_RESOLUTION_SERVICE);
        String bindSource = Files.readString(ENTITY_MONITOR_BIND_SERVICE);
        String querySource = Files.readString(ENTITY_MONITOR_BIND_QUERY_SERVICE);

        assertFalse(identitySource.contains("EntityMonitorBindDao"),
                "Identity resolution should not read persisted monitor binds directly");
        assertTrue(identitySource.contains("private final EntityMonitorBindService entityMonitorBindService"));
        assertTrue(identitySource.contains("entityMonitorBindService.findMonitorBindsByMonitorId("));

        assertTrue(bindSource.contains("public List<EntityMonitorBind> findMonitorBindsByMonitorId(Long monitorId)"));
        assertTrue(bindSource.contains("entityMonitorBindQueryService.findMonitorBindsByMonitorId(monitorId)"));
        assertTrue(querySource.contains("private final EntityMonitorBindDao entityMonitorBindDao"));
        assertTrue(querySource.contains("entityMonitorBindDao.findAllByMonitorId(monitorId)"));
    }
}
