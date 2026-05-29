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
 * Source contract that keeps old monitor page queries behind a query boundary.
 */
class OldMonitorPageQuerySourceOwnershipTest {

    private static final Path MONITOR_SERVICE_IMPL = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/impl/MonitorServiceImpl.java");
    private static final Path OLD_MONITOR_PAGE_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/OldMonitorPageQueryService.java");

    @Test
    void oldMonitorServiceDelegatesPageQueriesToQueryBoundary() throws Exception {
        String source = Files.readString(MONITOR_SERVICE_IMPL);
        String normalizedSource = source.replaceAll("\\s+", " ");

        assertFalse(source.contains("monitorDao.findAll(specification, pageRequest)"),
                "MonitorServiceImpl should not execute raw monitor page queries directly");
        assertFalse(source.contains("CriteriaBuilder.In<Long>"),
                "MonitorServiceImpl should not build old monitor page predicates directly");
        assertFalse(source.contains("Longs.tryParse(search)"),
                "MonitorServiceImpl should not own old monitor id search parsing");
        assertTrue(source.contains("private OldMonitorPageQueryService oldMonitorPageQueryService"));
        assertTrue(normalizedSource.contains("oldMonitorPageQueryService.findMonitorPage( "
                + "monitorIds, app, search, status, sort, order, pageIndex, pageSize, labels)"));

        assertTrue(Files.exists(OLD_MONITOR_PAGE_QUERY_SERVICE));
        String queryServiceSource = Files.readString(OLD_MONITOR_PAGE_QUERY_SERVICE);
        assertTrue(queryServiceSource.contains("private final MonitorDao monitorDao"));
        assertTrue(queryServiceSource.contains("public Page<Monitor> findMonitorPage("));
        assertTrue(queryServiceSource.contains("monitorDao.findAll(specification, pageRequest)"));
        assertTrue(queryServiceSource.contains("Longs.tryParse(search)"));
        assertTrue(queryServiceSource.contains("Sort.Direction.fromString(effectiveOrder)"));
    }
}
