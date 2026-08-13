/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationOperationState;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationStage;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.VerificationState;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.junit.jupiter.api.Test;

class DurableCutoverDraftFactoryTest {

    private static final Instant CREATED = Instant.parse("2026-08-10T01:00:00Z");
    private static final Instant STARTED = CREATED.plusSeconds(1);

    @Test
    void derivesEveryImmutableFieldFromTheValidatedJournalSnapshot() {
        MigrationOperationSnapshot snapshot = snapshot(ApplyMode.MANAGED_WRITE, STARTED, "generation-a");

        DurableCutoverDraft draft = DurableCutoverDraftFactory.from(snapshot);

        assertThat(draft.operationId()).isEqualTo("operation-a");
        assertThat(draft.target()).isEqualTo(MigrationTarget.POSTGRESQL);
        assertThat(draft.applyMode()).isEqualTo(ApplyMode.MANAGED_WRITE);
        assertThat(draft.createdAt()).isEqualTo(CREATED);
        assertThat(draft.startedAt()).isEqualTo(STARTED);
        assertThat(draft.candidateGeneration()).isEqualTo("generation-a");
    }

    @Test
    void rejectsPrePreparationAndExternalSnapshotsWithoutInventingIdentity() {
        assertThatThrownBy(() -> DurableCutoverDraftFactory.from(pending()))
                .isInstanceOf(MigrationOperationStoreException.class)
                .hasNoCause();
        assertThatThrownBy(() -> DurableCutoverDraftFactory.from(
                snapshot(ApplyMode.EXTERNAL_APPLY, STARTED, null)))
                .isInstanceOf(MigrationOperationStoreException.class)
                .hasNoCause();
    }

    private static MigrationOperationSnapshot snapshot(
            ApplyMode applyMode, Instant startedAt, String generation) {
        return new MigrationOperationSnapshot(
                "operation-a", MigrationOperationState.RUNNING, MigrationTarget.POSTGRESQL,
                applyMode, MigrationStage.ACTIVATING, 100, CREATED, startedAt, null,
                VerificationState.SUCCEEDED, null, null, 250, false, false, false,
                "a".repeat(64), generation);
    }

    private static MigrationOperationSnapshot pending() {
        return new MigrationOperationSnapshot(
                "operation-a", MigrationOperationState.PENDING, MigrationTarget.POSTGRESQL,
                ApplyMode.MANAGED_WRITE, MigrationStage.QUEUED, 0, CREATED, null, null,
                VerificationState.PENDING, null, null, 250, false, false, false,
                "a".repeat(64), "generation-a");
    }
}
