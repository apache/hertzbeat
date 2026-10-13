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
import java.util.StringJoiner;
import java.util.stream.Collectors;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Copies one table with explicit columns and primary-key-stable source reads. */
final class MetadataRowCopier {

    private static final int BATCH_SIZE = 128;
    private final MetadataJdbcValueAdapter values;

    MetadataRowCopier(MetadataJdbcValueAdapter values) {
        this.values = values;
    }

    void copy(
            Connection source,
            Connection target,
            MetadataTableDescriptor sourceTable,
            MetadataTableDescriptor targetTable,
            MetadataDatabaseKind targetKind,
            MigrationDeadline deadline) throws SQLException {
        String sourceSql = sourceSelect(sourceTable);
        String targetSql = targetInsert(sourceTable, targetTable, targetKind);
        try (PreparedStatement reader = source.prepareStatement(sourceSql);
                PreparedStatement writer = target.prepareStatement(targetSql)) {
            deadline.apply(reader);
            deadline.apply(writer);
            reader.setFetchSize(BATCH_SIZE);
            try (ResultSet rows = reader.executeQuery()) {
                int pending = 0;
                while (rows.next()) {
                    deadline.check();
                    for (int index = 0; index < sourceTable.columns().size(); index++) {
                        MetadataTableDescriptor.Column sourceColumn = sourceTable.columns().get(index);
                        Object value = values.read(
                                rows, index + 1, sourceTable.name(), sourceColumn, MetadataDatabaseKind.H2);
                        values.bind(
                                writer,
                                index + 1,
                                value,
                                targetTable.name(),
                                targetTable.column(sourceColumn.name()),
                                targetKind);
                    }
                    writer.addBatch();
                    pending++;
                    if (pending == BATCH_SIZE) {
                        writer.executeBatch();
                        pending = 0;
                    }
                }
                if (pending > 0) {
                    writer.executeBatch();
                }
            }
        }
    }

    private static String sourceSelect(MetadataTableDescriptor table) {
        String columns = table.columns().stream()
                .map(MetadataTableDescriptor.Column::name)
                .map(column -> CanonicalTableDigest.quote(column, MetadataDatabaseKind.H2))
                .collect(Collectors.joining(", "));
        String order = table.primaryKey().stream()
                .map(column -> CanonicalTableDigest.quote(column, MetadataDatabaseKind.H2))
                .collect(Collectors.joining(", "));
        return "SELECT " + columns + " FROM "
                + CanonicalTableDigest.quote(table.name(), MetadataDatabaseKind.H2) + " ORDER BY " + order;
    }

    private String targetInsert(
            MetadataTableDescriptor sourceTable,
            MetadataTableDescriptor targetTable,
            MetadataDatabaseKind kind) {
        String columns = sourceTable.columns().stream()
                .map(MetadataTableDescriptor.Column::name)
                .map(column -> CanonicalTableDigest.quote(column, kind))
                .collect(Collectors.joining(", "));
        StringJoiner expressions = new StringJoiner(", ");
        sourceTable.columns().stream()
                .map(column -> targetTable.column(column.name()))
                .forEach(column -> expressions.add(values.insertExpression(targetTable.name(), column, kind)));
        return "INSERT INTO " + CanonicalTableDigest.quote(targetTable.name(), kind)
                + " (" + columns + ") VALUES (" + expressions + ')';
    }
}
