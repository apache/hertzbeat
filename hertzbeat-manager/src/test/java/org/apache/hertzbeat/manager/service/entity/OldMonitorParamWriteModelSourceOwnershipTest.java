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
 * Source contract that keeps old monitor submitted parameter saves behind a write boundary.
 */
class OldMonitorParamWriteModelSourceOwnershipTest {

    private static final Path MONITOR_SERVICE_IMPL = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/impl/MonitorServiceImpl.java");
    private static final Path OLD_MONITOR_PARAM_WRITE_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/OldMonitorParamWriteModelService.java");

    @Test
    void oldMonitorCreateAndEditDelegateParamSavesToWriteModelBoundary() throws Exception {
        String source = Files.readString(MONITOR_SERVICE_IMPL);
        String normalizedSource = source.replaceAll("\\s+", " ");

        assertFalse(source.contains("paramDao.saveAll(params)"),
                "MonitorServiceImpl should delegate submitted parameter saves to the old monitor write model");
        assertTrue(source.contains("private OldMonitorParamWriteModelService oldMonitorParamWriteModelService"));
        assertEquals(2, countOccurrences(normalizedSource,
                "oldMonitorParamWriteModelService.saveParams(params)"),
                "old monitor create and edit should both delegate submitted param persistence");

        assertTrue(Files.exists(OLD_MONITOR_PARAM_WRITE_MODEL_SERVICE));
        String writeModelSource = Files.readString(OLD_MONITOR_PARAM_WRITE_MODEL_SERVICE);
        assertTrue(writeModelSource.contains("private final ParamDao paramDao"));
        assertTrue(writeModelSource.contains("public void saveParams(List<Param> params)"));
        assertTrue(writeModelSource.contains("paramDao.saveAll(params)"));
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
