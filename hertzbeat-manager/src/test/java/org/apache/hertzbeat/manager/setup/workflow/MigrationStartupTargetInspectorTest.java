/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.SQLTimeoutException;
import java.time.Duration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.installation.InstallationFingerprint;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class MigrationStartupTargetInspectorTest {

    private static final InstallationFingerprint FINGERPRINT =
            new InstallationFingerprint("b".repeat(64));

    private MigrationStartupCurrentSchemaVerifier schema;
    private Connection connection;
    private PreparedStatement statement;
    private ResultSet rows;
    private JdbcMetadataMigrationDeadline deadline;

    @BeforeEach
    void setUp() throws Exception {
        schema = mock(MigrationStartupCurrentSchemaVerifier.class);
        connection = mock(Connection.class);
        statement = mock(PreparedStatement.class);
        rows = mock(ResultSet.class);
        deadline = JdbcMetadataMigrationDeadline.start(Duration.ofSeconds(5), () -> 0L);
        when(schema.isCurrent(connection, MetadataDatabaseKind.POSTGRESQL, deadline)).thenReturn(true);
        when(connection.prepareStatement(any())).thenReturn(statement);
        when(statement.executeQuery()).thenReturn(rows);
        when(rows.next()).thenReturn(true, false);
        when(rows.getShort("id")).thenReturn((short) 1);
        when(rows.getString("installation_fingerprint")).thenReturn(FINGERPRINT.value());
        when(rows.getBoolean("complete")).thenReturn(true);
    }

    @Test
    void confirmsOnlyCurrentB206WithExactCompleteInstallationSingleton() throws Exception {
        assertThat(inspector().inspect(
                connection, MetadataDatabaseKind.POSTGRESQL, FINGERPRINT, deadline))
                .isEqualTo(MigrationStartupTargetVerification.CONFIRMED);

        verify(schema).isCurrent(connection, MetadataDatabaseKind.POSTGRESQL, deadline);
        verify(statement).setQueryTimeout(5);
        verify(rows).close();
        verify(statement).close();
    }

    @Test
    void installationFingerprintMismatchIsDeterministic() throws Exception {
        when(rows.getString("installation_fingerprint")).thenReturn("c".repeat(64));

        assertThat(inspector().inspect(
                connection, MetadataDatabaseKind.POSTGRESQL, FINGERPRINT, deadline))
                .isEqualTo(MigrationStartupTargetVerification.DETERMINISTIC_MISMATCH);
    }

    @Test
    void noncurrentSchemaIsDeterministicAndNeverReadsInstallation() throws Exception {
        when(schema.isCurrent(connection, MetadataDatabaseKind.POSTGRESQL, deadline)).thenReturn(false);

        assertThat(inspector().inspect(
                connection, MetadataDatabaseKind.POSTGRESQL, FINGERPRINT, deadline))
                .isEqualTo(MigrationStartupTargetVerification.DETERMINISTIC_MISMATCH);

        verify(connection, never()).prepareStatement(any());
    }

    @Test
    void timeoutAndConnectionFailureRemainTransient() throws Exception {
        when(schema.isCurrent(connection, MetadataDatabaseKind.POSTGRESQL, deadline))
                .thenThrow(new SQLTimeoutException("private timeout"))
                .thenThrow(new SQLException("private connection", "08006"));

        assertThat(inspector().inspect(
                connection, MetadataDatabaseKind.POSTGRESQL, FINGERPRINT, deadline))
                .isEqualTo(MigrationStartupTargetVerification.TRANSIENT_UNAVAILABLE);
        assertThat(inspector().inspect(
                connection, MetadataDatabaseKind.POSTGRESQL, FINGERPRINT, deadline))
                .isEqualTo(MigrationStartupTargetVerification.TRANSIENT_UNAVAILABLE);
    }

    @Test
    void permissionOrUnknownSqlFailureIsCauseFreeRecoveryNotTargetMismatch() throws Exception {
        when(schema.isCurrent(connection, MetadataDatabaseKind.POSTGRESQL, deadline))
                .thenThrow(new SQLException("private permission", "42501"));

        assertThatThrownBy(() -> inspector().inspect(
                connection, MetadataDatabaseKind.POSTGRESQL, FINGERPRINT, deadline))
                .isInstanceOfSatisfying(MigrationStartupReconciliationException.class, failure ->
                        assertThat(failure.errorCode())
                                .isEqualTo(SetupErrorCode.CONFIG_RECOVERY_REQUIRED))
                .hasNoCause()
                .hasMessageNotContaining("private")
                .hasMessageNotContaining("permission");
    }

    private MigrationStartupTargetInspector inspector() {
        return new MigrationStartupTargetInspector(schema);
    }
}
