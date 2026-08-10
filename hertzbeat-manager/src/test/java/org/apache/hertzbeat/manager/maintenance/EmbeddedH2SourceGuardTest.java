/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mockito;
import org.springframework.boot.jdbc.autoconfigure.DataSourceProperties;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

@Timeout(15)
class EmbeddedH2SourceGuardTest {

    @Test
    void holdsSafeSourceConnectionUntilLeaseClosesExactlyOnce() throws Exception {
        DataSource dataSource = Mockito.mock(DataSource.class);
        Connection connection = Mockito.mock(Connection.class);
        DatabaseMetaData metadata = Mockito.mock(DatabaseMetaData.class);
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.getMetaData()).thenReturn(metadata);
        when(metadata.getDatabaseProductName()).thenReturn("H2");
        when(metadata.getURL()).thenReturn("jdbc:h2:mem:manager");
        EmbeddedH2SourceGuard guard = guard(dataSource, "jdbc:h2:mem:manager");

        MigrationSourceLease lease = guard.fence("operation-a", Duration.ofSeconds(1));

        verify(connection, never()).close();
        lease.close();
        lease.close();
        verify(connection).close();
        guard.destroy();
    }

    @Test
    void scopesTheExactGuardedConnectionAndRejectsUseAfterClose() throws Exception {
        DataSource dataSource = Mockito.mock(DataSource.class);
        Connection connection = Mockito.mock(Connection.class);
        DatabaseMetaData metadata = Mockito.mock(DatabaseMetaData.class);
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.getMetaData()).thenReturn(metadata);
        when(metadata.getDatabaseProductName()).thenReturn("H2");
        when(metadata.getURL()).thenReturn("jdbc:h2:mem:manager");
        EmbeddedH2SourceGuard guard = guard(dataSource, "jdbc:h2:mem:manager");
        MigrationSourceLease lease = guard.fence("operation-a", Duration.ofSeconds(1));
        AtomicReference<Connection> observed = new AtomicReference<>();

        lease.withConnection(observed::set);
        assertThat(observed.get()).isSameAs(connection);
        lease.close();
        assertThatThrownBy(() -> lease.withConnection(ignored -> { }))
                .isInstanceOfSatisfying(MigrationMaintenanceException.class, failure ->
                        assertThat(failure.code())
                                .isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_OPERATION_CONFLICT));
        guard.destroy();
    }

    @Test
    void sourceCloseCannotOverlapAnActiveScopedCallback() throws Exception {
        DataSource dataSource = Mockito.mock(DataSource.class);
        Connection connection = Mockito.mock(Connection.class);
        DatabaseMetaData metadata = Mockito.mock(DatabaseMetaData.class);
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.getMetaData()).thenReturn(metadata);
        when(metadata.getDatabaseProductName()).thenReturn("H2");
        when(metadata.getURL()).thenReturn("jdbc:h2:mem:manager");
        EmbeddedH2SourceGuard guard = guard(dataSource, "jdbc:h2:mem:manager");
        MigrationSourceLease lease = guard.fence("operation-a", Duration.ofSeconds(1));
        CountDownLatch callbackEntered = new CountDownLatch(1);
        CountDownLatch releaseCallback = new CountDownLatch(1);
        CountDownLatch closeReturned = new CountDownLatch(1);
        Thread callback = Thread.ofPlatform().start(() -> lease.withConnection(ignored -> {
            callbackEntered.countDown();
            awaitIgnoringInterrupt(releaseCallback);
        }));
        Thread closer = null;

        try {
            assertThat(callbackEntered.await(5, TimeUnit.SECONDS)).isTrue();
            closer = Thread.ofPlatform().start(() -> {
                lease.close();
                closeReturned.countDown();
            });
            assertThat(closeReturned.await(1, TimeUnit.SECONDS)).isFalse();
        } finally {
            releaseCallback.countDown();
        }
        callback.join(5_000);
        if (closer != null) {
            closer.join(5_000);
        }
        assertThat(closeReturned.getCount()).isZero();
        verify(connection).close();
        guard.destroy();
    }

    @Test
    void sourceCloseFromItsOwnScopedCallbackFailsFast() throws Exception {
        DataSource dataSource = Mockito.mock(DataSource.class);
        Connection connection = Mockito.mock(Connection.class);
        DatabaseMetaData metadata = Mockito.mock(DatabaseMetaData.class);
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.getMetaData()).thenReturn(metadata);
        when(metadata.getDatabaseProductName()).thenReturn("H2");
        when(metadata.getURL()).thenReturn("jdbc:h2:mem:manager");
        EmbeddedH2SourceGuard guard = guard(dataSource, "jdbc:h2:mem:manager");
        MigrationSourceLease lease = guard.fence("operation-a", Duration.ofSeconds(1));

        try {
            lease.withConnection(ignored -> assertThatThrownBy(lease::close)
                    .isInstanceOfSatisfying(MigrationMaintenanceException.class, failure ->
                            assertThat(failure.code())
                                    .isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_OPERATION_CONFLICT)));
            verify(connection, never()).close();
        } finally {
            lease.close();
            guard.destroy();
        }
        verify(connection).close();
    }

    @Test
    void rejectsAmbiguousSourceAndClosesConnectionWithoutDetails() throws Exception {
        DataSource dataSource = Mockito.mock(DataSource.class);
        Connection connection = Mockito.mock(Connection.class);
        DatabaseMetaData metadata = Mockito.mock(DatabaseMetaData.class);
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.getMetaData()).thenReturn(metadata);
        when(metadata.getDatabaseProductName()).thenReturn("H2");
        when(metadata.getURL()).thenReturn("jdbc:h2:tcp://private-host/secret");
        EmbeddedH2SourceGuard guard = guard(dataSource, "jdbc:h2:mem:manager");

        assertThatThrownBy(() -> guard.fence("operation-a", Duration.ofSeconds(1)))
                .isInstanceOfSatisfying(MigrationMaintenanceException.class, exception -> {
                    assertThat(exception.code())
                            .isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_SOURCE_UNAVAILABLE);
                    assertThat(exception.safeMessage()).doesNotContain("private-host").doesNotContain("secret");
                    assertThat(exception.getCause()).isNull();
                });
        verify(connection).close();
        guard.destroy();
    }

    @Test
    void rejectsRawAutoServerAndFileLockSettingsThatMetadataRemoves(@TempDir Path directory) throws Exception {
        String baseUrl = "jdbc:h2:file:" + directory.resolve("manager");
        EmbeddedH2SourceGuard safeGuard = guard(new DriverManagerDataSource(baseUrl), baseUrl);
        safeGuard.fence("safe-source", Duration.ofSeconds(1)).close();
        safeGuard.destroy();
        for (String setting : new String[] {";AUTO_SERVER=TRUE", ";FILE_LOCK=NO"}) {
            String configuredUrl = baseUrl + setting;
            try (Connection connection = DriverManager.getConnection(configuredUrl)) {
                assertThat(connection.getMetaData().getURL()).doesNotContain(setting.substring(1));
            }
            DriverManagerDataSource dataSource = new DriverManagerDataSource(configuredUrl);
            assertThatThrownBy(() -> guard(dataSource, configuredUrl)
                    .fence("operation-a", Duration.ofSeconds(1)))
                    .isInstanceOfSatisfying(MigrationMaintenanceException.class, exception ->
                            assertThat(exception.code())
                                    .isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_SOURCE_UNAVAILABLE));
        }
    }

    @Test
    void timeoutAbandonsBlockingConnectionAndClosesLateResult() throws Exception {
        assertTimedOutConnectionClosed(Duration.ZERO);
        assertTimedOutConnectionClosed(Duration.ofMillis(20));
    }

    @Test
    void rejectsOverflowDurationWithoutStartingConnectionWork() throws Exception {
        DataSource dataSource = Mockito.mock(DataSource.class);
        EmbeddedH2SourceGuard guard = guard(dataSource, "jdbc:h2:mem:manager");

        assertThatThrownBy(() -> guard.fence("operation-a", Duration.ofSeconds(Long.MAX_VALUE)))
                .isInstanceOfSatisfying(MigrationMaintenanceException.class, exception ->
                        assertThat(exception.code()).isEqualTo(MigrationMaintenanceErrorCode.INVALID_REQUEST));
        verify(dataSource, never()).getConnection();
        guard.destroy();
    }

    @Test
    void destroyRejectsNewAcquisitionWithoutStartingConnectionWork() throws Exception {
        DataSource dataSource = Mockito.mock(DataSource.class);
        EmbeddedH2SourceGuard guard = guard(dataSource, "jdbc:h2:mem:manager");
        guard.destroy();

        assertThatThrownBy(() -> guard.fence("operation-a", Duration.ofSeconds(1)))
                .isInstanceOfSatisfying(MigrationMaintenanceException.class, exception ->
                        assertThat(exception.code()).isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_SOURCE_UNAVAILABLE));
        verify(dataSource, never()).getConnection();
    }

    private void assertTimedOutConnectionClosed(Duration timeout) throws Exception {
        DataSource dataSource = Mockito.mock(DataSource.class);
        Connection connection = Mockito.mock(Connection.class);
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch closed = new CountDownLatch(1);
        when(dataSource.getConnection()).thenAnswer(invocation -> {
            entered.countDown();
            release.await();
            return connection;
        });
        Mockito.doAnswer(invocation -> {
            closed.countDown();
            return null;
        }).when(connection).close();
        EmbeddedH2SourceGuard guard = guard(dataSource, "jdbc:h2:mem:manager");

        assertThatThrownBy(() -> guard.fence("operation-a", timeout))
                .isInstanceOfSatisfying(MigrationMaintenanceException.class, exception ->
                        assertThat(exception.code())
                                .isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_MAINTENANCE_TIMEOUT));
        assertThat(entered.await(1, TimeUnit.SECONDS)).isTrue();
        release.countDown();
        assertThat(closed.await(1, TimeUnit.SECONDS)).isTrue();
        guard.destroy();
    }

    @Test
    void interruptAbandonsBlockingConnectionAndPreservesInterrupt() throws Exception {
        DataSource dataSource = Mockito.mock(DataSource.class);
        Connection connection = Mockito.mock(Connection.class);
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch closed = new CountDownLatch(1);
        when(dataSource.getConnection()).thenAnswer(invocation -> {
            entered.countDown();
            release.await();
            return connection;
        });
        Mockito.doAnswer(invocation -> {
            closed.countDown();
            return null;
        }).when(connection).close();
        AtomicReference<MigrationMaintenanceErrorCode> code = new AtomicReference<>();
        AtomicBoolean interrupted = new AtomicBoolean();
        EmbeddedH2SourceGuard guard = guard(dataSource, "jdbc:h2:mem:manager");
        Thread caller = Thread.ofPlatform().start(() -> {
            try {
                guard.fence("operation-a", Duration.ofSeconds(30));
            } catch (MigrationMaintenanceException exception) {
                code.set(exception.code());
                interrupted.set(Thread.currentThread().isInterrupted());
            }
        });
        assertThat(entered.await(1, TimeUnit.SECONDS)).isTrue();

        caller.interrupt();
        caller.join(1_000);
        assertThat(code.get()).isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_MAINTENANCE_INTERRUPTED);
        assertThat(interrupted).isTrue();
        release.countDown();
        assertThat(closed.await(1, TimeUnit.SECONDS)).isTrue();
        guard.destroy();
    }

    @Test
    void oneStuckDriverCallBoundsAllLaterAcquisitionWork() throws Exception {
        DataSource dataSource = Mockito.mock(DataSource.class);
        Connection connection = Mockito.mock(Connection.class);
        AtomicInteger calls = new AtomicInteger();
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch closed = new CountDownLatch(1);
        when(dataSource.getConnection()).thenAnswer(invocation -> {
            calls.incrementAndGet();
            entered.countDown();
            release.await();
            return connection;
        });
        Mockito.doAnswer(invocation -> {
            closed.countDown();
            return null;
        }).when(connection).close();
        EmbeddedH2SourceGuard guard = guard(dataSource, "jdbc:h2:mem:manager");

        assertThatThrownBy(() -> guard.fence("operation-a", Duration.ZERO))
                .isInstanceOf(MigrationMaintenanceException.class);
        assertThat(entered.await(1, TimeUnit.SECONDS)).isTrue();
        for (int index = 0; index < 20; index++) {
            assertThatThrownBy(() -> guard.fence("operation-a", Duration.ZERO))
                    .isInstanceOfSatisfying(MigrationMaintenanceException.class, exception ->
                            assertThat(exception.code())
                                    .isEqualTo(MigrationMaintenanceErrorCode.MIGRATION_MAINTENANCE_TIMEOUT));
        }
        assertThat(calls).hasValue(1);
        release.countDown();
        assertThat(closed.await(1, TimeUnit.SECONDS)).isTrue();
        guard.destroy();
    }

    private static EmbeddedH2SourceGuard guard(DataSource dataSource, String configuredUrl) {
        DataSourceProperties properties = new DataSourceProperties();
        properties.setUrl(configuredUrl);
        return new EmbeddedH2SourceGuard(dataSource, properties);
    }

    private static void awaitIgnoringInterrupt(CountDownLatch latch) {
        boolean interrupted = false;
        while (latch.getCount() > 0) {
            try {
                latch.await();
            } catch (InterruptedException ignored) {
                interrupted = true;
            }
        }
        if (interrupted) {
            Thread.currentThread().interrupt();
        }
    }
}
