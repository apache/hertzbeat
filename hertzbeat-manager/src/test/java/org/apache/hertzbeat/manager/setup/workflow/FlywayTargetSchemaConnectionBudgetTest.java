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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

class FlywayTargetSchemaConnectionBudgetTest {

    @ParameterizedTest
    @EnumSource(AdvanceAt.class)
    void everyConnectionPreconditionCallIsFollowedByTheExactBudgetGate(AdvanceAt advanceAt)
            throws Exception {
        AtomicLong ticker = new AtomicLong();
        AtomicBoolean workEntered = new AtomicBoolean();
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        when(connection.getAutoCommit()).thenAnswer(invocation -> {
            advance(advanceAt, AdvanceAt.AUTO_COMMIT, ticker);
            return true;
        });
        when(connection.isReadOnly()).thenAnswer(invocation -> {
            advance(advanceAt, AdvanceAt.READ_ONLY, ticker);
            return false;
        });
        when(connection.getMetaData()).thenAnswer(invocation -> {
            advance(advanceAt, AdvanceAt.METADATA, ticker);
            return metadata;
        });
        when(metadata.getDatabaseProductName()).thenAnswer(invocation -> {
            advance(advanceAt, AdvanceAt.PRODUCT, ticker);
            return "MySQL";
        });
        JdbcMetadataMigrationDeadline deadline = JdbcMetadataMigrationDeadline.start(
                Duration.ofNanos(1), ticker::get);
        FlywayTargetSchemaProvisioningCore core = new FlywayTargetSchemaProvisioningCore(
                new ReentrantLock(), (actual, budget) -> workEntered.set(true));

        assertThatThrownBy(() -> core.provision(connection, MetadataDatabaseKind.MYSQL, deadline))
                .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, failure -> {
                    assertThat(failure.failure().phase())
                            .isEqualTo(TargetSchemaProvisioningFailure.Phase.DEADLINE);
                    assertThat(failure.disposition())
                            .isEqualTo(TargetSchemaConnectionDisposition.REUSABLE);
                });
        assertThat(workEntered.get()).isFalse();
        verifyNextCallWasGated(connection, metadata, advanceAt);
    }

    @ParameterizedTest
    @EnumSource(MetadataFailure.class)
    void productMetadataFailureUsesPreconditionPhase(MetadataFailure metadataFailure) throws Exception {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        when(connection.getAutoCommit()).thenReturn(true);
        when(connection.isReadOnly()).thenReturn(false);
        if (metadataFailure == MetadataFailure.LOOKUP) {
            when(connection.getMetaData()).thenThrow(new SQLException("private metadata", "08006"));
        } else {
            when(connection.getMetaData()).thenReturn(metadata);
            when(metadata.getDatabaseProductName()).thenThrow(new SQLException("private product", "08006"));
        }

        assertThatThrownBy(() -> new FlywayTargetSchemaProvisioningCore(
                        new ReentrantLock(), (actual, budget) -> { })
                .provision(connection, MetadataDatabaseKind.MYSQL, deadline()))
                .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, failure -> {
                    assertThat(failure.failure().phase())
                            .isEqualTo(TargetSchemaProvisioningFailure.Phase.PRECONDITION);
                    assertThat(failure.disposition())
                            .isEqualTo(TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
                });
    }

    @ParameterizedTest
    @EnumSource(StateFailure.class)
    void connectionStateFailureUsesTransactionPhase(StateFailure stateFailure) throws Exception {
        Connection connection = mock(Connection.class);
        if (stateFailure == StateFailure.AUTO_COMMIT) {
            when(connection.getAutoCommit()).thenThrow(new SQLException("private auto-commit", "08006"));
        } else {
            when(connection.getAutoCommit()).thenReturn(true);
            when(connection.isReadOnly()).thenThrow(new SQLException("private read-only", "08006"));
        }

        assertThatThrownBy(() -> new FlywayTargetSchemaProvisioningCore(
                        new ReentrantLock(), (actual, budget) -> { })
                .provision(connection, MetadataDatabaseKind.MYSQL, deadline()))
                .isInstanceOfSatisfying(TargetSchemaProvisioningException.class, failure -> {
                    assertThat(failure.failure().phase())
                            .isEqualTo(TargetSchemaProvisioningFailure.Phase.TRANSACTION);
                    assertThat(failure.disposition())
                            .isEqualTo(TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
                });
    }

    private static void advance(AdvanceAt actual, AdvanceAt expected, AtomicLong ticker) {
        if (actual == expected) {
            ticker.set(2);
        }
    }

    private static void verifyNextCallWasGated(
            Connection connection,
            DatabaseMetaData metadata,
            AdvanceAt advanceAt) throws Exception {
        switch (advanceAt) {
            case AUTO_COMMIT -> verify(connection, never()).isReadOnly();
            case READ_ONLY -> verify(connection, never()).getMetaData();
            case METADATA -> verify(metadata, never()).getDatabaseProductName();
            case PRODUCT -> { }
            default -> throw new AssertionError("Unexpected connection precondition step");
        }
    }

    private static JdbcMetadataMigrationDeadline deadline() {
        return JdbcMetadataMigrationDeadline.start(Duration.ofSeconds(5), System::nanoTime);
    }

    private enum AdvanceAt {
        AUTO_COMMIT,
        READ_ONLY,
        METADATA,
        PRODUCT
    }

    private enum MetadataFailure {
        LOOKUP,
        PRODUCT_NAME
    }

    private enum StateFailure {
        AUTO_COMMIT,
        READ_ONLY
    }
}
