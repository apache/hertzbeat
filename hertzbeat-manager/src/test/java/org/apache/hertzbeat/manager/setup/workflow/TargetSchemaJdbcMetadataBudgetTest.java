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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.time.Duration;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.junit.jupiter.api.Test;

class TargetSchemaJdbcMetadataBudgetTest {

    @Test
    void historyStopsAfterMetadataLookupBeforeCatalogLookup() throws Exception {
        AtomicLong ticker = new AtomicLong();
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        when(connection.getMetaData()).thenAnswer(invocation -> {
            ticker.set(2);
            return metadata;
        });

        assertTimeout(() -> new FlywaySchemaHistory(MetadataDatabaseKind.MYSQL)
                .requireEmptyTarget(connection, budget(ticker)));
        verify(connection, never()).getCatalog();
    }

    @Test
    void historyStopsAfterCatalogLookupBeforeTableLookup() throws Exception {
        AtomicLong ticker = new AtomicLong();
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        ResultSet tables = mock(ResultSet.class);
        when(connection.getMetaData()).thenReturn(metadata);
        when(connection.getCatalog()).thenAnswer(invocation -> {
            ticker.set(2);
            return null;
        });
        when(metadata.getTables(any(), any(), anyString(), any())).thenReturn(tables);

        assertTimeout(() -> new FlywaySchemaHistory(MetadataDatabaseKind.MYSQL)
                .requireEmptyTarget(connection, budget(ticker)));
        verify(metadata, never()).getTables(any(), any(), anyString(), any());
    }

    @Test
    void historyStopsAfterTableLookupBeforeReadingRows() throws Exception {
        AtomicLong ticker = new AtomicLong();
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        ResultSet tables = mock(ResultSet.class);
        when(connection.getMetaData()).thenReturn(metadata);
        when(metadata.getTables(any(), any(), anyString(), any())).thenAnswer(invocation -> {
            ticker.set(2);
            return tables;
        });

        assertTimeout(() -> new FlywaySchemaHistory(MetadataDatabaseKind.MYSQL)
                .requireEmptyTarget(connection, budget(ticker)));
        verify(tables, never()).next();
        verify(tables).close();
    }

    @Test
    void semanticStateStopsAfterMetadataLookupBeforeCatalogLookup() throws Exception {
        AtomicLong ticker = new AtomicLong();
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        when(connection.getMetaData()).thenAnswer(invocation -> {
            ticker.set(2);
            return metadata;
        });

        assertTimeout(() -> JdbcTargetSchemaState.capture(
                connection, MetadataDatabaseKind.POSTGRESQL, Set.of(), budget(ticker)));
        verify(connection, never()).getCatalog();
    }

    @Test
    void semanticStateStopsAfterCatalogLookupBeforeSchemaLookup() throws Exception {
        AtomicLong ticker = new AtomicLong();
        Connection connection = mock(Connection.class);
        DatabaseMetaData metadata = mock(DatabaseMetaData.class);
        when(connection.getMetaData()).thenReturn(metadata);
        when(connection.getCatalog()).thenAnswer(invocation -> {
            ticker.set(2);
            return null;
        });

        assertTimeout(() -> JdbcTargetSchemaState.capture(
                connection, MetadataDatabaseKind.POSTGRESQL, Set.of(), budget(ticker)));
        verify(connection, never()).getSchema();
    }

    private static TargetSchemaJdbcBudget budget(AtomicLong ticker) {
        return new TargetSchemaJdbcBudget(
                JdbcMetadataMigrationDeadline.start(Duration.ofNanos(1), ticker::get));
    }

    private static void assertTimeout(ThrowingAction action) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(MetadataMigrationException.class, failure ->
                        assertThat(failure.code()).isEqualTo(MetadataMigrationErrorCode.TIMEOUT));
    }

    @FunctionalInterface
    private interface ThrowingAction {

        void run() throws Exception;
    }
}
