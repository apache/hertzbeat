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
 * Source contract that keeps old monitor status mutation behind a write-model boundary.
 */
class OldMonitorStatusWriteModelSourceOwnershipTest {

    private static final Path MONITOR_SERVICE_IMPL = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/impl/MonitorServiceImpl.java");
    private static final Path OLD_MONITOR_STATUS_WRITE_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/OldMonitorStatusWriteModelService.java");

    @Test
    void oldMonitorServiceDelegatesStatusUpdatesToWriteModelBoundary() throws Exception {
        String source = Files.readString(MONITOR_SERVICE_IMPL);
        String normalizedSource = source.replaceAll("\\s+", " ").replace(" .", ".");

        assertFalse(source.contains("monitorDao.updateMonitorStatus"),
                "MonitorServiceImpl should not update raw monitor status directly");
        assertTrue(source.contains("private OldMonitorStatusWriteModelService oldMonitorStatusWriteModelService"));
        assertTrue(normalizedSource.contains("oldMonitorStatusWriteModelService.updateMonitorStatus(monitorId, status)"));

        assertTrue(Files.exists(OLD_MONITOR_STATUS_WRITE_MODEL_SERVICE));
        String writeModelSource = Files.readString(OLD_MONITOR_STATUS_WRITE_MODEL_SERVICE);
        assertTrue(writeModelSource.contains("private final MonitorDao monitorDao"));
        assertTrue(writeModelSource.contains("public void updateMonitorStatus(Long monitorId, byte status)"));
        assertTrue(writeModelSource.contains("monitorDao.updateMonitorStatus(monitorId, status)"));
    }

    @Test
    void oldMonitorServiceDelegatesPauseResumePersistenceToWriteModelBoundary() throws Exception {
        String source = Files.readString(MONITOR_SERVICE_IMPL);
        String normalizedSource = source.replaceAll("\\s+", " ").replace(" .", ".");
        String cancelBody = source.substring(source.indexOf("public void cancelManageMonitors"),
                source.indexOf("public void enableManageMonitors"));
        String enableBody = source.substring(source.indexOf("public void enableManageMonitors"),
                source.indexOf("public List<AppCount> getAllAppMonitorsCount"));

        assertFalse(cancelBody.contains("monitorDao.findMonitorsByIdIn"),
                "cancelManageMonitors should not read raw monitor rows directly");
        assertFalse(cancelBody.contains("monitorDao.saveAll"),
                "cancelManageMonitors should not save monitor rows directly");
        assertFalse(enableBody.contains("monitorDao.findMonitorsByIdIn"),
                "enableManageMonitors should not read raw monitor rows directly");
        assertFalse(enableBody.contains("monitorDao.saveAll"),
                "enableManageMonitors should not save monitor rows directly");
        assertTrue(normalizedSource.contains(
                "oldMonitorStatusWriteModelService.findAndMarkManagedMonitorsPaused(allMonitorIds)"));
        assertTrue(normalizedSource.contains(
                "oldMonitorStatusWriteModelService.findAndMarkPausedMonitorsUp(allMonitorIds)"));
        assertTrue(normalizedSource.contains(
                "oldMonitorStatusWriteModelService.saveMonitorStatusChanges(managedMonitors)"));
        assertTrue(normalizedSource.contains(
                "oldMonitorStatusWriteModelService.saveMonitorStatusChanges(unManagedMonitors)"));

        String writeModelSource = Files.readString(OLD_MONITOR_STATUS_WRITE_MODEL_SERVICE);
        assertTrue(writeModelSource.contains("public List<Monitor> findAndMarkManagedMonitorsPaused(Set<Long>"));
        assertTrue(writeModelSource.contains("public List<Monitor> findAndMarkPausedMonitorsUp(Set<Long>"));
        assertTrue(writeModelSource.contains("public void saveMonitorStatusChanges(List<Monitor> monitors)"));
        assertTrue(writeModelSource.contains("monitorDao.findMonitorsByIdIn(monitorIds)"));
        assertTrue(writeModelSource.contains("monitorDao.saveAll(monitors)"));
    }

    @Test
    void oldMonitorServiceDelegatesTemplateRefreshJobIdPersistenceToWriteModelBoundary() throws Exception {
        String source = Files.readString(MONITOR_SERVICE_IMPL);
        String normalizedSource = source.replaceAll("\\s+", " ").replace(" .", ".");
        String updateAppCollectJobBody = source.substring(source.indexOf("public void updateAppCollectJob"),
                source.indexOf("public Monitor getMonitor"));

        assertFalse(updateAppCollectJobBody.contains("monitor.setJobId(newJobId)"),
                "template refresh should not mutate persisted job id directly");
        assertFalse(updateAppCollectJobBody.contains("monitorDao.save(monitor)"),
                "template refresh should not save monitor rows directly");
        assertTrue(normalizedSource.contains("oldMonitorStatusWriteModelService.saveMonitorJobId(monitor, newJobId)"));

        String writeModelSource = Files.readString(OLD_MONITOR_STATUS_WRITE_MODEL_SERVICE);
        assertTrue(writeModelSource.contains("public void saveMonitorJobId(Monitor monitor, long jobId)"));
        assertTrue(writeModelSource.contains("monitor.setJobId(jobId)"));
        assertTrue(writeModelSource.contains("monitorDao.save(monitor)"));
    }
}
