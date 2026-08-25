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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.sql.DriverManager;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceLease;
import org.apache.hertzbeat.manager.maintenance.MigrationMaintenanceOrchestrator;
import org.apache.hertzbeat.manager.maintenance.MigrationSourceAction;
import org.apache.hertzbeat.warehouse.db.GreptimeSqlQueryExecutor;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

class DefaultFactoryResetDataCleanerTest {

    @Test
    void clearsEveryConfiguredGreptimeTableAndTheFencedManagementSchema() throws Exception {
        MigrationMaintenanceOrchestrator maintenance = mock(MigrationMaintenanceOrchestrator.class);
        MigrationMaintenanceLease lease = mock(MigrationMaintenanceLease.class);
        GreptimeSqlQueryExecutor greptime = mock(GreptimeSqlQueryExecutor.class);
        @SuppressWarnings("unchecked")
        ObjectProvider<GreptimeSqlQueryExecutor> provider = mock(ObjectProvider.class);
        when(maintenance.acquire(anyString(), any())).thenReturn(lease);
        when(provider.getIfUnique()).thenReturn(greptime);
        when(greptime.executeStrict("SHOW TABLES")).thenReturn(List.of(
                Map.of("Tables", "hzb_metrics"), Map.of("Tables", "hzb_logs")));

        try (Connection connection = DriverManager.getConnection(
                "jdbc:h2:mem:factory-reset-cleaner;DB_CLOSE_DELAY=-1", "sa", "")) {
            connection.createStatement().execute("CREATE TABLE HZB_ACCOUNT(ID BIGINT PRIMARY KEY)");
            org.mockito.Mockito.doAnswer(invocation -> {
                invocation.getArgument(0, MigrationSourceAction.class).execute(connection);
                return null;
            }).when(lease).withSourceConnection(any());

            new DefaultFactoryResetDataCleaner(maintenance, provider).clean();

            assertThat(connection.getMetaData().getTables(
                    null, null, "HZB_ACCOUNT", new String[] {"TABLE"}).next()).isFalse();
        }

        verify(greptime).executeStrict("DROP TABLE IF EXISTS \"hzb_metrics\"");
        verify(greptime).executeStrict("DROP TABLE IF EXISTS \"hzb_logs\"");
        verify(lease).close();
    }
}
