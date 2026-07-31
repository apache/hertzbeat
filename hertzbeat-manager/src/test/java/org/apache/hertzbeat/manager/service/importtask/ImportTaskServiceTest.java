/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.service.importtask;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class ImportTaskServiceTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-07-31T08:00:00Z"), ZoneOffset.UTC);

    @Test
    void keepsCanonicalStateStableAndIsolatesWorkspaceReads() {
        ImportTaskService service = new ImportTaskService(null, CLOCK, 100);

        ImportTaskView created = service.create("team-a");
        ImportTaskView running = service.updateProgress(created.taskId(), 40);
        ImportTaskView completed = service.complete(created.taskId());

        assertEquals(1, created.schemaVersion());
        assertEquals(ImportTaskStatus.IN_PROGRESS, created.status());
        assertEquals(created.taskId(), running.taskId());
        assertEquals(40, running.progress());
        assertEquals(ImportTaskStatus.COMPLETED, completed.status());
        assertEquals(100, completed.progress());
        assertEquals(CLOCK.instant(), completed.completedAt());
        assertNull(completed.errorCode());
        assertTrue(service.find(created.taskId(), "team-a").isPresent());
        assertFalse(service.find(created.taskId(), "team-b").isPresent());
    }

    @Test
    void exposesOnlyStableErrorCodeAndBoundsProcessLocalHistory() {
        ImportTaskService service = new ImportTaskService(null, CLOCK, 2);

        ImportTaskView first = service.create("team-a");
        ImportTaskView failed = service.fail(first.taskId(), ImportTaskErrorCode.IMPORT_INVALID_CONTENT);
        ImportTaskView second = service.create("team-a");
        service.complete(second.taskId());
        ImportTaskView third = service.create("team-a");
        service.complete(third.taskId());

        assertEquals(ImportTaskStatus.FAILED, failed.status());
        assertEquals(ImportTaskErrorCode.IMPORT_INVALID_CONTENT, failed.errorCode());
        assertFalse(service.find(first.taskId(), "team-a").isPresent());
        assertEquals(2, service.list("team-a", 20).size());
        assertEquals(third.taskId(), service.list("team-a", 20).getFirst().taskId());
        assertNotEquals(second.taskId(), third.taskId());
    }
}
