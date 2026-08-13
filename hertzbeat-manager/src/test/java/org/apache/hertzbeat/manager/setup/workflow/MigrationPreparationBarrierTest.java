/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.time.Instant;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.MigrationTarget;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.ApplyMode;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.junit.jupiter.api.Test;

class MigrationPreparationBarrierTest {

    private static final String OPERATION = "operation-a";
    private static final String IDENTITY = "a".repeat(64);

    @Test
    void firstPreparationErrorWinsWhenAuthoritativeReadAlsoThrowsError() {
        FileMigrationOperationStore store = mock(FileMigrationOperationStore.class);
        AssertionError journalFatal = new AssertionError("private-journal-failure");
        when(store.selectForStartup(OPERATION)).thenThrow(journalFatal);
        AssertionError preparationFatal = new AssertionError("fatal-preparation");
        RetainedCutoverPreparation delegate = (context, target, password) -> {
            throw preparationFatal;
        };
        MigrationPreparationBarrier barrier = new MigrationPreparationBarrier(store);
        barrier.bind(draft(), delegate);

        try (SecretValue password = SecretValue.of("password-a")) {
            assertThatThrownBy(() -> barrier.prepare(
                    new RetainedCutoverPreparationContext(OPERATION, IDENTITY),
                    new MetadataDatabaseSettings(
                            MetadataDatabaseKind.MYSQL,
                            "jdbc:mysql://db.example/hertzbeat", "migration"),
                    password)).isSameAs(preparationFatal);
        }
        assertThatThrownBy(() -> barrier.await(Duration.ofSeconds(1))).isSameAs(preparationFatal);
        assertThat(preparationFatal.getSuppressed()).singleElement()
                .isInstanceOfSatisfying(MigrationOperationStoreException.class, failure -> {
                    assertThat(failure.errorCode()).isEqualTo(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
                    assertThat(failure).hasNoCause();
                    assertThat(failure.getMessage()).doesNotContain("journal");
                });
        assertThat(preparationFatal.getSuppressed()).doesNotContain(journalFatal);
    }

    private static DurableCutoverDraft draft() {
        Instant now = Instant.parse("2026-08-10T06:00:00Z");
        return new DurableCutoverDraft(
                OPERATION, MigrationTarget.MYSQL, ApplyMode.MANAGED_WRITE,
                now, now, "b".repeat(64));
    }
}
