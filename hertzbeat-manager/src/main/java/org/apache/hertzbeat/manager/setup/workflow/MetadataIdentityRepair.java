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
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Repairs and proves vendor identity generators after explicit identifier insertion. */
final class MetadataIdentityRepair {

    void repair(
            Connection target,
            MetadataTableDescriptor table,
            MetadataDatabaseKind kind,
            MigrationDeadline deadline) throws SQLException {
        for (MetadataTableDescriptor.Column column : table.identityColumns()) {
            Long maximum = maximum(target, table, column, kind, deadline);
            if (maximum == null) {
                continue;
            }
            if (kind == MetadataDatabaseKind.POSTGRESQL) {
                repairPostgresql(target, table, column, maximum, deadline);
            } else if (kind == MetadataDatabaseKind.MYSQL) {
                verifyMysql(target, table, maximum, deadline);
            } else {
                throw new SQLException("Unsupported identity target", "55000");
            }
        }
    }

    private static Long maximum(
            Connection connection,
            MetadataTableDescriptor table,
            MetadataTableDescriptor.Column column,
            MetadataDatabaseKind kind,
            MigrationDeadline deadline) throws SQLException {
        String sql = "SELECT MAX(" + CanonicalTableDigest.quote(column.name(), kind) + ") FROM "
                + CanonicalTableDigest.quote(table.name(), kind);
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            deadline.apply(statement);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) {
                    throw new SQLException("Identity maximum is unavailable", "55000");
                }
                long maximum = result.getLong(1);
                return result.wasNull() ? null : maximum;
            }
        }
    }

    private static void repairPostgresql(
            Connection connection,
            MetadataTableDescriptor table,
            MetadataTableDescriptor.Column column,
            long maximum,
            MigrationDeadline deadline) throws SQLException {
        String sequence;
        try (PreparedStatement statement = connection.prepareStatement("SELECT pg_get_serial_sequence(?, ?)")) {
            deadline.apply(statement);
            statement.setString(1, table.name());
            statement.setString(2, column.name());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next() || (sequence = result.getString(1)) == null) {
                    throw new SQLException("Identity sequence is unavailable", "55000");
                }
            }
        }
        try (PreparedStatement statement =
                connection.prepareStatement("SELECT setval(CAST(? AS regclass), ?, true)")) {
            deadline.apply(statement);
            statement.setString(1, sequence);
            statement.setLong(2, maximum);
            statement.executeQuery().close();
        }
        try (PreparedStatement statement =
                connection.prepareStatement("SELECT nextval(CAST(? AS regclass))")) {
            deadline.apply(statement);
            statement.setString(1, sequence);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next() || result.getLong(1) <= maximum) {
                    throw new SQLException("Identity sequence did not advance", "55000");
                }
            }
        }
        try (PreparedStatement statement =
                connection.prepareStatement("SELECT setval(CAST(? AS regclass), ?, true)")) {
            deadline.apply(statement);
            statement.setString(1, sequence);
            statement.setLong(2, maximum);
            statement.executeQuery().close();
        }
    }

    private static void verifyMysql(
            Connection connection,
            MetadataTableDescriptor table,
            long maximum,
            MigrationDeadline deadline) throws SQLException {
        String sql = "SELECT AUTO_INCREMENT FROM information_schema.tables "
                + "WHERE table_schema = DATABASE() AND table_name = ?";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            deadline.apply(statement);
            statement.setString(1, table.name());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next() || result.getLong(1) <= maximum || result.wasNull()) {
                    throw new SQLException("Identity counter did not advance", "55000");
                }
            }
        }
    }
}
