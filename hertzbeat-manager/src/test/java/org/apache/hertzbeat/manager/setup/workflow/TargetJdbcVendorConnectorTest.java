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
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.mysql.cj.jdbc.MysqlDataSource;
import java.sql.Connection;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.atomic.AtomicLong;
import javax.sql.DataSource;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.junit.jupiter.api.Test;
import org.postgresql.ds.PGSimpleDataSource;

class TargetJdbcVendorConnectorTest {

    @Test
    void providerThatConsumesTheRootBudgetCannotSendCredentials() throws Exception {
        DataSource dataSource = mock(DataSource.class);
        AtomicLong ticker = new AtomicLong();
        TargetJdbcVendorConnector connector = new TargetJdbcVendorConnector(settings -> {
            ticker.set(21L);
            return dataSource;
        });
        JdbcMetadataMigrationDeadline deadline = JdbcMetadataMigrationDeadline.start(
                Duration.ofNanos(20), ticker::get);

        assertThatThrownBy(() -> connector.connect(
                TargetJdbcUrl.parse(MetadataDatabaseKind.MYSQL, "jdbc:mysql://db.example/hertzbeat"),
                "operator", "secret".toCharArray(), deadline))
                .isInstanceOfSatisfying(TargetJdbcConnectionException.class, failure -> {
                    assertThat(failure.code()).isEqualTo(TargetJdbcConnectionErrorCode.TIMEOUT);
                    assertThat(failure).hasNoCause();
                });
        verify(dataSource, times(0)).getConnection("operator", "secret");
    }

    @Test
    void mysqlUsesExactUrlMillisecondTimeoutsAndEphemeralConnectionCredential() throws Exception {
        DataSource dataSource = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        when(dataSource.getConnection("operator", "secret")).thenReturn(connection);
        AtomicReference<TargetJdbcDataSourceSettings> captured = new AtomicReference<>();
        TargetJdbcVendorConnector connector = new TargetJdbcVendorConnector(settings -> {
            captured.set(settings);
            return dataSource;
        });
        String originalUrl = "jdbc:mysql://DB.Example/hertzbeat?sslMode=VERIFY_IDENTITY";
        TargetJdbcUrl target = TargetJdbcUrl.parse(MetadataDatabaseKind.MYSQL, originalUrl);

        Connection actual = connector.connect(
                target, "operator", "secret".toCharArray(), deadline(1501));

        assertThat(actual).isSameAs(connection);
        assertThat(captured.get().kind()).isEqualTo(MetadataDatabaseKind.MYSQL);
        assertThat(captured.get().jdbcUrl()).isEqualTo(originalUrl);
        assertThat(captured.get().remaining()).isEqualTo(Duration.ofMillis(1501));
        verify(dataSource).getConnection("operator", "secret");
    }

    @Test
    void postgresUsesPositiveCeilingSecondsForConnectSocketAndCancel() throws Exception {
        DataSource dataSource = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        when(dataSource.getConnection("operator", "secret")).thenReturn(connection);
        AtomicReference<TargetJdbcDataSourceSettings> captured = new AtomicReference<>();
        TargetJdbcVendorConnector connector = new TargetJdbcVendorConnector(settings -> {
            captured.set(settings);
            return dataSource;
        });
        String originalUrl = "jdbc:postgresql://db.example/hertzbeat?sslmode=require";
        TargetJdbcUrl target = TargetJdbcUrl.parse(MetadataDatabaseKind.POSTGRESQL, originalUrl);

        assertThat(connector.connect(
                target, "operator", "secret".toCharArray(), deadline(1501)))
                .isSameAs(connection);

        assertThat(captured.get().remaining()).isEqualTo(Duration.ofMillis(1501));
    }

    @Test
    void subMillisecondBudgetNeverConfiguresAnInfiniteTimeout() throws Exception {
        DataSource dataSource = mock(DataSource.class);
        when(dataSource.getConnection("operator", "secret")).thenReturn(mock(Connection.class));
        AtomicReference<TargetJdbcDataSourceSettings> captured = new AtomicReference<>();
        TargetJdbcVendorConnector connector = new TargetJdbcVendorConnector(settings -> {
            captured.set(settings);
            return dataSource;
        });

        connector.connect(
                TargetJdbcUrl.parse(MetadataDatabaseKind.POSTGRESQL,
                        "jdbc:postgresql://db.example/hertzbeat"),
                "operator", "secret".toCharArray(), deadlineNanos(1));

        assertThat(captured.get().remaining()).isEqualTo(Duration.ofNanos(1));
    }

    @Test
    void realVendorDataSourcesOverrideUrlTimeoutsWithoutRetainingCredentials() throws Exception {
        MysqlDataSource mysql = (MysqlDataSource) TargetJdbcVendorConnector.createDataSource(
                new TargetJdbcDataSourceSettings(MetadataDatabaseKind.MYSQL,
                        "jdbc:mysql://db.example/hertzbeat?connectTimeout=999999&socketTimeout=999999",
                        Duration.ofMillis(1501)));
        PGSimpleDataSource postgres = (PGSimpleDataSource) TargetJdbcVendorConnector.createDataSource(
                new TargetJdbcDataSourceSettings(MetadataDatabaseKind.POSTGRESQL,
                        "jdbc:postgresql://db.example/hertzbeat?connectTimeout=999999&socketTimeout=999999"
                                + "&cancelSignalTimeout=999999",
                        Duration.ofMillis(1501)));

        assertThat(mysql.getConnectTimeout()).isEqualTo(1501);
        assertThat(mysql.getSocketTimeout()).isEqualTo(1501);
        assertThat(mysql.getUser()).isNull();
        assertThat(mysql.getPassword()).isNull();
        assertThat(postgres.getConnectTimeout()).isEqualTo(2);
        assertThat(postgres.getSocketTimeout()).isEqualTo(2);
        assertThat(postgres.getCancelSignalTimeout()).isEqualTo(2);
        assertThat(postgres.getUser()).isNull();
        assertThat(postgres.getPassword()).isNull();
    }

    private static JdbcMetadataMigrationDeadline deadline(long millis) {
        return JdbcMetadataMigrationDeadline.start(Duration.ofMillis(millis), () -> 0L);
    }

    private static JdbcMetadataMigrationDeadline deadlineNanos(long nanos) {
        return JdbcMetadataMigrationDeadline.start(Duration.ofNanos(nanos), () -> 0L);
    }
}
