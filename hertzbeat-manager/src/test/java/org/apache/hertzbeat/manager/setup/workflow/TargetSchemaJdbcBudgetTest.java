/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.Duration;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.junit.jupiter.api.Test;

class TargetSchemaJdbcBudgetTest {

    @Test
    void statementReceivesPositiveCeilingOfExactRemainingBudget() throws Exception {
        AtomicLong ticker = new AtomicLong();
        TargetSchemaJdbcBudget budget = new TargetSchemaJdbcBudget(
                JdbcMetadataMigrationDeadline.start(Duration.ofMillis(1500), ticker::get));
        Statement statement = mock(Statement.class);

        budget.apply(statement);

        verify(statement).setQueryTimeout(2);
        ticker.set(Duration.ofSeconds(2).toNanos());
        assertThatThrownBy(() -> budget.apply(statement))
                .isInstanceOfSatisfying(MetadataMigrationException.class, failure ->
                        assertThat(failure.code())
                                .isEqualTo(MetadataMigrationErrorCode.TIMEOUT));
    }

    @Test
    void statementTimeoutConfigurationCannotConsumeTheRemainingBudget() throws Exception {
        AtomicLong ticker = new AtomicLong();
        TargetSchemaJdbcBudget budget = new TargetSchemaJdbcBudget(
                JdbcMetadataMigrationDeadline.start(Duration.ofNanos(1), ticker::get));
        Statement statement = mock(Statement.class);
        doAnswer(invocation -> {
            ticker.set(2);
            return null;
        }).when(statement).setQueryTimeout(1);

        assertThatThrownBy(() -> budget.apply(statement))
                .isInstanceOfSatisfying(MetadataMigrationException.class, failure ->
                        assertThat(failure.code()).isEqualTo(MetadataMigrationErrorCode.TIMEOUT));
    }

    @Test
    void catalogRowsStopBeforeFieldReadsWhenCallerIsInterrupted() throws Exception {
        Connection connection = mock(Connection.class);
        PreparedStatement statement = mock(PreparedStatement.class);
        ResultSet rows = mock(ResultSet.class);
        when(connection.prepareStatement(anyString())).thenReturn(statement);
        when(statement.executeQuery()).thenReturn(rows);
        when(rows.next()).thenAnswer(invocation -> {
            Thread.currentThread().interrupt();
            return true;
        });
        TargetSchemaJdbcBudget budget = new TargetSchemaJdbcBudget(
                JdbcMetadataMigrationDeadline.start(Duration.ofSeconds(5), System::nanoTime));

        try {
            assertThatThrownBy(() -> JdbcTargetSchemaObjectState.capture(
                    connection,
                    MetadataDatabaseKind.MYSQL,
                    Set.of("monitor"),
                    budget,
                    parts -> { }))
                    .isInstanceOfSatisfying(MetadataMigrationException.class, failure ->
                            assertThat(failure.code())
                                    .isEqualTo(MetadataMigrationErrorCode.TIMEOUT));
            verify(rows, never()).getString(1);
        } finally {
            Thread.interrupted();
        }
    }

    @Test
    void identityRowsUseTheSameCooperativeBudget() throws Exception {
        Connection connection = mock(Connection.class);
        PreparedStatement statement = mock(PreparedStatement.class);
        ResultSet rows = interruptingRow();
        when(connection.prepareStatement(anyString())).thenReturn(statement);
        when(statement.executeQuery()).thenReturn(rows);
        TargetSchemaJdbcBudget budget = budget();

        try {
            assertThatThrownBy(() -> JdbcTargetSchemaObjectState.captureIdentityOwnership(
                    connection,
                    MetadataDatabaseKind.POSTGRESQL,
                    "monitor",
                    List.of("id"),
                    budget,
                    parts -> { }))
                    .isInstanceOf(MetadataMigrationException.class);
            verify(rows, never()).getString(1);
        } finally {
            Thread.interrupted();
        }
    }

    @Test
    void recordedContractRowsUseTheSameCooperativeBudget() throws Exception {
        Connection connection = mock(Connection.class);
        PreparedStatement checks = mock(PreparedStatement.class);
        PreparedStatement triggers = mock(PreparedStatement.class);
        PreparedStatement recorded = mock(PreparedStatement.class);
        ResultSet emptyChecks = mock(ResultSet.class);
        ResultSet emptyTriggers = mock(ResultSet.class);
        ResultSet recordedRows = interruptingRow();
        when(connection.prepareStatement(anyString())).thenReturn(checks, triggers, recorded);
        when(checks.executeQuery()).thenReturn(emptyChecks);
        when(triggers.executeQuery()).thenReturn(emptyTriggers);
        when(recorded.executeQuery()).thenReturn(recordedRows);

        try {
            assertThatThrownBy(() -> new TargetSchemaContract(MetadataDatabaseKind.MYSQL)
                    .matches(connection, Set.of(), budget()))
                    .isInstanceOf(MetadataMigrationException.class);
            verify(recordedRows, never()).getString("database_kind");
        } finally {
            Thread.interrupted();
        }
    }

    private static TargetSchemaJdbcBudget budget() {
        return new TargetSchemaJdbcBudget(
                JdbcMetadataMigrationDeadline.start(Duration.ofSeconds(5), System::nanoTime));
    }

    private static ResultSet interruptingRow() throws Exception {
        ResultSet rows = mock(ResultSet.class);
        when(rows.next()).thenAnswer(invocation -> {
            Thread.currentThread().interrupt();
            return true;
        });
        return rows;
    }
}
