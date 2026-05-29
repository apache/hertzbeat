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

package org.apache.hertzbeat.manager.gateway.observability;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

/**
 * Source contract that keeps observability inventory reads behind manager query boundaries.
 */
class ManagerObservabilityWorkspaceInventorySourceOwnershipTest {

    private static final Path MANAGER_OBSERVABILITY_WORKSPACE_QUERY_GATEWAY = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/gateway/observability/"
                    + "ManagerObservabilityWorkspaceQueryGateway.java");

    @Test
    void workspaceGatewayDelegatesInventoryReadsToQueryBoundary() throws Exception {
        String source = Files.readString(MANAGER_OBSERVABILITY_WORKSPACE_QUERY_GATEWAY);

        assertFalse(source.contains("import org.apache.hertzbeat.manager.dao.MonitorDao"),
                "Observability workspace gateway should not import the monitor DAO directly");
        assertFalse(source.contains("import org.apache.hertzbeat.manager.dao.CollectorDao"),
                "Observability workspace gateway should not import the collector DAO directly");
        assertFalse(source.contains("private final MonitorDao monitorDao"));
        assertFalse(source.contains("private final CollectorDao collectorDao"));

        assertTrue(source.contains("private final ManagerObservabilityInventoryQueryService inventoryQueryService"),
                "Monitor and collector inventory reads should go through the observability inventory query boundary");
        assertTrue(source.contains("inventoryQueryService.countMonitors()"));
        assertTrue(source.contains("inventoryQueryService.countCollectors()"));
        assertTrue(source.contains("inventoryQueryService.countCollectorsByStatus(status)"));
        assertTrue(source.contains("inventoryQueryService.findLatestMonitor()"));
    }
}
