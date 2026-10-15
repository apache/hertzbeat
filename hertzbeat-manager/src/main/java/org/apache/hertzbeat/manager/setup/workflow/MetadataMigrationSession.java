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

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Locale;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Owns transactions on caller-owned JDBC connections without owning connection lifetime. */
final class MetadataMigrationSession implements AutoCloseable {

    private final Connection source;
    private final Connection target;
    private final boolean sourceReadOnly;
    private final int sourceIsolation;
    private final int targetIsolation;
    private boolean sourceIsolationChanged;
    private boolean sourceReadOnlyChanged;
    private boolean sourceAutoCommitChanged;
    private boolean targetAutoCommitChanged;
    private boolean targetIsolationChanged;
    private boolean sourceMutationUncertain;
    private boolean targetMutationUncertain;
    private boolean commitAttempted;
    private boolean committed;
    private boolean sourceInvalidated;
    private boolean targetInvalidated;

    MetadataMigrationSession(Connection source, Connection target) throws SQLException {
        this.source = source;
        this.target = target;
        sourceReadOnly = source.isReadOnly();
        sourceIsolation = source.getTransactionIsolation();
        targetIsolation = target.getTransactionIsolation();
    }

    void begin(MetadataDatabaseKind targetKind) throws SQLException {
        if (!source.getAutoCommit() || !target.getAutoCommit()) {
            throw new SQLException("Migration connections must not have active transactions", "25001");
        }
        requireDatabase(source, MetadataDatabaseKind.H2);
        requireDatabase(target, targetKind);
        try {
            sourceMutationUncertain = true;
            source.setTransactionIsolation(Connection.TRANSACTION_SERIALIZABLE);
            sourceIsolationChanged = true;
            sourceMutationUncertain = false;
            sourceMutationUncertain = true;
            source.setReadOnly(true);
            sourceReadOnlyChanged = true;
            sourceMutationUncertain = false;
            sourceMutationUncertain = true;
            source.setAutoCommit(false);
            sourceAutoCommitChanged = true;
            sourceMutationUncertain = false;
            targetMutationUncertain = true;
            target.setTransactionIsolation(Connection.TRANSACTION_SERIALIZABLE);
            targetIsolationChanged = true;
            targetMutationUncertain = false;
            targetMutationUncertain = true;
            target.setAutoCommit(false);
            targetAutoCommitChanged = true;
            targetMutationUncertain = false;
        } catch (SQLException exception) {
            closeUncertainConnections();
            throw exception;
        }
    }

    void commit() throws SQLException {
        commitAttempted = true;
        try {
            target.commit();
            committed = true;
        } catch (SQLException exception) {
            invalidateTarget();
            throw new MetadataMigrationException(MetadataMigrationErrorCode.COMMIT_OUTCOME_UNKNOWN);
        }
    }

    @Override
    public void close() {
        boolean failed = false;
        boolean rollbackOutcomeUnknown = false;
        if (commitAttempted && !committed) {
            invalidateTarget();
        } else if (targetMutationUncertain) {
            failed = true;
            invalidateTarget();
        } else if (targetAutoCommitChanged) {
            if (!committed && !rollback(target)) {
                failed = true;
                rollbackOutcomeUnknown = true;
                invalidateTarget();
            } else if (!restoreTarget()) {
                failed = true;
                invalidateTarget();
            }
        }
        if (sourceMutationUncertain) {
            failed = true;
            invalidateSource();
        } else if (!restoreSource()) {
            failed = true;
            invalidateSource();
        }
        if (failed && !committed) {
            throw new MetadataMigrationException(rollbackOutcomeUnknown
                    ? MetadataMigrationErrorCode.ROLLBACK_OUTCOME_UNKNOWN
                    : MetadataMigrationErrorCode.COPY);
        }
    }

    private static void requireDatabase(Connection connection, MetadataDatabaseKind kind) throws SQLException {
        String product = connection.getMetaData().getDatabaseProductName().toLowerCase(Locale.ROOT);
        boolean matches = switch (kind) {
            case H2 -> product.equals("h2");
            case MYSQL -> product.contains("mysql");
            case POSTGRESQL -> product.contains("postgresql");
        };
        if (!matches) {
            throw new SQLException("Unexpected database kind", "55000");
        }
    }

    private boolean restoreSource() {
        if (sourceAutoCommitChanged && !rollback(source)) {
            return false;
        }
        if (sourceAutoCommitChanged && !restoreAutoCommit(source)) {
            return false;
        }
        try {
            if (sourceReadOnlyChanged) {
                source.setReadOnly(sourceReadOnly);
            }
            if (sourceIsolationChanged) {
                source.setTransactionIsolation(sourceIsolation);
            }
            return true;
        } catch (SQLException ignored) {
            return false;
        }
    }

    private boolean restoreTarget() {
        if (!restoreAutoCommit(target)) {
            return false;
        }
        try {
            if (targetIsolationChanged) {
                target.setTransactionIsolation(targetIsolation);
            }
            return true;
        } catch (SQLException ignored) {
            return false;
        }
    }

    private void closeUncertainConnections() {
        if (targetMutationUncertain) {
            invalidateTarget();
        }
        if (sourceMutationUncertain) {
            invalidateSource();
        }
    }

    private void invalidateSource() {
        if (!sourceInvalidated) {
            sourceInvalidated = true;
            closeQuietly(source);
        }
    }

    private void invalidateTarget() {
        if (!targetInvalidated) {
            targetInvalidated = true;
            closeQuietly(target);
        }
    }

    private static boolean restoreAutoCommit(Connection connection) {
        try {
            connection.setAutoCommit(true);
            return true;
        } catch (SQLException ignored) {
            return false;
        }
    }

    private static boolean rollback(Connection connection) {
        try {
            connection.rollback();
            return true;
        } catch (SQLException ignored) {
            return false;
        }
    }

    private static void closeQuietly(Connection connection) {
        try {
            connection.close();
        } catch (SQLException ignored) {
            // Connection invalidation is best effort; no driver detail may escape.
        }
    }
}
