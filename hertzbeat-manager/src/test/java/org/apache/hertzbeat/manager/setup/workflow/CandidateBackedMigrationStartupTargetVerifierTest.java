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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.lang.reflect.Field;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;
import java.time.Duration;
import java.util.Optional;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.config.GreptimeEndpoints;
import org.apache.hertzbeat.manager.setup.config.GreptimeSettings;
import org.apache.hertzbeat.manager.setup.config.ManagedApplicationConfig;
import org.apache.hertzbeat.manager.setup.config.ManagedConfigurationBundle;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.CandidateReader;
import org.apache.hertzbeat.manager.setup.config.ManagedMigrationConfigurationTransaction.CandidateRef;
import org.apache.hertzbeat.manager.setup.config.ManagedSecrets;
import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;
import org.apache.hertzbeat.manager.setup.installation.InstallationFingerprint;
import org.apache.hertzbeat.manager.setup.installation.LocalInstallationFingerprintStore;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class CandidateBackedMigrationStartupTargetVerifierTest {

    private static final CandidateRef CANDIDATE = new CandidateRef("operation-a", "candidate-generation");
    private static final String IDENTITY = "a".repeat(64);
    private static final InstallationFingerprint FINGERPRINT =
            new InstallationFingerprint("b".repeat(64));
    private static final MetadataDatabaseSettings SETTINGS = new MetadataDatabaseSettings(
            MetadataDatabaseKind.POSTGRESQL,
            "jdbc:postgresql://db.example/hertzbeat", "hertzbeat");

    private ManagedMigrationConfigurationTransaction configuration;
    private LocalInstallationFingerprintStore fingerprints;
    private TargetJdbcConnectionFactory factory;
    private TargetJdbcConnectionLease lease;
    private MigrationStartupTargetInspector inspector;
    private Connection connection;
    private SecretValue borrowedPassword;
    private ManagedConfigurationBundle bundle;

    @BeforeEach
    void setUp() throws Exception {
        configuration = mock(ManagedMigrationConfigurationTransaction.class);
        fingerprints = mock(LocalInstallationFingerprintStore.class);
        factory = mock(TargetJdbcConnectionFactory.class);
        lease = mock(TargetJdbcConnectionLease.class);
        inspector = mock(MigrationStartupTargetInspector.class);
        connection = mock(Connection.class);
        borrowedPassword = SecretValue.of("borrowed-password");
        bundle = new ManagedConfigurationBundle(
                new ManagedApplicationConfig(
                        SETTINGS,
                        GreptimeSettings.anonymous(
                                new GreptimeEndpoints("greptime:4001", "http://greptime:4000"), "public")),
                ManagedSecrets.withoutTelemetryPassword(borrowedPassword));
        when(fingerprints.read()).thenReturn(Optional.of(FINGERPRINT));
        when(configuration.readExactActive(eq(CANDIDATE), eq(IDENTITY), any()))
                .thenAnswer(invocation -> invocation.<CandidateReader<?>>getArgument(2).read(bundle));
        when(factory.acquire(eq(SETTINGS), eq(borrowedPassword), any())).thenReturn(lease);
        when(lease.targetIdentityHash()).thenReturn(IDENTITY);
        doAnswer(invocation -> {
            invocation.<TargetJdbcConnectionAction>getArgument(0).execute(connection);
            return null;
        }).when(lease).withConnection(any());
        when(inspector.inspect(eq(connection), eq(MetadataDatabaseKind.POSTGRESQL),
                eq(FINGERPRINT), any())).thenReturn(MigrationStartupTargetVerification.CONFIRMED);
    }

    @Test
    void borrowsExactCandidateSecretAndUsesOneRootDeadline() throws Exception {
        CandidateBackedMigrationStartupTargetVerifier verifier = verifier();

        assertThat(verifier.verify(CANDIDATE, IDENTITY))
                .isEqualTo(MigrationStartupTargetVerification.CONFIRMED);

        ArgumentCaptor<JdbcMetadataMigrationDeadline> acquisitionDeadline =
                ArgumentCaptor.forClass(JdbcMetadataMigrationDeadline.class);
        ArgumentCaptor<JdbcMetadataMigrationDeadline> inspectionDeadline =
                ArgumentCaptor.forClass(JdbcMetadataMigrationDeadline.class);
        verify(factory).acquire(eq(SETTINGS), eq(borrowedPassword), acquisitionDeadline.capture());
        verify(inspector).inspect(eq(connection), eq(MetadataDatabaseKind.POSTGRESQL),
                eq(FINGERPRINT), inspectionDeadline.capture());
        assertThat(inspectionDeadline.getValue()).isSameAs(acquisitionDeadline.getValue());
        assertThat(borrowedPassword.copy()).containsExactly("borrowed-password".toCharArray());
        verify(lease).close();
    }

    @Test
    void verifiedLeaseIdentityMismatchIsDeterministicAndSkipsSchemaRead() throws Exception {
        when(lease.targetIdentityHash()).thenReturn("c".repeat(64));

        assertThat(verifier().verify(CANDIDATE, IDENTITY))
                .isEqualTo(MigrationStartupTargetVerification.DETERMINISTIC_MISMATCH);

        verify(inspector, never()).inspect(any(), any(), any(), any());
        verify(lease).close();
    }

    @Test
    void targetAcquireTimeoutIsTransientAndDoesNotConsumeBorrowedSecret() throws Exception {
        when(factory.acquire(eq(SETTINGS), eq(borrowedPassword), any()))
                .thenThrow(new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.TIMEOUT));

        assertThat(verifier().verify(CANDIDATE, IDENTITY))
                .isEqualTo(MigrationStartupTargetVerification.TRANSIENT_UNAVAILABLE);

        assertThat(borrowedPassword.copy()).containsExactly("borrowed-password".toCharArray());
        verify(inspector, never()).inspect(any(), any(), any(), any());
    }

    @Test
    void timeoutRetrySettlesTheExactFactoryAttemptBeforeCandidateIsReadAgain() throws Exception {
        when(factory.acquire(eq(SETTINGS), eq(borrowedPassword), any()))
                .thenThrow(new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.TIMEOUT))
                .thenReturn(lease);
        when(factory.settleFailedAcquire(any())).thenReturn(TargetJdbcFailedAcquireSettlement.REUSABLE);
        CandidateBackedMigrationStartupTargetVerifier verifier = verifier();

        assertThat(verifier.verify(CANDIDATE, IDENTITY))
                .isEqualTo(MigrationStartupTargetVerification.TRANSIENT_UNAVAILABLE);
        assertThat(verifier.verify(CANDIDATE, IDENTITY))
                .isEqualTo(MigrationStartupTargetVerification.CONFIRMED);

        InOrder retryOrder = inOrder(factory, configuration);
        retryOrder.verify(configuration).readExactActive(eq(CANDIDATE), eq(IDENTITY), any());
        retryOrder.verify(factory).settleFailedAcquire(any());
        retryOrder.verify(configuration).readExactActive(eq(CANDIDATE), eq(IDENTITY), any());
        verify(factory, times(2)).acquire(eq(SETTINGS), eq(borrowedPassword), any());
    }

    @Test
    void timeoutRetainsOperationOwnershipAndCloseDelegatesLateCleanupToFactory() throws Exception {
        when(factory.acquire(eq(SETTINGS), eq(borrowedPassword), any()))
                .thenThrow(new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.TIMEOUT));
        CandidateBackedMigrationStartupTargetVerifier verifier = verifier();
        assertThat(verifier.verify(CANDIDATE, IDENTITY))
                .isEqualTo(MigrationStartupTargetVerification.TRANSIENT_UNAVAILABLE);

        assertThatThrownBy(() -> verifier.verify(
                new CandidateRef("operation-b", "candidate-generation"), "c".repeat(64)))
                .isInstanceOfSatisfying(MigrationStartupReconciliationException.class, failure ->
                        assertThat(failure.errorCode()).isEqualTo(SetupErrorCode.OPERATION_CONFLICT));
        verifier.close();

        verify(factory).close();
        verify(factory, never()).settleFailedAcquire(any());
    }

    @Test
    void leaseCloseFailureRetainsExactOutcomeAndRetryDoesNotReacquire() throws Exception {
        doThrow(new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED))
                .doNothing().when(lease).close();
        CandidateBackedMigrationStartupTargetVerifier verifier = verifier();

        assertThatThrownBy(() -> verifier.verify(CANDIDATE, IDENTITY))
                .isInstanceOfSatisfying(MigrationStartupReconciliationException.class, failure ->
                        assertThat(failure.errorCode())
                                .isEqualTo(SetupErrorCode.CONFIG_RECOVERY_REQUIRED));
        assertThat(verifier.verify(CANDIDATE, IDENTITY))
                .isEqualTo(MigrationStartupTargetVerification.CONFIRMED);

        verify(configuration, times(1)).readExactActive(eq(CANDIDATE), eq(IDENTITY), any());
        verify(factory, times(1)).acquire(eq(SETTINGS), eq(borrowedPassword), any());
        verify(lease, times(2)).close();
    }

    @Test
    void pendingLeasePrivateCloseFailureIsCauseFreeAndRetainsExactOutcome() throws Exception {
        doThrow(new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED))
                .doThrow(new IllegalStateException("private close detail"))
                .doNothing().when(lease).close();
        CandidateBackedMigrationStartupTargetVerifier verifier = verifier();

        assertThatThrownBy(() -> verifier.verify(CANDIDATE, IDENTITY))
                .isInstanceOf(MigrationStartupReconciliationException.class);
        assertThatThrownBy(() -> verifier.verify(CANDIDATE, IDENTITY))
                .isInstanceOfSatisfying(MigrationStartupReconciliationException.class, failure ->
                        assertThat(failure.errorCode())
                                .isEqualTo(SetupErrorCode.CONFIG_RECOVERY_REQUIRED))
                .hasNoCause()
                .hasMessageNotContaining("private")
                .hasMessageNotContaining("close detail");
        assertThat(verifier.verify(CANDIDATE, IDENTITY))
                .isEqualTo(MigrationStartupTargetVerification.CONFIRMED);

        verify(configuration, times(1)).readExactActive(eq(CANDIDATE), eq(IDENTITY), any());
        verify(factory, times(1)).acquire(eq(SETTINGS), eq(borrowedPassword), any());
        verify(lease, times(3)).close();
    }

    @Test
    void settlementDeadlineRemainsTransientAndRetainsExactAcquireOwnership() throws Exception {
        when(factory.acquire(eq(SETTINGS), eq(borrowedPassword), any()))
                .thenThrow(new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.TIMEOUT));
        when(factory.settleFailedAcquire(any()))
                .thenThrow(new MetadataMigrationException(MetadataMigrationErrorCode.TIMEOUT))
                .thenReturn(TargetJdbcFailedAcquireSettlement.REUSABLE);
        CandidateBackedMigrationStartupTargetVerifier verifier = verifier();

        assertThat(verifier.verify(CANDIDATE, IDENTITY))
                .isEqualTo(MigrationStartupTargetVerification.TRANSIENT_UNAVAILABLE);
        assertThat(verifier.verify(CANDIDATE, IDENTITY))
                .isEqualTo(MigrationStartupTargetVerification.TRANSIENT_UNAVAILABLE);
        assertThat(verifier.verify(CANDIDATE, IDENTITY))
                .isEqualTo(MigrationStartupTargetVerification.TRANSIENT_UNAVAILABLE);

        verify(factory, times(2)).settleFailedAcquire(any());
        verify(configuration, times(2)).readExactActive(eq(CANDIDATE), eq(IDENTITY), any());
    }

    @Test
    void privateFingerprintFailureIsCauseFreeRecoveryBeforeCandidateRead() throws Exception {
        when(fingerprints.read()).thenThrow(new IllegalStateException("private fingerprint path"));

        assertThatThrownBy(() -> verifier().verify(CANDIDATE, IDENTITY))
                .isInstanceOfSatisfying(MigrationStartupReconciliationException.class, failure ->
                        assertThat(failure.errorCode())
                                .isEqualTo(SetupErrorCode.CONFIG_RECOVERY_REQUIRED))
                .hasNoCause()
                .hasMessageNotContaining("private")
                .hasMessageNotContaining("fingerprint path");

        verify(configuration, never()).readExactActive(any(), any(), any());
        verify(factory, never()).acquire(any(), any(), any());
    }

    @Test
    void candidateReadFailuresAreCauseFreeAndNeverAcquireTarget() throws Exception {
        when(configuration.readExactActive(eq(CANDIDATE), eq(IDENTITY), any()))
                .thenThrow(new IOException("private candidate path"))
                .thenThrow(new IllegalStateException("private candidate state"));
        CandidateBackedMigrationStartupTargetVerifier verifier = verifier();

        assertRecoveryWithoutPrivateDetails(
                () -> verifier.verify(CANDIDATE, IDENTITY), "candidate path");
        assertRecoveryWithoutPrivateDetails(
                () -> verifier.verify(CANDIDATE, IDENTITY), "candidate state");

        verify(factory, never()).acquire(any(), any(), any());
    }

    @Test
    void interruptBeforeVerificationIsTransientAndPreservesFlag() throws Exception {
        Thread.currentThread().interrupt();
        try {
            assertThat(verifier().verify(CANDIDATE, IDENTITY))
                    .isEqualTo(MigrationStartupTargetVerification.TRANSIENT_UNAVAILABLE);
            assertThat(Thread.currentThread().isInterrupted()).isTrue();
            verify(fingerprints, never()).read();
            verify(configuration, never()).readExactActive(any(), any(), any());
            verify(factory, never()).acquire(any(), any(), any());
        } finally {
            Thread.interrupted();
        }
    }

    @Test
    void inspectorPrivateRuntimeIsCauseFreeAndStillClosesLease() throws Exception {
        when(inspector.inspect(eq(connection), eq(MetadataDatabaseKind.POSTGRESQL),
                eq(FINGERPRINT), any())).thenThrow(new IllegalStateException("private SQL text"));

        assertRecoveryWithoutPrivateDetails(
                () -> verifier().verify(CANDIDATE, IDENTITY), "private SQL text");

        verify(lease).close();
    }

    @Test
    void firstInspectorFatalRemainsPrimaryAcrossLeaseCloseFailureAndRetry() throws Exception {
        AssertionError inspectorFatal = new AssertionError("inspector fatal");
        when(inspector.inspect(eq(connection), eq(MetadataDatabaseKind.POSTGRESQL),
                eq(FINGERPRINT), any())).thenThrow(inspectorFatal);
        doThrow(new AssertionError("later close fatal")).doNothing().when(lease).close();
        CandidateBackedMigrationStartupTargetVerifier verifier = verifier();

        assertThatThrownBy(() -> verifier.verify(CANDIDATE, IDENTITY)).isSameAs(inspectorFatal);
        assertThatThrownBy(() -> verifier.verify(CANDIDATE, IDENTITY)).isSameAs(inspectorFatal);

        verify(configuration, times(1)).readExactActive(eq(CANDIDATE), eq(IDENTITY), any());
        verify(factory, times(1)).acquire(eq(SETTINGS), eq(borrowedPassword), any());
        verify(lease, times(2)).close();
    }

    @Test
    void inspectorFatalRemainsPrimaryWhenLeaseCloseNeedsRetry() throws Exception {
        AssertionError inspectorFatal = new AssertionError("inspector fatal");
        when(inspector.inspect(eq(connection), eq(MetadataDatabaseKind.POSTGRESQL),
                eq(FINGERPRINT), any())).thenThrow(inspectorFatal);
        doThrow(new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED))
                .doThrow(new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED))
                .doNothing().when(lease).close();
        CandidateBackedMigrationStartupTargetVerifier verifier = verifier();

        assertThatThrownBy(() -> verifier.verify(CANDIDATE, IDENTITY)).isSameAs(inspectorFatal);
        assertThatThrownBy(() -> verifier.verify(CANDIDATE, IDENTITY)).isSameAs(inspectorFatal);
        assertThatThrownBy(() -> verifier.verify(CANDIDATE, IDENTITY)).isSameAs(inspectorFatal);

        verify(configuration, times(1)).readExactActive(eq(CANDIDATE), eq(IDENTITY), any());
        verify(factory, times(1)).acquire(eq(SETTINGS), eq(borrowedPassword), any());
        verify(inspector, times(1)).inspect(any(), any(), any(), any());
        verify(lease, times(3)).close();
    }

    @Test
    void shutdownKeepsInspectorFatalPrimaryUntilExactLeaseCleanupSucceeds() throws Exception {
        AssertionError inspectorFatal = new AssertionError("inspector fatal");
        when(inspector.inspect(eq(connection), eq(MetadataDatabaseKind.POSTGRESQL),
                eq(FINGERPRINT), any())).thenThrow(inspectorFatal);
        doThrow(new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED))
                .doThrow(new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED))
                .doNothing().when(lease).close();
        CandidateBackedMigrationStartupTargetVerifier verifier = verifier();

        assertThatThrownBy(() -> verifier.verify(CANDIDATE, IDENTITY)).isSameAs(inspectorFatal);
        assertThatThrownBy(verifier::close).isSameAs(inspectorFatal);
        assertThatThrownBy(verifier::close).isSameAs(inspectorFatal);

        verify(configuration, times(1)).readExactActive(eq(CANDIDATE), eq(IDENTITY), any());
        verify(factory, times(1)).acquire(eq(SETTINGS), eq(borrowedPassword), any());
        verify(inspector, times(1)).inspect(any(), any(), any(), any());
        verify(lease, times(3)).close();
        verify(factory).close();
    }

    @Test
    void provisionalCleanupFailureRetainsExactOperationUntilFactorySettlement() throws Exception {
        Connection provisional = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        when(provisional.getAutoCommit()).thenReturn(true);
        when(provisional.isReadOnly()).thenReturn(false);
        when(provisional.getMetaData()).thenReturn(metadata);
        when(metadata.getDatabaseProductName()).thenReturn("MySQL");
        when(metadata.getURL()).thenReturn("jdbc:mysql://other.example/hertzbeat");
        when(provisional.getCatalog()).thenReturn("hertzbeat");
        doThrow(new SQLException("private provisional cleanup")).doNothing()
                .when(provisional).close();
        MetadataDatabaseSettings mysql = new MetadataDatabaseSettings(
                MetadataDatabaseKind.MYSQL,
                "jdbc:mysql://db.example/hertzbeat", "operator");
        ManagedConfigurationBundle mysqlBundle = new ManagedConfigurationBundle(
                new ManagedApplicationConfig(
                        mysql,
                        GreptimeSettings.anonymous(
                                new GreptimeEndpoints("greptime:4001", "http://greptime:4000"), "public")),
                ManagedSecrets.withoutTelemetryPassword(borrowedPassword));
        when(configuration.readExactActive(any(CandidateRef.class), anyString(), any()))
                .thenAnswer(invocation -> invocation.<CandidateReader<?>>getArgument(2).read(mysqlBundle));
        TargetJdbcConnector connector = (target, username, password, deadline) -> provisional;
        TargetJdbcConnectionFactory realFactory = new TargetJdbcConnectionFactory(connector, Runnable::run);
        CandidateBackedMigrationStartupTargetVerifier verifier = new CandidateBackedMigrationStartupTargetVerifier(
                configuration, fingerprints, realFactory, inspector,
                Duration.ofSeconds(5), System::nanoTime);

        try {
            assertThatThrownBy(() -> verifier.verify(CANDIDATE, IDENTITY))
                    .isInstanceOf(MigrationStartupReconciliationException.class);
            assertThatThrownBy(() -> verifier.verify(
                    new CandidateRef("operation-b", "candidate-generation"), "c".repeat(64)))
                    .isInstanceOfSatisfying(MigrationStartupReconciliationException.class, failure ->
                            assertThat(failure.errorCode()).isEqualTo(SetupErrorCode.OPERATION_CONFLICT));
            assertThatThrownBy(() -> verifier.verify(CANDIDATE, IDENTITY))
                    .isInstanceOf(MigrationStartupReconciliationException.class);

            verify(configuration, times(1)).readExactActive(any(CandidateRef.class), anyString(), any());
            verify(provisional, times(2)).close();
        } finally {
            verifier.close();
        }
    }

    @Test
    void settlementPrivateRuntimeIsCauseFreeAndKeepsExactAcquirePending() throws Exception {
        when(factory.acquire(eq(SETTINGS), eq(borrowedPassword), any()))
                .thenThrow(new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.TIMEOUT))
                .thenReturn(lease);
        when(factory.settleFailedAcquire(any()))
                .thenThrow(new IllegalStateException("private cleanup state"))
                .thenReturn(TargetJdbcFailedAcquireSettlement.REUSABLE);
        CandidateBackedMigrationStartupTargetVerifier verifier = verifier();

        assertThat(verifier.verify(CANDIDATE, IDENTITY))
                .isEqualTo(MigrationStartupTargetVerification.TRANSIENT_UNAVAILABLE);
        assertRecoveryWithoutPrivateDetails(
                () -> verifier.verify(CANDIDATE, IDENTITY), "private cleanup state");
        assertThat(verifier.verify(CANDIDATE, IDENTITY))
                .isEqualTo(MigrationStartupTargetVerification.CONFIRMED);

        verify(factory, times(2)).settleFailedAcquire(any());
        verify(factory, times(2)).acquire(eq(SETTINGS), eq(borrowedPassword), any());
    }

    @Test
    void shutdownCleanupPrivateRuntimeIsCauseFreeAndRemainsRetryable() throws Exception {
        doThrow(new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.CLEANUP_REQUIRED))
                .doThrow(new IllegalStateException("private shutdown close"))
                .doNothing().when(lease).close();
        CandidateBackedMigrationStartupTargetVerifier verifier = verifier();
        assertThatThrownBy(() -> verifier.verify(CANDIDATE, IDENTITY))
                .isInstanceOf(MigrationStartupReconciliationException.class);

        assertRecoveryWithoutPrivateDetails(verifier::close, "private shutdown close");
        verifier.close();

        verify(lease, times(3)).close();
        verify(factory).close();
    }

    @Test
    void factoryShutdownPrivateRuntimeIsCauseFreeAndVerifierStaysClosed() {
        doThrow(new IllegalStateException("private factory shutdown")).when(factory).close();
        CandidateBackedMigrationStartupTargetVerifier verifier = verifier();

        assertRecoveryWithoutPrivateDetails(verifier::close, "private factory shutdown");
        assertRecoveryWithoutPrivateDetails(
                () -> verifier.verify(CANDIDATE, IDENTITY), "private factory shutdown");

        verify(factory).close();
    }

    @Test
    void verifierAndRetryStateCannotRetainCredentialsOrTargetSettings() {
        assertThat(CandidateBackedMigrationStartupTargetVerifier.class.getDeclaredFields())
                .extracting(Field::getType)
                .doesNotContain(SecretValue.class)
                .doesNotContain(MetadataDatabaseSettings.class);
        assertThat(MigrationStartupTargetVerificationState.class.getDeclaredFields())
                .extracting(Field::getType)
                .doesNotContain(SecretValue.class)
                .doesNotContain(MetadataDatabaseSettings.class);
    }

    private static void assertRecoveryWithoutPrivateDetails(
            ThrowingCallable action, String privateDetail) {
        assertThatThrownBy(action)
                .isInstanceOfSatisfying(MigrationStartupReconciliationException.class, failure ->
                        assertThat(failure.errorCode())
                                .isEqualTo(SetupErrorCode.CONFIG_RECOVERY_REQUIRED))
                .hasNoCause()
                .hasMessageNotContaining(privateDetail);
    }

    private CandidateBackedMigrationStartupTargetVerifier verifier() {
        return new CandidateBackedMigrationStartupTargetVerifier(
                configuration, fingerprints, factory, inspector,
                Duration.ofSeconds(5), () -> 0L);
    }
}
