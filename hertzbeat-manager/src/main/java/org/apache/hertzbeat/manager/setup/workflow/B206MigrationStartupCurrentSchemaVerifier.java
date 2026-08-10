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
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;

/** Compares the target to the packaged B206 history and semantic schema contract without writes. */
final class B206MigrationStartupCurrentSchemaVerifier implements MigrationStartupCurrentSchemaVerifier {

    @Override
    public boolean isCurrent(
            Connection connection,
            MetadataDatabaseKind kind,
            JdbcMetadataMigrationDeadline deadline) throws SQLException {
        TargetSchemaJdbcBudget budget = new TargetSchemaJdbcBudget(deadline);
        budget.check();
        TargetSchemaBaseline baseline;
        try {
            baseline = TargetSchemaBaseline.load(kind);
        } catch (MetadataMigrationException timeout) {
            throw timeout;
        } catch (IOException | RuntimeException failure) {
            throw new MigrationStartupReconciliationException(SetupErrorCode.CONFIG_RECOVERY_REQUIRED);
        }
        budget.check();
        return new FlywaySchemaHistory(kind).isCurrent(connection, baseline, budget);
    }
}
