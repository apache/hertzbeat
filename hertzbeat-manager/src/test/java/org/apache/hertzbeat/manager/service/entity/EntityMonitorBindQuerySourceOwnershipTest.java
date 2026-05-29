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
 * Source contract that keeps persisted monitor-bind read evidence behind a query boundary.
 */
class EntityMonitorBindQuerySourceOwnershipTest {

    private static final Path ENTITY_MONITOR_BIND_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityMonitorBindService.java");
    private static final Path ENTITY_MONITOR_BIND_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityMonitorBindQueryService.java");

    @Test
    void monitorBindReadAndCountLookupBelongToMonitorBindQueryBoundary() throws Exception {
        String bindSource = Files.readString(ENTITY_MONITOR_BIND_SERVICE);
        assertTrue(Files.exists(ENTITY_MONITOR_BIND_QUERY_SERVICE),
                "EntityMonitorBindQueryService should own raw persisted monitor-bind lookup");
        String querySource = Files.readString(ENTITY_MONITOR_BIND_QUERY_SERVICE);

        assertTrue(bindSource.contains("private final EntityMonitorBindQueryService entityMonitorBindQueryService"));
        assertTrue(bindSource.contains("entityMonitorBindQueryService.findMonitorBinds(entityId)"));
        assertTrue(bindSource.contains("entityMonitorBindQueryService.findMonitorBindsByMonitorId(monitorId)"));
        assertTrue(bindSource.contains("entityMonitorBindQueryService.countMonitorBinds(entityId)"));
        assertFalse(bindSource.contains("entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(entityId)"),
                "Monitor-bind domain service should not own raw bind row lookup");
        assertFalse(bindSource.contains("entityMonitorBindDao.findAllByMonitorId(monitorId)"),
                "Monitor-bind domain service should not own reverse monitor-id lookup");
        assertFalse(bindSource.contains("entityMonitorBindDao.countByEntityId(entityId)"),
                "Monitor-bind domain service should not own raw bind count lookup");

        assertTrue(querySource.contains("private final EntityMonitorBindDao entityMonitorBindDao"));
        assertTrue(querySource.contains("public List<EntityMonitorBind> findMonitorBinds(Long entityId)"));
        assertTrue(querySource.contains("entityMonitorBindDao.findAllByEntityIdOrderByIdAsc(entityId)"));
        assertTrue(querySource.contains("public List<EntityMonitorBind> findMonitorBindsByMonitorId(Long monitorId)"));
        assertTrue(querySource.contains("entityMonitorBindDao.findAllByMonitorId(monitorId)"));
        assertTrue(querySource.contains("public long countMonitorBinds(Long entityId)"));
        assertTrue(querySource.contains("entityMonitorBindDao.countByEntityId(entityId)"));
    }
}
