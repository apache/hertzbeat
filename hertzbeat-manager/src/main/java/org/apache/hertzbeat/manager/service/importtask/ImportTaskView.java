/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.service.importtask;

import java.time.Instant;

/** Versioned canonical state returned for one monitor import task. */
public record ImportTaskView(
        int schemaVersion,
        String taskId,
        String taskType,
        ImportTaskStatus status,
        int progress,
        Instant createdAt,
        Instant startedAt,
        Instant completedAt,
        ImportTaskErrorCode errorCode) {
}
