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
 * Source contract that keeps old monitor collector-bind reads behind a query boundary.
 */
class OldMonitorCollectorBindQuerySourceOwnershipTest {

    private static final Path MONITOR_SERVICE_IMPL = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/impl/MonitorServiceImpl.java");
    private static final Path OLD_MONITOR_COLLECTOR_BIND_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/OldMonitorCollectorBindQueryService.java");

    @Test
    void oldMonitorServiceDelegatesCollectorBindReadsToQueryBoundary() throws Exception {
        String source = Files.readString(MONITOR_SERVICE_IMPL);
        String normalizedSource = normalizeWhitespace(source);

        assertFalse(source.contains("private CollectorMonitorBindDao collectorMonitorBindDao"),
                "MonitorServiceImpl should not own the collector-bind DAO directly");
        assertFalse(source.contains("findCollectorMonitorBindByMonitorId"),
                "MonitorServiceImpl should not read single collector binds through the raw DAO");
        assertFalse(source.contains("findCollectorMonitorBindsByMonitorIdIn"),
                "MonitorServiceImpl should not read bulk collector binds through the raw DAO");
        assertTrue(source.contains(
                "private OldMonitorCollectorBindQueryService oldMonitorCollectorBindQueryService"));
        assertTrue(normalizedSource.contains(
                "oldMonitorCollectorBindQueryService.findCollectorByMonitorId(monitor.getId())"));
        assertTrue(normalizedSource.contains(
                "oldMonitorCollectorBindQueryService.findCollectorByMonitorIds("));
        assertTrue(normalizedSource.contains(
                "monitors.stream().map(Monitor::getId).collect(Collectors.toSet())"));

        assertTrue(Files.exists(OLD_MONITOR_COLLECTOR_BIND_QUERY_SERVICE));
        String querySource = Files.readString(OLD_MONITOR_COLLECTOR_BIND_QUERY_SERVICE);
        assertTrue(querySource.contains("private final CollectorMonitorBindDao collectorMonitorBindDao"));
        assertTrue(querySource.contains("public Optional<String> findCollectorByMonitorId(Long monitorId)"));
        assertTrue(querySource.contains("public Map<Long, String> findCollectorByMonitorIds(Set<Long> monitorIds)"));
        assertTrue(querySource.contains("collectorMonitorBindDao.findCollectorMonitorBindByMonitorId(monitorId)"));
        assertTrue(querySource.contains("collectorMonitorBindDao.findCollectorMonitorBindsByMonitorIdIn(monitorIds)"));
    }

    private static String normalizeWhitespace(String value) {
        return value.replaceAll("\\s+", " ");
    }
}
