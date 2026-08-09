/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.maintenance;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.SQLException;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicBoolean;
import javax.sql.DataSource;
import org.apache.hertzbeat.common.runtime.ConditionalOnNormalBusinessRuntime;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.boot.jdbc.autoconfigure.DataSourceProperties;
import org.springframework.stereotype.Component;

/** Holds an embedded H2 connection after proving its configured local access mode is safe. */
@Component
@ConditionalOnNormalBusinessRuntime
public final class EmbeddedH2SourceGuard implements MigrationSourceGuard, DisposableBean {

    private final DataSourceProperties dataSourceProperties;
    private final DeadlineConnectionAcquirer connectionAcquirer;

    public EmbeddedH2SourceGuard(DataSource dataSource, DataSourceProperties dataSourceProperties) {
        this.dataSourceProperties = dataSourceProperties;
        this.connectionAcquirer = new DeadlineConnectionAcquirer(dataSource);
    }

    @Override
    public MigrationSourceLease fence(String operationId, Duration timeout) {
        requireRequest(operationId, timeout);
        String configuredUrl = dataSourceProperties.getUrl();
        if (!EmbeddedH2SourceClassifier.isSafeEmbeddedSource("H2", configuredUrl)) {
            throw MigrationMaintenanceException.sourceUnavailable();
        }
        Connection connection = connectionAcquirer.acquire(timeout);
        try {
            DatabaseMetaData metadata = connection.getMetaData();
            String productName = metadata.getDatabaseProductName();
            String actualUrl = metadata.getURL();
            if (!EmbeddedH2SourceClassifier.isSafeEmbeddedSource(productName, actualUrl)
                    || !EmbeddedH2SourceClassifier.matchesConfiguredSource(configuredUrl, actualUrl)) {
                closeRejectedConnection(connection);
                throw MigrationMaintenanceException.sourceUnavailable();
            }
            return new ConnectionSourceLease(connection);
        } catch (MigrationMaintenanceException exception) {
            throw exception;
        } catch (SQLException | RuntimeException exception) {
            closeRejectedConnection(connection);
            throw MigrationMaintenanceException.sourceUnavailable();
        }
    }

    @Override
    public void destroy() {
        connectionAcquirer.close();
    }

    private void requireRequest(String operationId, Duration timeout) {
        if (operationId == null || operationId.isBlank() || timeout == null || timeout.isNegative()) {
            throw MigrationMaintenanceException.invalidRequest();
        }
    }

    private void closeRejectedConnection(Connection connection) {
        try {
            connection.close();
        } catch (SQLException | RuntimeException exception) {
            // The stable source failure remains primary.
        }
    }

    private static final class ConnectionSourceLease implements MigrationSourceLease {

        private final Connection connection;
        private final AtomicBoolean closed = new AtomicBoolean();

        private ConnectionSourceLease(Connection connection) {
            this.connection = connection;
        }

        @Override
        public void close() {
            if (!closed.compareAndSet(false, true)) {
                return;
            }
            try {
                connection.close();
            } catch (SQLException | RuntimeException exception) {
                closed.set(false);
                throw MigrationMaintenanceException.resumeFailure();
            }
        }
    }
}
