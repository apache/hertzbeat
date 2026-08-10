/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;
import java.util.HashSet;
import java.util.Set;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.TargetInspection;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.workflow.FlywaySchemaHistory.CatalogObject;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TargetSchemaReadOnlyInspectorTest {

    private static final Set<String> APPLICATION_TABLES = Set.of("app_one", "app_two");

    private final Connection connection = mock(Connection.class);
    private final FlywaySchemaHistory history = mock(FlywaySchemaHistory.class);
    private final Statement statement = mock(Statement.class);
    private final ResultSet rows = mock(ResultSet.class);
    private TargetSchemaBaseline baseline;
    private TargetSchemaReadOnlyInspector inspector;

    @BeforeEach
    void setUp() throws Exception {
        baseline = mock(TargetSchemaBaseline.class);
        when(baseline.expectedTables()).thenReturn(APPLICATION_TABLES);
        inspector = new TargetSchemaReadOnlyInspector(
                kind -> baseline,
                kind -> history);
        when(connection.createStatement()).thenReturn(statement);
        when(statement.executeQuery(anyString())).thenReturn(rows);
        when(rows.next()).thenReturn(false);
        when(history.hasExactHousekeepingIndexes(eq(connection), any())).thenReturn(true);
    }

    @AfterEach
    void clearInterrupt() {
        Thread.interrupted();
    }

    @Test
    void physicalEmptyCatalogIsApiEmptyWithoutCurrentSchemaQueries() throws Exception {
        when(history.catalogSchemaObjects(eq(connection), any())).thenReturn(Set.of());
        when(history.catalogSchemaTables(eq(connection), any())).thenReturn(Set.of());

        assertThat(inspector.inspect(connection, MetadataDatabaseKind.MYSQL, deadline()))
                .isEqualTo(TargetInspection.EMPTY);

        verify(history, never()).isCurrent(eq(connection), eq(baseline), any());
        verify(connection, never()).createStatement();
    }

    @Test
    void exactCurrentSchemaRequiresEveryApplicationTableToBeEmpty() throws Exception {
        when(history.catalogSchemaObjects(eq(connection), any())).thenReturn(tableObjects());
        when(history.catalogSchemaTables(eq(connection), any())).thenReturn(expectedTables());
        when(history.isCurrent(eq(connection), eq(baseline), any())).thenReturn(true);

        assertThat(inspector.inspect(connection, MetadataDatabaseKind.MYSQL, deadline()))
                .isEqualTo(TargetInspection.EMPTY);

        verify(statement, times(baseline.expectedTables().size())).executeQuery(anyString());
        verify(rows, times(baseline.expectedTables().size())).close();
    }

    @Test
    void extraOrMissingObjectIsNonEmptyWithoutReadingApplicationRows() throws Exception {
        Set<String> extra = new HashSet<>(expectedTables());
        extra.add("foreign_table");
        when(history.catalogSchemaObjects(eq(connection), any())).thenReturn(tableObjects());
        when(history.catalogSchemaTables(eq(connection), any())).thenReturn(Set.copyOf(extra));

        assertThat(inspector.inspect(connection, MetadataDatabaseKind.MYSQL, deadline()))
                .isEqualTo(TargetInspection.NON_EMPTY);

        verify(history, never()).isCurrent(eq(connection), eq(baseline), any());
        verify(connection, never()).createStatement();
    }

    @Test
    void currentSchemaWithAnyApplicationRowIsNonEmpty() throws Exception {
        when(history.catalogSchemaObjects(eq(connection), any())).thenReturn(tableObjects());
        when(history.catalogSchemaTables(eq(connection), any())).thenReturn(expectedTables());
        when(history.isCurrent(eq(connection), eq(baseline), any())).thenReturn(true);
        when(rows.next()).thenReturn(true);

        assertThat(inspector.inspect(connection, MetadataDatabaseKind.MYSQL, deadline()))
                .isEqualTo(TargetInspection.NON_EMPTY);
    }

    @Test
    void readableCurrentContractMismatchIsNonEmptyRatherThanUnknown() throws Exception {
        when(history.catalogSchemaObjects(eq(connection), any())).thenReturn(tableObjects());
        when(history.catalogSchemaTables(eq(connection), any())).thenReturn(expectedTables());
        when(history.isCurrent(eq(connection), eq(baseline), any()))
                .thenThrow(new SQLException("private shape", "55000"));

        assertThat(inspector.inspect(connection, MetadataDatabaseKind.MYSQL, deadline()))
                .isEqualTo(TargetInspection.NON_EMPTY);
    }

    @Test
    void unreadableOrInterruptedInspectionIsUnknownAndPreservesInterrupt() throws Exception {
        when(history.catalogSchemaObjects(eq(connection), any()))
                .thenThrow(new SQLException("private target", "42501"));
        assertThat(inspector.inspect(connection, MetadataDatabaseKind.MYSQL, deadline()))
                .isEqualTo(TargetInspection.UNKNOWN);

        Thread.currentThread().interrupt();
        assertThat(inspector.inspect(connection, MetadataDatabaseKind.MYSQL, deadline()))
                .isEqualTo(TargetInspection.UNKNOWN);
        assertThat(Thread.currentThread().isInterrupted()).isTrue();
    }

    @Test
    void viewOnlyAndCurrentSchemaWithForeignViewAreNonEmpty() throws Exception {
        CatalogObject view = new CatalogObject("foreign_view", "VIEW");
        when(history.catalogSchemaObjects(eq(connection), any())).thenReturn(Set.of(view));
        when(history.catalogSchemaTables(eq(connection), any())).thenReturn(Set.of());
        assertThat(inspector.inspect(connection, MetadataDatabaseKind.MYSQL, deadline()))
                .isEqualTo(TargetInspection.NON_EMPTY);

        Set<CatalogObject> currentWithMaterialized = new HashSet<>(tableObjects());
        currentWithMaterialized.add(new CatalogObject("foreign_materialized", "MATERIALIZED VIEW"));
        when(history.catalogSchemaObjects(eq(connection), any()))
                .thenReturn(Set.copyOf(currentWithMaterialized));
        assertThat(inspector.inspect(connection, MetadataDatabaseKind.POSTGRESQL, deadline()))
                .isEqualTo(TargetInspection.NON_EMPTY);

        when(history.catalogSchemaObjects(eq(connection), any()))
                .thenReturn(Set.of(new CatalogObject("foreign_seq", "SEQUENCE")));
        assertThat(inspector.inspect(connection, MetadataDatabaseKind.POSTGRESQL, deadline()))
                .isEqualTo(TargetInspection.NON_EMPTY);

        Set<CatalogObject> currentWithView = new HashSet<>(tableObjects());
        currentWithView.add(view);
        when(history.catalogSchemaObjects(eq(connection), any())).thenReturn(Set.copyOf(currentWithView));
        when(history.catalogSchemaTables(eq(connection), any())).thenReturn(expectedTables());
        when(history.isCurrent(eq(connection), eq(baseline), any())).thenReturn(true);
        assertThat(inspector.inspect(connection, MetadataDatabaseKind.MYSQL, deadline()))
                .isEqualTo(TargetInspection.NON_EMPTY);
    }

    @Test
    void postRowDeadlineCheckAppliesToEmptyAndNonEmptyResults() throws Exception {
        when(history.catalogSchemaObjects(eq(connection), any())).thenReturn(tableObjects());
        when(history.catalogSchemaTables(eq(connection), any())).thenReturn(expectedTables());
        when(history.isCurrent(eq(connection), eq(baseline), any())).thenReturn(true);
        when(rows.next()).thenAnswer(invocation -> {
            Thread.currentThread().interrupt();
            return false;
        });

        assertThat(inspector.inspect(connection, MetadataDatabaseKind.MYSQL, deadline()))
                .isEqualTo(TargetInspection.UNKNOWN);
        assertThat(Thread.currentThread().isInterrupted()).isTrue();

        Thread.interrupted();
        when(rows.next()).thenAnswer(invocation -> {
            Thread.currentThread().interrupt();
            return true;
        });
        assertThat(inspector.inspect(connection, MetadataDatabaseKind.MYSQL, deadline()))
                .isEqualTo(TargetInspection.UNKNOWN);
        assertThat(Thread.currentThread().isInterrupted()).isTrue();
    }

    @Test
    void currentPostgresqlOwnedSequencesAndIndexesRemainEmptyButForeignSequenceDoesNot()
            throws Exception {
        Set<CatalogObject> ownedObjects = new HashSet<>(tableObjects());
        ownedObjects.add(new CatalogObject("app_one_id_seq", "SEQUENCE"));
        ownedObjects.add(new CatalogObject("app_one_pkey", "INDEX"));
        when(history.catalogSchemaObjects(eq(connection), any())).thenReturn(Set.copyOf(ownedObjects));
        when(history.catalogSchemaTables(eq(connection), any())).thenReturn(expectedTables());
        when(history.isCurrent(eq(connection), eq(baseline), any())).thenReturn(true);
        assertThat(inspector.inspect(connection, MetadataDatabaseKind.POSTGRESQL, deadline()))
                .isEqualTo(TargetInspection.EMPTY);

        ownedObjects.add(new CatalogObject("foreign_seq", "SEQUENCE"));
        when(history.catalogSchemaObjects(eq(connection), any())).thenReturn(Set.copyOf(ownedObjects));
        when(history.isCurrent(eq(connection), eq(baseline), any()))
                .thenThrow(new SQLException("private sequence mismatch", "55000"));
        assertThat(inspector.inspect(connection, MetadataDatabaseKind.POSTGRESQL, deadline()))
                .isEqualTo(TargetInspection.NON_EMPTY);
    }

    @Test
    void housekeepingIndexAllowlistIsVendorExactAndForeignIndexesMakeCurrentSchemaNonEmpty()
            throws Exception {
        FlywaySchemaHistory mysql = new FlywaySchemaHistory(MetadataDatabaseKind.MYSQL);
        assertThat(mysql.hasExactHousekeepingIndexes(
                Set.of("primary", "flyway_schema_history_s_idx"), Set.of("primary"))).isTrue();
        assertThat(mysql.hasExactHousekeepingIndexes(
                Set.of("primary", "flyway_schema_history_s_idx", "foreign_idx"), Set.of("primary"))).isFalse();

        FlywaySchemaHistory postgresql = new FlywaySchemaHistory(MetadataDatabaseKind.POSTGRESQL);
        assertThat(postgresql.hasExactHousekeepingIndexes(
                Set.of("flyway_schema_history_pk", "flyway_schema_history_s_idx"),
                Set.of("flyway_schema_contract_pk"))).isTrue();

        when(history.catalogSchemaObjects(eq(connection), any())).thenReturn(tableObjects());
        when(history.catalogSchemaTables(eq(connection), any())).thenReturn(expectedTables());
        when(history.isCurrent(eq(connection), eq(baseline), any())).thenReturn(true);
        when(history.hasExactHousekeepingIndexes(eq(connection), any())).thenReturn(false);
        assertThat(inspector.inspect(connection, MetadataDatabaseKind.MYSQL, deadline()))
                .isEqualTo(TargetInspection.NON_EMPTY);
    }

    private Set<String> expectedTables() {
        Set<String> expected = new HashSet<>(APPLICATION_TABLES);
        expected.add("flyway_schema_history");
        expected.add(TargetSchemaContract.TABLE);
        return Set.copyOf(expected);
    }

    private Set<CatalogObject> tableObjects() {
        return expectedTables().stream()
                .map(name -> new CatalogObject(name, "TABLE"))
                .collect(java.util.stream.Collectors.toUnmodifiableSet());
    }

    private static JdbcMetadataMigrationDeadline deadline() {
        return JdbcMetadataMigrationDeadline.start(Duration.ofSeconds(5), System::nanoTime);
    }
}
