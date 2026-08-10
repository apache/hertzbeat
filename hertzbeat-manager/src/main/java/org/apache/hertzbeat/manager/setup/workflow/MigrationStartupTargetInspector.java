/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.installation.InstallationFingerprint;

/** Performs only current-schema and installation-identity reads on a caller-owned connection. */
final class MigrationStartupTargetInspector {

    private static final String INSTALLATION_QUERY =
            "SELECT id, installation_fingerprint, complete FROM hzb_installation";

    private final MigrationStartupCurrentSchemaVerifier schema;

    MigrationStartupTargetInspector() {
        this(new B206MigrationStartupCurrentSchemaVerifier());
    }

    MigrationStartupTargetInspector(MigrationStartupCurrentSchemaVerifier schema) {
        this.schema = Objects.requireNonNull(schema, "schema");
    }

    MigrationStartupTargetVerification inspect(
            Connection connection,
            MetadataDatabaseKind kind,
            InstallationFingerprint fingerprint,
            JdbcMetadataMigrationDeadline deadline) {
        Objects.requireNonNull(connection, "connection");
        Objects.requireNonNull(kind, "kind");
        Objects.requireNonNull(fingerprint, "fingerprint");
        Objects.requireNonNull(deadline, "deadline");
        TargetSchemaJdbcBudget budget = new TargetSchemaJdbcBudget(deadline);
        try {
            if (!schema.isCurrent(connection, kind, deadline)) {
                return MigrationStartupTargetVerification.DETERMINISTIC_MISMATCH;
            }
            return installationMatches(connection, fingerprint, budget)
                    ? MigrationStartupTargetVerification.CONFIRMED
                    : MigrationStartupTargetVerification.DETERMINISTIC_MISMATCH;
        } catch (MetadataMigrationException timeout) {
            return MigrationStartupTargetVerification.TRANSIENT_UNAVAILABLE;
        } catch (SQLException failure) {
            if ("55000".equals(failure.getSQLState())) {
                return MigrationStartupTargetVerification.DETERMINISTIC_MISMATCH;
            }
            if (TargetSchemaSqlFailure.invalidatesConnection(failure)) {
                return MigrationStartupTargetVerification.TRANSIENT_UNAVAILABLE;
            }
            throw new MigrationStartupReconciliationException(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
        }
    }

    private boolean installationMatches(
            Connection connection,
            InstallationFingerprint fingerprint,
            TargetSchemaJdbcBudget budget) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(INSTALLATION_QUERY)) {
            budget.apply(statement);
            try (ResultSet rows = statement.executeQuery()) {
                budget.check();
                if (!rows.next()) {
                    return false;
                }
                budget.check();
                short id = rows.getShort("id");
                budget.check();
                String actualFingerprint = rows.getString("installation_fingerprint");
                budget.check();
                boolean complete = rows.getBoolean("complete");
                budget.check();
                boolean exact = id == 1 && complete && fingerprint.value().equals(actualFingerprint);
                boolean anotherRow = rows.next();
                budget.check();
                return exact && !anotherRow;
            }
        }
    }
}
