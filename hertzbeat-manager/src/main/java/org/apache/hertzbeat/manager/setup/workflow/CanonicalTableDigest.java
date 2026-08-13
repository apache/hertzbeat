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

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HexFormat;
import java.util.Objects;
import java.util.StringJoiner;
import java.util.stream.Collectors;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Computes a typed, length-framed SHA-256 digest in canonical primary-key order and bounded memory. */
final class CanonicalTableDigest {

    private final MetadataJdbcValueAdapter values;

    CanonicalTableDigest(MetadataJdbcValueAdapter values) {
        this.values = values;
    }

    Digest digest(
            Connection connection,
            MetadataTableDescriptor actual,
            MetadataTableDescriptor logical,
            MetadataDatabaseKind kind,
            MigrationDeadline deadline) throws SQLException {
        MessageDigest tableDigest = sha256();
        long rowCount = 0;
        String sql = selectSql(actual, logical, kind);
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            deadline.apply(statement);
            statement.setFetchSize(128);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    deadline.check();
                    rowCount++;
                    for (int index = 0; index < logical.columns().size(); index++) {
                        MetadataTableDescriptor.Column logicalColumn = logical.columns().get(index);
                        MetadataTableDescriptor.Column actualColumn = actual.column(logicalColumn.name());
                        Object value = values.read(rows, index + 1, actual.name(), actualColumn, kind);
                        byte[] frame = CanonicalValueEncoder.encode(
                                logical.name(), logicalColumn, actualColumn, value, kind);
                        tableDigest.update(frame);
                    }
                }
            }
        }
        return new Digest(rowCount, tableDigest.digest());
    }

    private String selectSql(
            MetadataTableDescriptor table,
            MetadataTableDescriptor logical,
            MetadataDatabaseKind kind) {
        StringJoiner columns = new StringJoiner(", ");
        for (MetadataTableDescriptor.Column logicalColumn : logical.columns()) {
            MetadataTableDescriptor.Column column = table.column(logicalColumn.name());
            String quoted = quote(column.name(), kind);
            columns.add(values.selectExpression(quoted, table.name(), column, kind));
        }
        String order = table.primaryKey().stream()
                .map(primaryKey -> table.columns().stream()
                        .filter(column -> column.name().equals(primaryKey))
                        .findFirst()
                        .orElseThrow())
                .map(column -> orderExpression(column, kind))
                .collect(Collectors.joining(", "));
        return "SELECT " + columns + " FROM " + quote(table.name(), kind) + " ORDER BY " + order;
    }

    private static String orderExpression(
            MetadataTableDescriptor.Column column,
            MetadataDatabaseKind kind) {
        String quoted = quote(column.name(), kind);
        if (!CanonicalValueEncoder.isCharacter(column)) {
            return quoted;
        }
        return switch (kind) {
            case H2 -> "CAST(" + quoted + " AS VARBINARY)";
            case MYSQL -> "BINARY " + quoted;
            case POSTGRESQL -> "convert_to(" + quoted + ", 'UTF8')";
        };
    }

    private static MessageDigest sha256() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable");
        }
    }

    static String quote(String identifier, MetadataDatabaseKind kind) {
        return kind == MetadataDatabaseKind.MYSQL ? '`' + identifier + '`' : '"' + identifier + '"';
    }

    static final class Digest {

        private final long rowCount;
        private final byte[] checksum;

        Digest(long rowCount, byte[] checksum) {
            this.rowCount = rowCount;
            this.checksum = checksum.clone();
        }

        @Override
        public boolean equals(Object other) {
            if (!(other instanceof Digest that)) {
                return false;
            }
            return rowCount == that.rowCount && MessageDigest.isEqual(checksum, that.checksum);
        }

        @Override
        public int hashCode() {
            return Objects.hash(rowCount, HexFormat.of().formatHex(checksum));
        }
    }

}
