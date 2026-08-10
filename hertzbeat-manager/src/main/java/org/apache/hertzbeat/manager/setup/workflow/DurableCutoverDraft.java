/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.time.Instant;
import java.util.Objects;
import java.util.regex.Pattern;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.OperationIdValidator;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;

/** Immutable, secret-free identity and timestamps for one durable cutover preparation. */
record DurableCutoverDraft(
        String operationId,
        MigrationTarget target,
        ApplyMode applyMode,
        Instant createdAt,
        Instant startedAt,
        String candidateGeneration) {

    private static final Pattern GENERATION = Pattern.compile("[A-Za-z0-9][A-Za-z0-9-]{0,63}");

    DurableCutoverDraft {
        if (!OperationIdValidator.isSafe(operationId)) {
            throw new IllegalArgumentException("Unsafe migration operation identifier");
        }
        Objects.requireNonNull(target, "target");
        Objects.requireNonNull(applyMode, "applyMode");
        Objects.requireNonNull(createdAt, "createdAt");
        Objects.requireNonNull(startedAt, "startedAt");
        if (startedAt.isBefore(createdAt)) {
            throw new IllegalArgumentException("Migration start cannot precede creation");
        }
        boolean managedGeneration = candidateGeneration != null
                && GENERATION.matcher(candidateGeneration).matches();
        if (applyMode == ApplyMode.MANAGED_WRITE && !managedGeneration
                || applyMode == ApplyMode.EXTERNAL_APPLY && candidateGeneration != null) {
            throw new IllegalArgumentException("Migration candidate does not match apply mode");
        }
    }

    @Override
    public String toString() {
        return "DurableCutoverDraft[operationId=" + operationId + ", target=" + target
                + ", applyMode=" + applyMode + "]";
    }
}
