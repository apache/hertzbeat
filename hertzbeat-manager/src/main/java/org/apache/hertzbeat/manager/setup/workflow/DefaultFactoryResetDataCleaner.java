/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.sql.Connection;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceLease;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceOrchestrator;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

/** Clears the configured telemetry database and the exact fenced management database. */
public final class DefaultFactoryResetDataCleaner implements FactoryResetDataCleaner {

    private static final Duration MAINTENANCE_TIMEOUT = Duration.ofMinutes(2);
    private static final String OPERATION_ID = "factory-reset";
    private final MigrationMaintenanceOrchestrator maintenance;
    private final ObjectProvider<GreptimeSqlQueryExecutor> greptimeProvider;

    public DefaultFactoryResetDataCleaner(
            MigrationMaintenanceOrchestrator maintenance,
            ObjectProvider<GreptimeSqlQueryExecutor> greptimeProvider) {
        this.maintenance = maintenance;
        this.greptimeProvider = greptimeProvider;
    }

    @Override
    public void clean() {
        try (MigrationMaintenanceLease lease = maintenance.acquire(OPERATION_ID, MAINTENANCE_TIMEOUT)) {
            cleanGreptime();
            lease.withSourceConnection(DefaultFactoryResetDataCleaner::cleanManagementDatabase);
        }
    }

    private void cleanGreptime() {
        GreptimeSqlQueryExecutor executor = greptimeProvider.getIfUnique();
        if (executor == null) {
            return;
        }
        List<Map<String, Object>> rows = executor.executeStrict("SHOW TABLES");
        for (Map<String, Object> row : rows) {
            executor.executeStrict("DROP TABLE IF EXISTS " + quoteIdentifier(tableName(row)));
        }
    }

    private static String tableName(Map<String, Object> row) {
        if (row == null || row.size() != 1) {
            throw new IllegalStateException("GreptimeDB returned an unexpected table inventory");
        }
        Object value = row.values().iterator().next();
        if (!(value instanceof String table) || table.isBlank() || table.length() > 256
                || table.chars().anyMatch(Character::isISOControl)) {
            throw new IllegalStateException("GreptimeDB returned an invalid table name");
        }
        return table;
    }

    private static String quoteIdentifier(String identifier) {
        return '"' + identifier.replace("\"", "\"\"") + '"';
    }

    private static void cleanManagementDatabase(Connection connection) {
        SingleConnectionDataSource source = new SingleConnectionDataSource(connection, true);
        Flyway.configure()
                .dataSource(source)
                .cleanDisabled(false)
                .load()
                .clean();
    }
}
