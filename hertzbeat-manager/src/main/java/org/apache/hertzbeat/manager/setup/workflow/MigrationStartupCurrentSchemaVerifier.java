/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.sql.Connection;
import java.sql.SQLException;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Read-only boundary for proving the exact current target schema. */
@FunctionalInterface
interface MigrationStartupCurrentSchemaVerifier {

    boolean isCurrent(
            Connection connection,
            MetadataDatabaseKind kind,
            JdbcMetadataMigrationDeadline deadline) throws SQLException;
}
