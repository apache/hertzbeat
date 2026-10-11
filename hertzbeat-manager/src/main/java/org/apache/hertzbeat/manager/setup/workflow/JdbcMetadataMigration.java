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
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.SQLTimeoutException;
import java.sql.Statement;
import java.time.Duration;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/**
 * Synchronous H2-to-external JDBC copy and verification primitive.
 *
 * <p>The timeout is a JDBC-statement budget, not a connection or socket deadline. The caller owns
 * both connections and must configure their network timeouts and an outer abort watchdog.
 */
public final class JdbcMetadataMigration {

    private final MetadataJdbcValueAdapter values = new MetadataJdbcValueAdapter();
    private final MetadataRowCopier copier = new MetadataRowCopier(values);
    private final CanonicalTableDigest digests = new CanonicalTableDigest(values);
    private final MetadataIdentityRepair identities = new MetadataIdentityRepair();
    private final CopyCheckpoint copyCheckpoint;

    public JdbcMetadataMigration() {
        this(CopyCheckpoint.NO_OP);
    }

    JdbcMetadataMigration(CopyCheckpoint copyCheckpoint) {
        this.copyCheckpoint = Objects.requireNonNull(copyCheckpoint, "copyCheckpoint");
    }

    public void migrate(
            Connection source,
            Connection target,
            MetadataDatabaseKind targetKind,
            Duration timeout,
            MetadataMigrationProgressSink progress) {
        Objects.requireNonNull(source, "source");
        Objects.requireNonNull(target, "target");
        Objects.requireNonNull(progress, "progress");
        requireTargetKind(targetKind);
        MigrationDeadline deadline = new MigrationDeadline(timeout);
        MetadataMigrationErrorCode phase = MetadataMigrationErrorCode.SCHEMA;
        try (MetadataMigrationSession session = new MetadataMigrationSession(source, target)) {
            session.begin(targetKind);
            safeProgress(progress, MetadataMigrationStage.INSPECTING, 0);
            TargetSchemaBaseline baseline = TargetSchemaBaseline.load(targetKind);
            if (!new FlywaySchemaHistory(targetKind)
                    .isCurrent(target, baseline, deadline.remainingSeconds())) {
                throw new SQLException("Target baseline is absent", "55000");
            }
            MetadataSchemaInventory sourceSchema = MetadataSchemaInventory.capture(
                    source, baseline.expectedTables(), MetadataDatabaseKind.H2, deadline);
            MetadataSchemaInventory targetSchema = MetadataSchemaInventory.capture(
                    target, baseline.expectedTables(), targetKind, deadline);
            if (!sourceSchema.hasSamePortableShape(targetSchema)) {
                throw new SQLException("Source and target application schemas differ", "55000");
            }
            List<MetadataTableDescriptor> order = sourceSchema.foreignKeyOrder();
            lockTargetTables(target, order, targetKind, deadline);
            requireEmptyTarget(target, targetSchema, order, targetKind, deadline);

            phase = MetadataMigrationErrorCode.COPY;
            safeProgress(progress, MetadataMigrationStage.COPYING, 10);
            copyTables(source, target, targetSchema, order, targetKind, deadline, progress);

            phase = MetadataMigrationErrorCode.VERIFICATION;
            safeProgress(progress, MetadataMigrationStage.VERIFYING, 65);
            verifyTables(source, target, targetSchema, order, targetKind, deadline, progress);

            phase = MetadataMigrationErrorCode.SEQUENCE;
            safeProgress(progress, MetadataMigrationStage.REPAIRING, 90);
            repairIdentities(target, targetSchema, order, targetKind, deadline);
            deadline.check();
            session.commit();
        } catch (MetadataMigrationException exception) {
            MetadataMigrationException cleanupFailure = cleanupFailure(exception);
            if (cleanupFailure != null) {
                throw cleanupFailure;
            }
            throw exception;
        } catch (IOException | SQLException | RuntimeException exception) {
            MetadataMigrationException cleanupFailure = cleanupFailure(exception);
            if (cleanupFailure != null) {
                throw cleanupFailure;
            }
            throw new MetadataMigrationException(isTimeout(exception) ? MetadataMigrationErrorCode.TIMEOUT : phase);
        }
        safeProgress(progress, MetadataMigrationStage.COMPLETE, 100);
    }

    private void copyTables(
            Connection source,
            Connection target,
            MetadataSchemaInventory targetSchema,
            List<MetadataTableDescriptor> order,
            MetadataDatabaseKind targetKind,
            MigrationDeadline deadline,
            MetadataMigrationProgressSink progress) throws SQLException {
        for (int index = 0; index < order.size(); index++) {
            MetadataTableDescriptor sourceTable = order.get(index);
            copier.copy(
                    source,
                    target,
                    sourceTable,
                    targetSchema.table(sourceTable.name()),
                    targetKind,
                    deadline);
            copyCheckpoint.afterTable(sourceTable.name());
            safeProgress(progress, MetadataMigrationStage.COPYING, percentage(10, 60, index + 1, order.size()));
        }
    }

