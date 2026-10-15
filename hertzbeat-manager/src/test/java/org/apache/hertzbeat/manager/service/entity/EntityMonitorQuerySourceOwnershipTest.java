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
 * Source contract that keeps old monitor DAO access behind an entity anti-corruption query boundary.
 */
class EntityMonitorQuerySourceOwnershipTest {

    private static final Path ENTITY_MONITOR_BIND_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityMonitorBindService.java");
    private static final Path ENTITY_INTEGRATION_HINT_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityIntegrationHintService.java");
    private static final Path ENTITY_MONITOR_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityMonitorQueryService.java");

    @Test
    void oldMonitorDaoBridgeIsOwnedByEntityMonitorQueryService() throws Exception {
        String bindSource = Files.readString(ENTITY_MONITOR_BIND_SERVICE);
        String hintSource = Files.readString(ENTITY_INTEGRATION_HINT_SERVICE);
        String querySource = Files.readString(ENTITY_MONITOR_QUERY_SERVICE);

        assertFalse(bindSource.contains("MonitorDao"),
                "Monitor bind writes should not reach through to the old monitor DAO directly");
        assertFalse(hintSource.contains("MonitorDao"),
                "Integration hints should not reach through to the old monitor DAO directly");
        assertTrue(bindSource.contains("EntityMonitorQueryService"));
        assertTrue(hintSource.contains("EntityMonitorQueryService"));
        assertTrue(bindSource.contains("entityMonitorQueryService.monitorExists("));
        assertTrue(bindSource.contains("entityMonitorQueryService.findMonitorsByIds("));
        assertTrue(hintSource.contains("entityMonitorQueryService.findMonitor(monitorId)"));

        assertTrue(querySource.contains("private final MonitorDao monitorDao"));
        assertTrue(querySource.contains("public Optional<Monitor> findMonitor(long monitorId)"));
        assertTrue(querySource.contains("public boolean monitorExists(Long monitorId)"));
        assertTrue(querySource.contains("public List<Monitor> findMonitorsByIds(Collection<Long> monitorIds)"));
    }
}
