/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import com.mysql.cj.jdbc.MysqlDataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.Duration;
import java.util.Objects;
import java.util.concurrent.TimeUnit;
import javax.sql.DataSource;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.postgresql.ds.PGSimpleDataSource;

/** Opens target connections through vendor DataSources with a finite network budget. */
final class TargetJdbcVendorConnector implements TargetJdbcConnector {

    private final TargetJdbcDataSourceProvider dataSources;

    TargetJdbcVendorConnector() {
        this(TargetJdbcVendorConnector::createDataSource);
    }

    TargetJdbcVendorConnector(TargetJdbcDataSourceProvider dataSources) {
        this.dataSources = Objects.requireNonNull(dataSources, "dataSources");
    }

    @Override
    public Connection connect(
            TargetJdbcUrl target,
            String username,
            char[] password,
            JdbcMetadataMigrationDeadline deadline) throws SQLException {
        Objects.requireNonNull(target, "target");
        Objects.requireNonNull(username, "username");
        Objects.requireNonNull(password, "password");
        Duration remaining = remaining(deadline);
        TargetJdbcDataSourceSettings settings = new TargetJdbcDataSourceSettings(
                target.kind(), target.connectionUrl(), remaining);
        DataSource dataSource = dataSources.create(settings);
        remaining(deadline);
        String ephemeralPassword = new String(password);
        return dataSource.getConnection(username, ephemeralPassword);
    }

    private static Duration remaining(JdbcMetadataMigrationDeadline deadline) {
        try {
            return deadline.remainingDuration();
        } catch (MetadataMigrationException deadlineFailure) {
            if (deadlineFailure.code() == MetadataMigrationErrorCode.TIMEOUT) {
                throw new TargetJdbcConnectionException(TargetJdbcConnectionErrorCode.TIMEOUT);
            }
            throw deadlineFailure;
        }
    }

    private static int positiveCeiling(long durationNanos, long unitNanos) {
        long units = durationNanos / unitNanos;
        if (durationNanos % unitNanos != 0) {
            units++;
        }
        return (int) Math.min(Integer.MAX_VALUE, Math.max(1, units));
    }

    static DataSource createDataSource(TargetJdbcDataSourceSettings settings) throws SQLException {
        if (settings.kind() == MetadataDatabaseKind.MYSQL) {
            int timeoutMillis = positiveCeiling(
                    settings.remaining().toNanos(), TimeUnit.MILLISECONDS.toNanos(1));
            MysqlDataSource dataSource = new MysqlDataSource();
            dataSource.setURL(settings.jdbcUrl());
            dataSource.setConnectTimeout(timeoutMillis);
            dataSource.setSocketTimeout(timeoutMillis);
            return dataSource;
        }
        int timeoutSeconds = positiveCeiling(
                settings.remaining().toNanos(), TimeUnit.SECONDS.toNanos(1));
        PGSimpleDataSource dataSource = new PGSimpleDataSource();
        dataSource.setURL(settings.jdbcUrl());
        dataSource.setConnectTimeout(timeoutSeconds);
        dataSource.setSocketTimeout(timeoutSeconds);
        dataSource.setCancelSignalTimeout(timeoutSeconds);
        return dataSource;
    }
}
