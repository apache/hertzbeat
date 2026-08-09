/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.io.IOException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Objects;
import java.util.concurrent.locks.ReentrantLock;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseConfiguration;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Applies the static baseline and writes a history row compatible with subsequent standard Flyway runs. */
public final class FlywayTargetSchemaProvisioner implements TargetSchemaProvisioner {

    // Admission rejects multi-node migration. The lock prevents concurrent work in this JVM, while a failed MySQL DDL
    // sequence can leave partial state that deliberately fails the next precondition instead of pretending to resume.
    private static final ReentrantLock PROVISIONING_LOCK = new ReentrantLock();

    @Override
    public void provision(MetadataDatabaseConfiguration target) {
        Objects.requireNonNull(target, "target");
        MetadataDatabaseKind kind = supportedKind(target.kind());
        PROVISIONING_LOCK.lock();
        try {
            provisionLocked(target, kind);
        } finally {
            PROVISIONING_LOCK.unlock();
        }
    }

    private static void provisionLocked(MetadataDatabaseConfiguration target, MetadataDatabaseKind kind) {
        Connection connection;
        try {
            connection = DriverManager.getConnection(target.jdbcUrl(), target.username(), target.password());
        } catch (SQLException exception) {
            throw failure(kind, TargetSchemaProvisioningFailure.Phase.CONNECTION, exception);
        }
        boolean completed = false;
        try {
            configureTransaction(connection, kind);
            provision(connection, target, kind);
            commitTransaction(connection, kind);
            completed = true;
        } catch (TargetSchemaProvisioningException exception) {
            rollbackTransaction(connection, kind);
            throw exception;
        } finally {
            if (!completed) {
                closeQuietly(connection);
            }
        }
        try {
            connection.close();
        } catch (SQLException exception) {
            throw failure(kind, TargetSchemaProvisioningFailure.Phase.CLEANUP, exception);
        }
    }

    private static void configureTransaction(Connection connection, MetadataDatabaseKind kind) {
        if (kind == MetadataDatabaseKind.POSTGRESQL) {
            try {
                connection.setAutoCommit(false);
            } catch (SQLException exception) {
                throw failure(kind, TargetSchemaProvisioningFailure.Phase.TRANSACTION, exception);
            }
        }
    }

    private static void commitTransaction(Connection connection, MetadataDatabaseKind kind) {
        if (kind == MetadataDatabaseKind.POSTGRESQL) {
            try {
                connection.commit();
            } catch (SQLException exception) {
                throw failure(kind, TargetSchemaProvisioningFailure.Phase.TRANSACTION, exception);
            }
        }
    }

    private static void rollbackTransaction(Connection connection, MetadataDatabaseKind kind) {
        if (kind == MetadataDatabaseKind.POSTGRESQL) {
            try {
                connection.rollback();
            } catch (SQLException ignored) {
                // Preserve the sanitized failure from the operation phase.
            }
        }
    }

    private static void closeQuietly(Connection connection) {
        try {
            connection.close();
        } catch (SQLException ignored) {
            // Never attach raw driver diagnostics to the sanitized operation failure.
        }
    }

    private static void provision(
            Connection connection, MetadataDatabaseConfiguration target, MetadataDatabaseKind kind) {
        TargetSchemaBaseline baseline;
        try {
            baseline = TargetSchemaBaseline.load(kind);
        } catch (IOException exception) {
            throw failure(kind, TargetSchemaProvisioningFailure.Phase.BASELINE_RESOURCE, exception);
        }
        FlywaySchemaHistory history = new FlywaySchemaHistory(kind);
        try {
            if (history.isCurrent(connection, baseline)) {
                return;
            }
            history.requireEmptyTarget(connection);
        } catch (SQLException exception) {
            throw failure(kind, TargetSchemaProvisioningFailure.Phase.PRECONDITION, exception);
        }
        int executionTimeMillis;
        try {
            executionTimeMillis = execute(connection, baseline);
        } catch (SQLException exception) {
            throw failure(kind, TargetSchemaProvisioningFailure.Phase.BASELINE_EXECUTION, exception);
        }
        try {
            history.record(connection, baseline, target.username(), executionTimeMillis);
        } catch (SQLException exception) {
            throw failure(kind, TargetSchemaProvisioningFailure.Phase.HISTORY_WRITE, exception);
        }
    }

    private static int execute(Connection connection, TargetSchemaBaseline baseline) throws SQLException {
        long startedAt = System.nanoTime();
        try (Statement statement = connection.createStatement()) {
            for (String sql : baseline.statements()) {
                statement.execute(sql);
            }
        }
        return Math.toIntExact(Math.min(Integer.MAX_VALUE, (System.nanoTime() - startedAt) / 1_000_000L));
    }

    private static TargetSchemaProvisioningException failure(
            MetadataDatabaseKind kind, TargetSchemaProvisioningFailure.Phase phase, Throwable exception) {
        return new TargetSchemaProvisioningException(kind, TargetSchemaProvisioningFailure.from(phase, exception));
    }

    private static MetadataDatabaseKind supportedKind(MetadataDatabaseKind kind) {
        return switch (Objects.requireNonNull(kind, "target kind")) {
            case MYSQL -> MetadataDatabaseKind.MYSQL;
            case POSTGRESQL -> MetadataDatabaseKind.POSTGRESQL;
            case H2 -> throw new IllegalArgumentException("External target schema provisioning does not support H2");
        };
    }
}
