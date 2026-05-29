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
 * Source contract that keeps old monitor add collector-bind creation behind a write boundary.
 */
class OldMonitorCollectorBindAddSourceOwnershipTest {

    private static final Path MONITOR_SERVICE_IMPL = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/impl/MonitorServiceImpl.java");
    private static final Path OLD_MONITOR_COLLECTOR_BIND_WRITE_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/OldMonitorCollectorBindWriteModelService.java");

    @Test
    void oldMonitorAddDelegatesCollectorBindCreationToWriteModelBoundary() throws Exception {
        String source = Files.readString(MONITOR_SERVICE_IMPL);
        String addMethod = source.substring(source.indexOf("public void addMonitor("),
                source.indexOf("public void export("));
        String normalizedAddMethod = normalizeWhitespace(addMethod);

        assertFalse(addMethod.contains("collectorMonitorBindDao.save"),
                "Old monitor add should not save collector binds through the raw DAO");
        assertTrue(normalizedAddMethod.contains(
                "oldMonitorCollectorBindWriteModelService.saveCollectorBind(monitorId, collector)"));

        assertTrue(Files.exists(OLD_MONITOR_COLLECTOR_BIND_WRITE_MODEL_SERVICE));
        String writeModelSource = Files.readString(OLD_MONITOR_COLLECTOR_BIND_WRITE_MODEL_SERVICE);
        assertTrue(writeModelSource.contains("private final CollectorMonitorBindDao collectorMonitorBindDao"));
        assertTrue(writeModelSource.contains("public void saveCollectorBind(Long monitorId, String collector)"));
        assertTrue(writeModelSource.contains("collectorMonitorBindDao.save(collectorMonitorBind)"));
    }

    private static String normalizeWhitespace(String value) {
        return value.replaceAll("\\s+", " ");
    }
}
