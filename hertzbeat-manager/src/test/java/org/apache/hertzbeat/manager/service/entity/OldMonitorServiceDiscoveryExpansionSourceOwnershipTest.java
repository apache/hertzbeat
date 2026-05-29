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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

/**
 * Source contract that keeps old monitor service-discovery child expansion shared across actions.
 */
class OldMonitorServiceDiscoveryExpansionSourceOwnershipTest {

    private static final Path MONITOR_SERVICE_IMPL = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/impl/MonitorServiceImpl.java");
    private static final Path OLD_MONITOR_SERVICE_DISCOVERY_EXPANSION_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/OldMonitorServiceDiscoveryExpansionService.java");

    @Test
    void oldMonitorActionsShareServiceDiscoveryChildExpansionHelper() throws Exception {
        String source = Files.readString(MONITOR_SERVICE_IMPL);

        assertFalse(source.contains("private Set<Long> resolveMonitorIdsWithServiceDiscoveryChildren(Set<Long> ids)"),
                "Old monitor child expansion should be owned by the expansion query boundary");
        assertFalse(source.contains("findMonitorBindsByBizIdIn(parentMonitorIds)"),
                "MonitorServiceImpl should not own raw service-discovery child bind lookup");
        assertTrue(source.contains(
                "private OldMonitorServiceDiscoveryExpansionService oldMonitorServiceDiscoveryExpansionService"));
        String compactSource = source.replaceAll("\\s+", "");
        assertEquals(3, count(compactSource,
                "oldMonitorServiceDiscoveryExpansionService.resolveMonitorIdsWithServiceDiscoveryChildren(ids)"),
                "Delete, pause, and resume should all use the same expansion boundary");
        assertTrue(compactSource.indexOf("Set<Long>allMonitorIds=oldMonitorServiceDiscoveryExpansionService"
                        + ".resolveMonitorIdsWithServiceDiscoveryChildren(ids);")
                < compactSource.indexOf("List<Monitor>monitors=oldMonitorCatalogWriteModelService"
                        + ".deleteMonitorsByIds(allMonitorIds);"));
        assertTrue(compactSource.indexOf("Set<Long>allMonitorIds=oldMonitorServiceDiscoveryExpansionService"
                        + ".resolveMonitorIdsWithServiceDiscoveryChildren(ids);")
                < compactSource.indexOf("List<Monitor>managedMonitors=oldMonitorStatusWriteModelService"
                        + ".findAndMarkManagedMonitorsPaused(allMonitorIds);"));
        assertTrue(compactSource.indexOf("Set<Long>allMonitorIds=oldMonitorServiceDiscoveryExpansionService"
                        + ".resolveMonitorIdsWithServiceDiscoveryChildren(ids);")
                < compactSource.indexOf("List<Monitor>unManagedMonitors=oldMonitorStatusWriteModelService"
                        + ".findAndMarkPausedMonitorsUp(allMonitorIds);"));

        assertTrue(Files.exists(OLD_MONITOR_SERVICE_DISCOVERY_EXPANSION_SERVICE));
        String expansionSource = Files.readString(OLD_MONITOR_SERVICE_DISCOVERY_EXPANSION_SERVICE);
        assertTrue(expansionSource.contains("private final MonitorBindDao monitorBindDao"));
        assertTrue(expansionSource.contains(
                "public Set<Long> resolveMonitorIdsWithServiceDiscoveryChildren(Set<Long> ids)"));
        assertTrue(expansionSource.contains("monitorBindDao.findMonitorBindsByBizIdIn(parentMonitorIds)"));
        assertTrue(expansionSource.contains(".filter(Objects::nonNull)"));
    }

    private static int count(String source, String needle) {
        int count = 0;
        int index = source.indexOf(needle);
        while (index >= 0) {
            count++;
            index = source.indexOf(needle, index + needle.length());
        }
        return count;
    }
}
