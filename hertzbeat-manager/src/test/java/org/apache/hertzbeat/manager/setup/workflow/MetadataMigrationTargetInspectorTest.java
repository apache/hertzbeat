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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Field;
import java.sql.Connection;
import java.time.Duration;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.TargetInspection;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class MetadataMigrationTargetInspectorTest {

    private static final MetadataDatabaseSettings SETTINGS = new MetadataDatabaseSettings(
            MetadataDatabaseKind.MYSQL, "jdbc:mysql://db.example/hertzbeat", "operator");

    private final TargetJdbcConnectionFactory factory = mock(TargetJdbcConnectionFactory.class);
    private final TargetJdbcConnectionLease lease = mock(TargetJdbcConnectionLease.class);
    private final TargetSchemaReadOnlyInspector schema = mock(TargetSchemaReadOnlyInspector.class);
    private final Connection connection = mock(Connection.class);
    private SecretValue password;
    private MetadataMigrationTargetInspector inspector;

    @BeforeEach
    void setUp() {
        password = SecretValue.of("borrowed-password");
        inspector = new MetadataMigrationTargetInspector(factory, schema);
        when(factory.acquire(eq(SETTINGS), eq(password), any())).thenReturn(lease);
        doAnswer(invocation -> {
            invocation.<TargetJdbcConnectionAction>getArgument(0).execute(connection);
            return null;
        }).when(lease).withConnection(any());
        when(schema.inspect(eq(connection), eq(MetadataDatabaseKind.MYSQL), any()))
                .thenReturn(TargetInspection.EMPTY);
    }

    @AfterEach
    void cleanUp() {
        Thread.interrupted();
        password.close();
    }

    @Test
    void borrowsOneFactoryAndOneDeadlineWithoutConsumingTheCallerSecret() {
        JdbcMetadataMigrationDeadline deadline = deadline();

        assertThat(inspector.inspect(SETTINGS, password, deadline)).isEqualTo(TargetInspection.EMPTY);

        verify(factory).acquire(SETTINGS, password, deadline);
        verify(schema).inspect(connection, MetadataDatabaseKind.MYSQL, deadline);
        verify(lease).close();
        assertThat(password.copy()).containsExactly("borrowed-password".toCharArray());
        verify(factory, never()).close();
    }

    @Test
    void leaseCloseFailureRetainsExactLeaseUntilRetryWithoutReinspection() {
        doThrow(new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED))
                .doNothing().when(lease).close();

        assertThat(inspector.inspect(SETTINGS, password, deadline())).isEqualTo(TargetInspection.UNKNOWN);
        assertThat(inspector.inspect(SETTINGS, password, deadline())).isEqualTo(TargetInspection.UNKNOWN);
        inspector.retryCleanup(deadline());

        verify(factory, times(1)).acquire(eq(SETTINGS), eq(password), any());
        verify(schema, times(1)).inspect(eq(connection), eq(MetadataDatabaseKind.MYSQL), any());
        verify(lease, times(2)).close();
    }

    @Test
    void timedOutAcquireRetainsSettlementButOperationConflictTakesNoOwnership() {
        when(factory.acquire(eq(SETTINGS), eq(password), any()))
                .thenThrow(new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.TIMEOUT));
        when(factory.settleFailedAcquire(any())).thenReturn(TargetJdbcFailedAcquireSettlement.REUSABLE);

        assertThat(inspector.inspect(SETTINGS, password, deadline())).isEqualTo(TargetInspection.UNKNOWN);
        inspector.retryCleanup(deadline());
        verify(factory).settleFailedAcquire(any());

        when(factory.acquire(eq(SETTINGS), eq(password), any()))
                .thenThrow(new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.OPERATION_CONFLICT));
        assertThat(inspector.inspect(SETTINGS, password, deadline())).isEqualTo(TargetInspection.UNKNOWN);
        inspector.retryCleanup(deadline());
        verify(factory, times(1)).settleFailedAcquire(any());
    }

    @Test
    void firstInspectionErrorSurvivesUncertainCloseAndExactRetry() {
        AssertionError fatal = new AssertionError("private fatal");
        when(schema.inspect(eq(connection), eq(MetadataDatabaseKind.MYSQL), any())).thenThrow(fatal);
        doThrow(new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED))
                .doNothing().when(lease).close();

        assertThatThrownBy(() -> inspector.inspect(SETTINGS, password, deadline())).isSameAs(fatal);
        assertThatThrownBy(() -> inspector.retryCleanup(deadline())).isSameAs(fatal);

        verify(factory, times(1)).acquire(eq(SETTINGS), eq(password), any());
        verify(schema, times(1)).inspect(eq(connection), eq(MetadataDatabaseKind.MYSQL), any());
        verify(lease, times(2)).close();
    }

    @Test
    void interruptedAcquireRemainsUnknownAndPreservesTheInterrupt() {
        Thread.currentThread().interrupt();
        when(factory.acquire(eq(SETTINGS), eq(password), any()))
                .thenThrow(new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.TIMEOUT));

        assertThat(inspector.inspect(SETTINGS, password, deadline())).isEqualTo(TargetInspection.UNKNOWN);
        assertThat(Thread.currentThread().isInterrupted()).isTrue();
        assertThat(password.copy()).containsExactly("borrowed-password".toCharArray());
    }

    @Test
    void lifecycleStateCannotRetainCredentialsOrTargetSettings() {
        assertThat(MetadataMigrationTargetInspector.class.getDeclaredFields())
                .extracting(Field::getType)
                .doesNotContain(SecretValue.class)
                .doesNotContain(MetadataDatabaseSettings.class);
        assertThat(inspector.toString())
                .doesNotContain("borrowed-password", "jdbc:mysql", "operator");
    }

    @Test
    void shutdownRetriesExactPendingLeaseWithoutClosingBorrowedFactoryOrAllowingNewInspection() {
        doThrow(new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED))
                .doThrow(new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED))
                .doNothing().when(lease).close();

        assertThat(inspector.inspect(SETTINGS, password, deadline())).isEqualTo(TargetInspection.UNKNOWN);
        assertThatThrownBy(() -> inspector.shutdown(deadline()))
                .isInstanceOf(TargetJdbcConnectionException.class);
        assertThat(inspector.inspect(SETTINGS, password, deadline())).isEqualTo(TargetInspection.UNKNOWN);
        inspector.shutdown(deadline());

        verify(factory, times(1)).acquire(eq(SETTINGS), eq(password), any());
        verify(factory, never()).close();
        verify(lease, times(3)).close();
    }

    @Test
    void acquisitionFatalIsReplayedOnceAfterReusableSettlementThenHealthyInspectionCanRun() {
        AssertionError fatal = new AssertionError("private acquisition fatal");
        when(factory.acquire(eq(SETTINGS), eq(password), any()))
                .thenThrow(fatal)
                .thenThrow(new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.TIMEOUT))
                .thenReturn(lease);
        when(factory.settleFailedAcquire(any()))
                .thenReturn(TargetJdbcFailedAcquireSettlement.REUSABLE)
                .thenReturn(TargetJdbcFailedAcquireSettlement.REUSABLE);

        assertThatThrownBy(() -> inspector.inspect(SETTINGS, password, deadline())).isSameAs(fatal);
        assertThatThrownBy(() -> inspector.retryCleanup(deadline())).isSameAs(fatal);
        assertThat(inspector.inspect(SETTINGS, password, deadline())).isEqualTo(TargetInspection.UNKNOWN);
        inspector.retryCleanup(deadline());
        assertThat(inspector.inspect(SETTINGS, password, deadline())).isEqualTo(TargetInspection.EMPTY);
        inspector.shutdown(deadline());

        verify(factory, times(3)).acquire(eq(SETTINGS), eq(password), any());
        verify(factory, times(2)).settleFailedAcquire(any());
    }

    @Test
    void shutdownRetriesFailedAcquireSettlementWithoutClosingBorrowedFactory() {
        when(factory.acquire(eq(SETTINGS), eq(password), any()))
                .thenThrow(new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.TIMEOUT));
        when(factory.settleFailedAcquire(any()))
                .thenThrow(new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED))
                .thenReturn(TargetJdbcFailedAcquireSettlement.REUSABLE);

        assertThat(inspector.inspect(SETTINGS, password, deadline())).isEqualTo(TargetInspection.UNKNOWN);
        assertThatThrownBy(() -> inspector.shutdown(deadline()))
                .isInstanceOf(TargetJdbcConnectionException.class);
        inspector.shutdown(deadline());

        verify(factory, times(2)).settleFailedAcquire(any());
        verify(factory, never()).close();
    }

    private static JdbcMetadataMigrationDeadline deadline() {
        return JdbcMetadataMigrationDeadline.start(Duration.ofSeconds(5), System::nanoTime);
    }
}
