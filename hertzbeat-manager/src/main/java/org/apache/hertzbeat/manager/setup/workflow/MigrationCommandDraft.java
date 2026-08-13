/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.time.Instant;
import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;

/** Immutable command identity whose start time is bound only by the executing worker. */
record MigrationCommandDraft(
        String operationId,
        MigrationTarget target,
        ApplyMode applyMode,
        Instant createdAt,
        String candidateGeneration) {

    MigrationCommandDraft {
        Objects.requireNonNull(operationId, "operationId");
        Objects.requireNonNull(target, "target");
        Objects.requireNonNull(applyMode, "applyMode");
        Objects.requireNonNull(createdAt, "createdAt");
        Objects.requireNonNull(candidateGeneration, "candidateGeneration");
    }

    DurableCutoverDraft start(Instant workerStartedAt) {
        Objects.requireNonNull(workerStartedAt, "workerStartedAt");
        Instant safeStartedAt = workerStartedAt.isBefore(createdAt) ? createdAt : workerStartedAt;
        return new DurableCutoverDraft(
                operationId, target, applyMode, createdAt, safeStartedAt, candidateGeneration);
    }
}
