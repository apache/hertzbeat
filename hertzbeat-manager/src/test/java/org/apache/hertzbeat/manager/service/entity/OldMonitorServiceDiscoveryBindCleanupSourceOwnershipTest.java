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
 * Source contract that keeps old monitor service-discovery bind cleanup behind a write boundary.
 */
class OldMonitorServiceDiscoveryBindCleanupSourceOwnershipTest {

    private static final Path MONITOR_SERVICE_IMPL = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/impl/MonitorServiceImpl.java");
    private static final Path OLD_MONITOR_SERVICE_DISCOVERY_BIND_WRITE_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/"
                    + "OldMonitorServiceDiscoveryBindWriteModelService.java");

    @Test
    void oldMonitorDeletionDelegatesServiceDiscoveryBindCleanupToWriteModelBoundary() throws Exception {
        String monitorSource = Files.readString(MONITOR_SERVICE_IMPL);

        assertFalse(monitorSource.contains("import org.apache.hertzbeat.manager.dao.MonitorBindDao"),
                "MonitorServiceImpl should not import the old monitor bind DAO directly");
        assertFalse(monitorSource.contains("private MonitorBindDao monitorBindDao"),
                "MonitorServiceImpl should not own old service-discovery bind persistence");
        assertFalse(monitorSource.contains("monitorBindDao.deleteMonitorBindByBizIdIn"),
                "MonitorServiceImpl should not delete parent service-discovery binds through the DAO");
        assertFalse(monitorSource.contains("monitorBindDao.deleteByMonitorId"),
                "MonitorServiceImpl should not delete child service-discovery binds through the DAO");

        assertTrue(monitorSource.contains(
                "private OldMonitorServiceDiscoveryBindWriteModelService "
                        + "oldMonitorServiceDiscoveryBindWriteModelService"));
        assertTrue(monitorSource.contains(
                "oldMonitorServiceDiscoveryBindWriteModelService.deleteBindsByParentMonitorIds(monitorIds)"));
        assertTrue(monitorSource.contains(
                "oldMonitorServiceDiscoveryBindWriteModelService.deleteBindsByChildMonitorId(monitor.getId())"));

        assertTrue(Files.exists(OLD_MONITOR_SERVICE_DISCOVERY_BIND_WRITE_MODEL_SERVICE));
        String writeModelSource = Files.readString(OLD_MONITOR_SERVICE_DISCOVERY_BIND_WRITE_MODEL_SERVICE);
        assertTrue(writeModelSource.contains("private final MonitorBindDao monitorBindDao"));
        assertTrue(writeModelSource.contains("public void deleteBindsByParentMonitorIds(Set<Long> monitorIds)"));
        assertTrue(writeModelSource.contains("monitorBindDao.deleteMonitorBindByBizIdIn(monitorIds)"));
        assertTrue(writeModelSource.contains("public void deleteBindsByChildMonitorId(Long monitorId)"));
        assertTrue(writeModelSource.contains("monitorBindDao.deleteByMonitorId(monitorId)"));
    }
}
