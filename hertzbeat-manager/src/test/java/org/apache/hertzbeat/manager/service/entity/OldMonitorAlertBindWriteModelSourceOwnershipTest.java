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
 * Source contract that keeps old monitor alert-bind cleanup behind a write boundary.
 */
class OldMonitorAlertBindWriteModelSourceOwnershipTest {

    private static final Path MONITOR_SERVICE_IMPL = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/impl/MonitorServiceImpl.java");
    private static final Path OLD_MONITOR_ALERT_BIND_WRITE_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/OldMonitorAlertBindWriteModelService.java");

    @Test
    void oldMonitorDeleteDelegatesAlertBindCleanupToWriteModelBoundary() throws Exception {
        String monitorSource = Files.readString(MONITOR_SERVICE_IMPL);

        assertFalse(monitorSource.contains("import org.apache.hertzbeat.alert.dao.AlertDefineBindDao"),
                "MonitorServiceImpl should not import alert bind persistence directly");
        assertFalse(monitorSource.contains("private AlertDefineBindDao alertDefineBindDao"),
                "MonitorServiceImpl should not own alert bind persistence");
        assertFalse(monitorSource.contains("alertDefineBindDao.deleteAlertDefineMonitorBindsByMonitorIdIn"),
                "MonitorServiceImpl should not delete alert binds through the DAO");

        assertTrue(monitorSource.contains("private OldMonitorAlertBindWriteModelService "
                        + "oldMonitorAlertBindWriteModelService"),
                "Old monitor deletion should delegate alert bind cleanup to the write-model boundary");
        assertTrue(monitorSource.contains(
                "oldMonitorAlertBindWriteModelService.deleteAlertBindsByMonitorIds(monitorIds)"));

        assertTrue(Files.exists(OLD_MONITOR_ALERT_BIND_WRITE_MODEL_SERVICE));
        String writeModelSource = Files.readString(OLD_MONITOR_ALERT_BIND_WRITE_MODEL_SERVICE);
        assertTrue(writeModelSource.contains("private final AlertDefineBindDao alertDefineBindDao"));
        assertTrue(writeModelSource.contains("public void deleteAlertBindsByMonitorIds(Set<Long> monitorIds)"));
        assertTrue(writeModelSource.contains("alertDefineBindDao.deleteAlertDefineMonitorBindsByMonitorIdIn("
                + "monitorIds)"));
    }
}
