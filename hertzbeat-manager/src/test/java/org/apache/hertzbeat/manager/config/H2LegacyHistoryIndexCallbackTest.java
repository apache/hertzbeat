/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.config;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import org.flywaydb.core.api.MigrationInfo;
import org.flywaydb.core.api.MigrationState;
import org.flywaydb.core.api.MigrationVersion;
import org.flywaydb.core.api.callback.Context;
import org.flywaydb.core.api.callback.Event;
import org.junit.jupiter.api.Test;

class H2LegacyHistoryIndexCallbackTest {
    private final H2LegacyHistoryIndexCallback callback = new H2LegacyHistoryIndexCallback();

    @Test
    void toleratesFlywayEventProbeWithoutContext() {
        assertTrue(callback.supports(Event.BEFORE_EACH_MIGRATE, null));
        assertFalse(callback.supports(Event.BEFORE_MIGRATE, null));
        assertFalse(callback.canHandleInTransaction(Event.BEFORE_EACH_MIGRATE, null));
        callback.handle(Event.BEFORE_EACH_MIGRATE, null);
    }

    @Test
    void onlyHandlesPending180AndNeverWritesForOtherMigrations() {
        Connection connection = mock(Connection.class);
        for (String version : new String[]{"173", "181", "200"}) {
            Context context = migrationContext(version, MigrationState.PENDING);
            when(context.getConnection()).thenReturn(connection);
            assertFalse(callback.supports(Event.BEFORE_EACH_MIGRATE, context));
            callback.handle(Event.BEFORE_EACH_MIGRATE, context);
        }
        Context failed = migrationContext("180", MigrationState.FAILED);
        when(failed.getConnection()).thenReturn(connection);
        assertFalse(callback.supports(Event.BEFORE_EACH_MIGRATE, failed));
        callback.handle(Event.BEFORE_EACH_MIGRATE, failed);
        verifyNoInteractions(connection);
    }

    @Test
    void ignoresOtherDatabaseProductsBeforeReadingTheirSchema() throws Exception {
        Context context = migrationContext("180", MigrationState.PENDING);
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        when(context.getConnection()).thenReturn(connection);
        when(connection.getMetaData()).thenReturn(metadata);
        when(metadata.getDatabaseProductName()).thenReturn("PostgreSQL");
        callback.handle(Event.BEFORE_EACH_MIGRATE, context);
        org.mockito.Mockito.verify(connection).getMetaData();
        org.mockito.Mockito.verifyNoMoreInteractions(connection);
    }

    private static Context migrationContext(String version, MigrationState state) {
        Context context = mock(Context.class);
        MigrationInfo migration = mock(MigrationInfo.class);
        when(context.getMigrationInfo()).thenReturn(migration);
        when(migration.getVersion()).thenReturn(MigrationVersion.fromVersion(version));
        when(migration.getState()).thenReturn(state);
        return context;
    }
}
