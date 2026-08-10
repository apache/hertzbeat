/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.io.IOException;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Applies the fixed baseline and its Flyway-compatible metadata under one exact JDBC budget. */
final class FlywayTargetSchemaProvisioningWork implements TargetSchemaProvisioningWork {

    private static final String INSTALLED_BY = "hertzbeat-migration";
    private final MetadataDatabaseKind kind;

    FlywayTargetSchemaProvisioningWork(MetadataDatabaseKind kind) {
        this.kind = kind;
    }

    @Override
    public void provision(Connection connection, TargetSchemaJdbcBudget budget) {
        TargetSchemaBaseline baseline = loadBaseline();
        FlywaySchemaHistory history = new FlywaySchemaHistory(kind);
        try {
            budget.check();
            if (history.isCurrent(connection, baseline, budget)) {
                return;
            }
            history.requireEmptyTarget(connection, budget);
        } catch (SQLException failure) {
            throw jdbcFailure(TargetSchemaProvisioningFailure.Phase.PRECONDITION, failure,
                    TargetSchemaConnectionDisposition.REUSABLE);
        } catch (MetadataMigrationException timeout) {
            throw deadlineFailure(TargetSchemaConnectionDisposition.REUSABLE);
        } catch (RuntimeException unexpected) {
            throw failure(TargetSchemaProvisioningFailure.Phase.PRECONDITION, unexpected,
                    TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
        }
        int executionTimeMillis = executeBaseline(connection, baseline, budget);
        try {
            history.record(connection, baseline, INSTALLED_BY, executionTimeMillis, budget);
        } catch (SQLException failure) {
            throw jdbcFailure(TargetSchemaProvisioningFailure.Phase.HISTORY_WRITE, failure,
                    TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
        } catch (MetadataMigrationException timeout) {
            throw deadlineFailure(TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
        } catch (RuntimeException unexpected) {
            throw failure(TargetSchemaProvisioningFailure.Phase.HISTORY_WRITE, unexpected,
                    TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
        }
    }

    private TargetSchemaBaseline loadBaseline() {
        try {
            return TargetSchemaBaseline.load(kind);
        } catch (IOException failure) {
            throw failure(TargetSchemaProvisioningFailure.Phase.BASELINE_RESOURCE, failure,
                    TargetSchemaConnectionDisposition.REUSABLE);
        } catch (RuntimeException unexpected) {
            throw failure(TargetSchemaProvisioningFailure.Phase.BASELINE_RESOURCE, unexpected,
                    TargetSchemaConnectionDisposition.REUSABLE);
        }
    }

    private int executeBaseline(
            Connection connection,
            TargetSchemaBaseline baseline,
            TargetSchemaJdbcBudget budget) {
        long startedAt = System.nanoTime();
        try (Statement statement = connection.createStatement()) {
            for (String sql : baseline.statements()) {
                budget.apply(statement);
                statement.execute(sql);
            }
        } catch (SQLException failure) {
            throw jdbcFailure(TargetSchemaProvisioningFailure.Phase.BASELINE_EXECUTION, failure,
                    TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
        } catch (MetadataMigrationException timeout) {
            throw deadlineFailure(TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
        } catch (RuntimeException unexpected) {
            throw failure(TargetSchemaProvisioningFailure.Phase.BASELINE_EXECUTION, unexpected,
                    TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
        }
        return Math.toIntExact(Math.min(
                Integer.MAX_VALUE, (System.nanoTime() - startedAt) / 1_000_000L));
    }

    private TargetSchemaProvisioningException deadlineFailure(
            TargetSchemaConnectionDisposition disposition) {
        return failure(TargetSchemaProvisioningFailure.Phase.DEADLINE, null, disposition);
    }

    private TargetSchemaProvisioningException jdbcFailure(
            TargetSchemaProvisioningFailure.Phase phase,
            SQLException cause,
            TargetSchemaConnectionDisposition fallbackDisposition) {
        if (TargetSchemaSqlFailure.isTimeout(cause)) {
            return deadlineFailure(TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
        }
        TargetSchemaConnectionDisposition disposition = TargetSchemaSqlFailure.invalidatesConnection(cause)
                ? TargetSchemaConnectionDisposition.DISCARD_REQUIRED
                : fallbackDisposition;
        return failure(phase, cause, disposition);
    }

    private TargetSchemaProvisioningException failure(
            TargetSchemaProvisioningFailure.Phase phase,
            Throwable cause,
            TargetSchemaConnectionDisposition disposition) {
        return new TargetSchemaProvisioningException(
                kind, TargetSchemaProvisioningFailure.from(phase, cause), disposition);
    }
}
