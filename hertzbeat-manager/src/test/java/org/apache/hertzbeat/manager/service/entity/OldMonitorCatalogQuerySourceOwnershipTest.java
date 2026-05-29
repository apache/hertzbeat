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
 * Source contract that keeps old monitor catalog/app reads behind a query boundary.
 */
class OldMonitorCatalogQuerySourceOwnershipTest {

    private static final Path MONITOR_SERVICE_IMPL = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/impl/MonitorServiceImpl.java");
    private static final Path OLD_MONITOR_CATALOG_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/OldMonitorCatalogQueryService.java");

    @Test
    void oldMonitorServiceDelegatesCatalogAndAppReadsToQueryBoundary() throws Exception {
        String source = Files.readString(MONITOR_SERVICE_IMPL);
        String normalizedSource = source.replaceAll("\\s+", " ");

        assertFalse(source.contains("import org.apache.hertzbeat.manager.dao.MonitorDao;"),
                "MonitorServiceImpl should not depend on the raw old monitor repository");
        assertFalse(source.contains("private MonitorDao monitorDao"),
                "MonitorServiceImpl should not hold the raw old monitor repository");
        assertFalse(source.contains("monitorDao.findById("),
                "MonitorServiceImpl should not read raw monitor rows by id directly");
        assertFalse(source.contains("monitorDao.findAppsStatusCount()"),
                "MonitorServiceImpl should not read raw app status counts directly");
        assertFalse(source.contains("monitorDao.findMonitorsByAppEquals"),
                "MonitorServiceImpl should not read raw app monitor rows directly");
        assertFalse(source.contains("monitorDao.findAll()"),
                "MonitorServiceImpl should not read raw export-all monitor rows directly");
        assertFalse(source.contains("monitorDao.findMonitorByNameEquals"),
                "MonitorServiceImpl should not read raw monitor-name validation rows directly");
        assertTrue(source.contains("private OldMonitorCatalogQueryService oldMonitorCatalogQueryService"));
        assertTrue(normalizedSource.contains("oldMonitorCatalogQueryService.findMonitorById(monitorId)"));
        assertTrue(normalizedSource.contains("oldMonitorCatalogQueryService.findMonitorByName(monitor.getName())"));
        assertTrue(normalizedSource.contains("oldMonitorCatalogQueryService.findAppStatusCounts()"));
        assertTrue(normalizedSource.contains("oldMonitorCatalogQueryService.findMonitorsByApp(app)"));
        assertTrue(normalizedSource.contains("oldMonitorCatalogQueryService.findMonitorsByApp(job.getApp())"));
        assertTrue(normalizedSource.contains("oldMonitorCatalogQueryService.findAllMonitorIds()"));

        assertTrue(Files.exists(OLD_MONITOR_CATALOG_QUERY_SERVICE));
        String querySource = Files.readString(OLD_MONITOR_CATALOG_QUERY_SERVICE);
        assertTrue(querySource.contains("private final MonitorDao monitorDao"));
        assertTrue(querySource.contains("public Optional<Monitor> findMonitorById(Long monitorId)"));
        assertTrue(querySource.contains("public Optional<Monitor> findMonitorByName(String name)"));
        assertTrue(querySource.contains("public List<Monitor> findMonitorsByApp(String app)"));
        assertTrue(querySource.contains("public List<Long> findAllMonitorIds()"));
        assertTrue(querySource.contains("public List<AppCount> findAppStatusCounts()"));
        assertTrue(querySource.contains("monitorDao.findById(monitorId)"));
        assertTrue(querySource.contains("monitorDao.findMonitorByNameEquals(name)"));
        assertTrue(querySource.contains("monitorDao.findAll()"));
        assertTrue(querySource.contains("monitorDao.findAppsStatusCount()"));
        assertTrue(querySource.contains("monitorDao.findMonitorsByAppEquals(app)"));
    }
}
