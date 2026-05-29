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
 * Source contract that keeps old monitor submitted parameter reads behind a query boundary.
 */
class OldMonitorParamQuerySourceOwnershipTest {

    private static final Path MONITOR_SERVICE_IMPL = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/impl/MonitorServiceImpl.java");
    private static final Path OLD_MONITOR_PARAM_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/OldMonitorParamQueryService.java");

    @Test
    void oldMonitorServiceDelegatesParamReadsToQueryBoundary() throws Exception {
        String source = Files.readString(MONITOR_SERVICE_IMPL);
        String normalizedSource = source.replaceAll("\\s+", " ");

        assertFalse(source.contains("paramDao.findParamsByMonitorId"),
                "MonitorServiceImpl should delegate submitted parameter reads to the old monitor query boundary");
        assertTrue(source.contains("private OldMonitorParamQueryService oldMonitorParamQueryService"));
        assertEquals(4, countOccurrences(normalizedSource,
                "oldMonitorParamQueryService.findParamsByMonitorId("),
                "old monitor detail, resume, template refresh, and copy should use the query boundary");

        assertTrue(Files.exists(OLD_MONITOR_PARAM_QUERY_SERVICE));
        String querySource = Files.readString(OLD_MONITOR_PARAM_QUERY_SERVICE);
        assertTrue(querySource.contains("private final ParamDao paramDao"));
        assertTrue(querySource.contains("public List<Param> findParamsByMonitorId(Long monitorId)"));
        assertTrue(querySource.contains("paramDao.findParamsByMonitorId(monitorId)"));
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
