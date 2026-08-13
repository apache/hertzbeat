/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.SQLRecoverableException;
import java.sql.SQLTimeoutException;
import java.sql.SQLTransientConnectionException;
import java.sql.Statement;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.MockedStatic;

class FlywayTargetSchemaProvisioningWorkTest {

    @ParameterizedTest
    @MethodSource("connectionFailures")
    void preconditionConnectionFailureRequiresDiscard(SQLException diagnostic) throws Exception {
        assertFailure(preconditionFailure(diagnostic), TargetSchemaProvisioningFailure.Phase.PRECONDITION);
    }

    @ParameterizedTest
    @MethodSource("timeoutFailures")
    void preconditionTimeoutUsesStableDeadlinePhase(SQLException diagnostic) throws Exception {
        assertFailure(preconditionFailure(diagnostic), TargetSchemaProvisioningFailure.Phase.DEADLINE);
    }

    @Test
    void baselineSqlTimeoutUsesStableDeadlinePhase() throws Exception {
        Connection connection = emptyTarget();
        Statement statement = mock(Statement.class);
        when(connection.createStatement()).thenReturn(statement);
        when(statement.execute(anyString()))
                .thenThrow(new SQLTimeoutException("private baseline timeout"));

        assertFailure(run(connection), TargetSchemaProvisioningFailure.Phase.DEADLINE);
    }

    @Test
    void unexpectedPreconditionRuntimeUsesPreconditionPhase() throws Exception {
        Connection connection = mock(Connection.class);
        when(connection.getMetaData()).thenThrow(new IllegalStateException("private precondition runtime"));

        assertFailure(run(connection), TargetSchemaProvisioningFailure.Phase.PRECONDITION);
    }

    @Test
    void unexpectedBaselineRuntimeUsesBaselineExecutionPhase() throws Exception {
        Connection connection = emptyTarget();
        Statement statement = mock(Statement.class);
        when(connection.createStatement()).thenReturn(statement);
        when(statement.execute(anyString()))
                .thenThrow(new IllegalStateException("private baseline runtime"));

        assertFailure(run(connection), TargetSchemaProvisioningFailure.Phase.BASELINE_EXECUTION);
    }

    @Test
    void unexpectedHistoryRuntimeUsesHistoryWritePhase() throws Exception {
        assertFailure(run(historyFailure(new IllegalStateException("private history runtime"))),
                TargetSchemaProvisioningFailure.Phase.HISTORY_WRITE);
    }

    @Test
    void historySqlTimeoutUsesStableDeadlinePhase() throws Exception {
        assertFailure(run(historyFailure(new SQLTimeoutException("private history timeout"))),
                TargetSchemaProvisioningFailure.Phase.DEADLINE);
    }

    private static Connection historyFailure(Exception diagnostic) throws Exception {
        Connection connection = emptyTarget();
        Statement baseline = mock(Statement.class);
        Statement contract = mock(Statement.class);
        Statement history = mock(Statement.class);
        when(connection.createStatement()).thenReturn(baseline, contract, history);
        when(history.execute(anyString())).thenThrow(diagnostic);
        PreparedStatement checks = emptyQuery();
        PreparedStatement triggers = emptyQuery();
        PreparedStatement contractInsert = mock(PreparedStatement.class);
        when(connection.prepareStatement(anyString()))
                .thenReturn(checks, triggers, contractInsert);
        return connection;
    }

    private static TargetSchemaProvisioningException preconditionFailure(SQLException diagnostic)
            throws Exception {
        Connection connection = mock(Connection.class);
        when(connection.getMetaData()).thenThrow(diagnostic);
        return run(connection);
    }

    private static TargetSchemaProvisioningException run(Connection connection) {
        TargetSchemaBaseline baseline = mock(TargetSchemaBaseline.class);
        when(baseline.statements()).thenReturn(List.of("CREATE TABLE test_target (id INT)"));
        when(baseline.expectedTables()).thenReturn(Set.of());
        try (MockedStatic<TargetSchemaBaseline> baselines = mockStatic(TargetSchemaBaseline.class)) {
            baselines.when(() -> TargetSchemaBaseline.load(MetadataDatabaseKind.MYSQL)).thenReturn(baseline);
            return catchThrowableOfType(
                    () -> new FlywayTargetSchemaProvisioningWork(MetadataDatabaseKind.MYSQL)
                            .provision(connection, TargetSchemaJdbcBudget.none()),
                    TargetSchemaProvisioningException.class);
        }
    }

    private static void assertFailure(
            TargetSchemaProvisioningException failure,
            TargetSchemaProvisioningFailure.Phase phase) {
        assertThat(failure).isNotNull();
        assertThat(failure.failure().phase()).isEqualTo(phase);
        assertThat(failure.disposition()).isEqualTo(TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
        assertThat(failure).hasNoCause();
        assertThat(failure.getMessage()).doesNotContain("private");
    }

    private static Connection emptyTarget() throws Exception {
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        ResultSet tables = mock(ResultSet.class);
        when(connection.getMetaData()).thenReturn(metadata);
        when(metadata.getTables(any(), any(), anyString(), any())).thenReturn(tables);
        return connection;
    }

    private static PreparedStatement emptyQuery() throws Exception {
        PreparedStatement statement = mock(PreparedStatement.class);
        when(statement.executeQuery()).thenReturn(mock(ResultSet.class));
        return statement;
    }

    private static Stream<Arguments> connectionFailures() {
        return Stream.of(
                Arguments.of(new SQLException("private transport", "08006")),
                Arguments.of(new SQLRecoverableException("private recoverable")),
                Arguments.of(new SQLTransientConnectionException("private transient")));
    }

    private static Stream<Arguments> timeoutFailures() {
        return Stream.of(
                Arguments.of(new SQLTimeoutException("private timeout")),
                Arguments.of(new SQLException("private timeout", "HYT00")),
                Arguments.of(new SQLException("private timeout", "HYT01")),
                Arguments.of(new SQLException("private timeout", "57014")));
    }
}
