/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import org.apache.hertzbeat.common.constants.ManagerEventTypeEnum;
import org.junit.jupiter.api.Test;

class ManagerSseManagerTest {

    @Test
    void streamStartsWithRetryableCanonicalRereadContract() throws Exception {
        ManagerSseManager manager = new ManagerSseManager();

        assertNotNull(manager.createEmitter(1L));
        assertEquals("manager-ready", ManagerSseManager.READY_EVENT);
        assertEquals(3_000L, ManagerSseManager.RECONNECT_MILLIS);

        String source = Files.readString(Path.of(
                "src/main/java/org/apache/hertzbeat/manager/config/ManagerSseManager.java"));
        assertTrue(source.contains(".id(nextEventId())"));
        assertTrue(source.contains(".reconnectTime(RECONNECT_MILLIS)"));
        assertTrue(source.contains("CANONICAL_REREAD"));
        assertFalse(source.contains("Last-Event-ID"));
    }

    @Test
    void taskEventContainsOnlyOpaqueRereadTrigger() {
        CapturingManager manager = new CapturingManager();

        manager.broadcastImportTaskChanged("opaque-task-id");

        assertEquals(ManagerEventTypeEnum.IMPORT_TASK_EVENT.getValue(), manager.eventName);
        assertTrue(manager.data.contains("opaque-task-id"));
        assertTrue(manager.data.contains("CANONICAL_REREAD"));
        assertFalse(manager.data.contains("errMsg"));
        assertFalse(manager.data.contains("taskName"));
    }

    private static final class CapturingManager extends ManagerSseManager {
        private String eventName;
        private String data;

        @Override
        public void broadcast(String capturedEventName, String capturedData) {
            eventName = capturedEventName;
            data = capturedData;
        }
    }
}
