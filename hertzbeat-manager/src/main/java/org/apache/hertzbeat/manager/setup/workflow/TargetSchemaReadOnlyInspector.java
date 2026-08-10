/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.io.IOException;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.TargetInspection;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.workflow.FlywaySchemaHistory.CatalogObject;

/** Classifies a target schema without mutating it or retaining its connection. */
final class TargetSchemaReadOnlyInspector {

    private static final String HISTORY_TABLE = "flyway_schema_history";
    private static final Set<String> CURRENT_OBJECT_TYPES = Set.of("TABLE", "INDEX", "SEQUENCE");

    private final BaselineLoader baselines;
    private final HistoryFactory histories;

    TargetSchemaReadOnlyInspector() {
        this(TargetSchemaBaseline::load, FlywaySchemaHistory::new);
    }

    TargetSchemaReadOnlyInspector(BaselineLoader baselines, HistoryFactory histories) {
        this.baselines = Objects.requireNonNull(baselines, "baselines");
        this.histories = Objects.requireNonNull(histories, "histories");
    }

    TargetInspection inspect(
            Connection connection,
            MetadataDatabaseKind kind,
            JdbcMetadataMigrationDeadline deadline) {
        Objects.requireNonNull(connection, "connection");
        Objects.requireNonNull(kind, "kind");
        Objects.requireNonNull(deadline, "deadline");
        if (kind == MetadataDatabaseKind.H2) {
            return TargetInspection.UNKNOWN;
        }
        TargetSchemaJdbcBudget budget = new TargetSchemaJdbcBudget(deadline);
        try {
            TargetSchemaBaseline baseline = baselines.load(kind);
            FlywaySchemaHistory history = histories.create(kind);
            Set<CatalogObject> catalogObjects = history.catalogSchemaObjects(connection, budget);
            if (catalogObjects.isEmpty()) {
                return TargetInspection.EMPTY;
            }
            if (containsUnsupportedRelation(catalogObjects)) {
                return TargetInspection.NON_EMPTY;
            }
            Set<String> actualTables = history.catalogSchemaTables(connection, budget);
            if (!actualTables.equals(expectedTables(baseline))) {
                return TargetInspection.NON_EMPTY;
            }
            if (!history.isCurrent(connection, baseline, budget)) {
                return TargetInspection.NON_EMPTY;
            }
            if (!history.hasExactHousekeepingIndexes(connection, budget)) {
                return TargetInspection.NON_EMPTY;
            }
            return applicationTablesEmpty(connection, baseline.expectedTables(), budget)
                    ? TargetInspection.EMPTY
                    : TargetInspection.NON_EMPTY;
        } catch (SQLException failure) {
            return "55000".equals(failure.getSQLState())
                    ? TargetInspection.NON_EMPTY
                    : TargetInspection.UNKNOWN;
        } catch (IOException failure) {
            return TargetInspection.UNKNOWN;
        } catch (RuntimeException failure) {
            return TargetInspection.UNKNOWN;
        }
    }

    private static Set<String> expectedTables(TargetSchemaBaseline baseline) {
        Set<String> expected = new HashSet<>(baseline.expectedTables());
        expected.add(HISTORY_TABLE);
        expected.add(TargetSchemaContract.TABLE);
        return Set.copyOf(expected);
    }

    private static boolean containsUnsupportedRelation(Set<CatalogObject> catalogObjects) {
        return catalogObjects.stream().map(CatalogObject::type)
                .anyMatch(type -> !CURRENT_OBJECT_TYPES.contains(type));
    }

    private static boolean applicationTablesEmpty(
            Connection connection,
            Set<String> applicationTables,
            TargetSchemaJdbcBudget budget) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            for (String table : applicationTables) {
                budget.apply(statement);
                try (ResultSet rows = statement.executeQuery("SELECT 1 FROM " + table + " LIMIT 1")) {
                    budget.check();
                    boolean hasRows = rows.next();
                    budget.check();
                    if (hasRows) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    @FunctionalInterface
    interface BaselineLoader {

        TargetSchemaBaseline load(MetadataDatabaseKind kind) throws IOException;
    }

    @FunctionalInterface
    interface HistoryFactory {

        FlywaySchemaHistory create(MetadataDatabaseKind kind);
    }
}