    private void verifyTables(
            Connection source,
            Connection target,
            MetadataSchemaInventory targetSchema,
            List<MetadataTableDescriptor> order,
            MetadataDatabaseKind targetKind,
            MigrationDeadline deadline,
            MetadataMigrationProgressSink progress) throws SQLException {
        for (int index = 0; index < order.size(); index++) {
            MetadataTableDescriptor sourceTable = order.get(index);
            CanonicalTableDigest.Digest sourceDigest = digests.digest(
                    source, sourceTable, sourceTable, MetadataDatabaseKind.H2, deadline);
            CanonicalTableDigest.Digest targetDigest = digests.digest(
                    target, targetSchema.table(sourceTable.name()), sourceTable, targetKind, deadline);
            if (!sourceDigest.equals(targetDigest)) {
                throw new SQLException("Copied metadata differs", "55000");
            }
            safeProgress(progress, MetadataMigrationStage.VERIFYING, percentage(65, 88, index + 1, order.size()));
        }
    }

    private void repairIdentities(
            Connection target,
            MetadataSchemaInventory targetSchema,
            List<MetadataTableDescriptor> order,
            MetadataDatabaseKind targetKind,
            MigrationDeadline deadline) throws SQLException {
        for (MetadataTableDescriptor sourceTable : order) {
            identities.repair(target, targetSchema.table(sourceTable.name()), targetKind, deadline);
        }
    }

    private static void requireEmptyTarget(
            Connection target,
            MetadataSchemaInventory targetSchema,
            List<MetadataTableDescriptor> order,
            MetadataDatabaseKind targetKind,
            MigrationDeadline deadline) throws SQLException {
        for (MetadataTableDescriptor sourceTable : order) {
            MetadataTableDescriptor targetTable = targetSchema.table(sourceTable.name());
            String sql = "SELECT 1 FROM " + CanonicalTableDigest.quote(targetTable.name(), targetKind);
            try (PreparedStatement statement = target.prepareStatement(sql)) {
                deadline.apply(statement);
                statement.setMaxRows(1);
                try (ResultSet rows = statement.executeQuery()) {
                    if (rows.next()) {
                        throw new SQLException("Target application tables are not empty", "55000");
                    }
                }
            }
        }
    }

    private static void lockTargetTables(
            Connection target,
            List<MetadataTableDescriptor> order,
            MetadataDatabaseKind targetKind,
            MigrationDeadline deadline) throws SQLException {
        if (targetKind != MetadataDatabaseKind.POSTGRESQL) {
            return;
        }
        String tables = order.stream()
                .map(MetadataTableDescriptor::name)
                .map(table -> CanonicalTableDigest.quote(table, targetKind))
                .collect(Collectors.joining(", "));
        try (Statement statement = target.createStatement()) {
            deadline.apply(statement);
            statement.execute("LOCK TABLE " + tables + " IN SHARE ROW EXCLUSIVE MODE");
        }
    }

    private static void safeProgress(
            MetadataMigrationProgressSink progress,
            MetadataMigrationStage stage,
            int percent) {
        try {
            progress.report(stage, percent);
        } catch (RuntimeException ignored) {
            // Observability must not influence transactional correctness.
        }
    }

    private static int percentage(int start, int end, int completed, int total) {
        return start + Math.floorDiv((end - start) * completed, total);
    }

    private static void requireTargetKind(MetadataDatabaseKind targetKind) {
        if (targetKind != MetadataDatabaseKind.MYSQL && targetKind != MetadataDatabaseKind.POSTGRESQL) {
            throw new MetadataMigrationException(MetadataMigrationErrorCode.SCHEMA);
        }
    }

    @FunctionalInterface
    interface CopyCheckpoint {

        CopyCheckpoint NO_OP = table -> { };

        void afterTable(String table) throws SQLException;
    }

    private static boolean isTimeout(Exception exception) {
        if (exception instanceof SQLTimeoutException) {
            return true;
        }
        if (exception instanceof SQLException sqlException) {
            return "57014".equals(sqlException.getSQLState())
                    || "HYT00".equals(sqlException.getSQLState())
                    || "HYT01".equals(sqlException.getSQLState());
        }
        return false;
    }

    static MetadataMigrationException cleanupFailure(Exception exception) {
        for (Throwable suppressed : exception.getSuppressed()) {
            if (suppressed instanceof MetadataMigrationException migrationException
                    && migrationException.code() == MetadataMigrationErrorCode.ROLLBACK_OUTCOME_UNKNOWN) {
                return migrationException;
            }
        }
        return null;
    }
}
