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
 * Source contract that keeps old monitor catalog row saves behind a write boundary.
 */
class OldMonitorCatalogWriteModelSourceOwnershipTest {

    private static final Path MONITOR_SERVICE_IMPL = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/impl/MonitorServiceImpl.java");
    private static final Path OLD_MONITOR_CATALOG_WRITE_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/OldMonitorCatalogWriteModelService.java");

    @Test
    void oldMonitorCreateAndEditDelegateMonitorRowSavesToWriteModelBoundary() throws Exception {
        String source = Files.readString(MONITOR_SERVICE_IMPL);
        String addMethod = source.substring(source.indexOf("public void addMonitor("),
                source.indexOf("public void export("));
        String modifyMethod = source.substring(source.indexOf("public void modifyMonitor("),
                source.indexOf("public void deleteMonitor("));
        String normalizedSource = source.replaceAll("\\s+", " ");

        assertFalse(addMethod.contains("monitorDao.save(monitor)"),
                "old monitor create should not save monitor rows through the raw DAO");
        assertFalse(modifyMethod.contains("monitorDao.save(monitor)"),
                "old monitor edit should not save monitor rows through the raw DAO");
        assertTrue(source.contains("private OldMonitorCatalogWriteModelService oldMonitorCatalogWriteModelService"));
        assertEquals(2, countOccurrences(normalizedSource,
                "oldMonitorCatalogWriteModelService.saveMonitor(monitor)"),
                "old monitor create and edit should both delegate monitor-row persistence");

        assertTrue(Files.exists(OLD_MONITOR_CATALOG_WRITE_MODEL_SERVICE));
        String writeModelSource = Files.readString(OLD_MONITOR_CATALOG_WRITE_MODEL_SERVICE);
        assertTrue(writeModelSource.contains("private final MonitorDao monitorDao"));
        assertTrue(writeModelSource.contains("public void saveMonitor(Monitor monitor)"));
        assertTrue(writeModelSource.contains("monitorDao.save(monitor)"));
    }

    @Test
    void oldMonitorDeleteDelegatesAcceptedRowLookupAndDeleteToWriteModelBoundary() throws Exception {
        String source = Files.readString(MONITOR_SERVICE_IMPL);
        String deleteMethod = source.substring(source.indexOf("public void deleteMonitors("),
                source.indexOf("public MonitorDto getMonitorDto("));

        assertFalse(deleteMethod.contains("monitorDao.findMonitorsByIdIn"),
                "old monitor delete should not select accepted monitor rows through the raw DAO");
        assertFalse(deleteMethod.contains("monitorDao.deleteAll"),
                "old monitor delete should not delete monitor rows through the raw DAO");
        assertTrue(deleteMethod.contains("oldMonitorCatalogWriteModelService.deleteMonitorsByIds(allMonitorIds)"),
                "old monitor delete should delegate accepted row selection and deletion");

        assertTrue(Files.exists(OLD_MONITOR_CATALOG_WRITE_MODEL_SERVICE));
        String writeModelSource = Files.readString(OLD_MONITOR_CATALOG_WRITE_MODEL_SERVICE);
        assertTrue(writeModelSource.contains("public List<Monitor> deleteMonitorsByIds(Set<Long> monitorIds)"));
        assertTrue(writeModelSource.contains("monitorDao.findMonitorsByIdIn(monitorIds)"));
        assertTrue(writeModelSource.contains("monitorDao.deleteAll(monitors)"));
    }

    private static int countOccurrences(String source, String token) {
        int count = 0;
        int index = source.indexOf(token);
        while (index >= 0) {
            count++;
            index = source.indexOf(token, index + token.length());
        }
        return count;
    }
}
