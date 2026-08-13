/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;

/** Reconstructs a secret-free cutover identity only from a complete validated journal record. */
final class DurableCutoverDraftFactory {

    private DurableCutoverDraftFactory() {
    }

    static DurableCutoverDraft from(MigrationOperationSnapshot snapshot) {
        Objects.requireNonNull(snapshot, "snapshot");
        if (snapshot.applyMode() != ApplyMode.MANAGED_WRITE
                || snapshot.startedAt() == null
                || snapshot.managedCandidateGeneration() == null) {
            throw new MigrationOperationStoreException(SetupErrorCode.OPERATION_CONFLICT);
        }
        return new DurableCutoverDraft(
                snapshot.operationId(), snapshot.target(), snapshot.applyMode(), snapshot.createdAt(),
                snapshot.startedAt(), snapshot.managedCandidateGeneration());
    }
}
