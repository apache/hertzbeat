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

import java.sql.Types;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Immutable JDBC schema descriptor for one application table. */
record MetadataTableDescriptor(
        String name,
        List<Column> columns,
        List<String> primaryKey,
        List<ForeignKey> foreignKeys) {

    MetadataTableDescriptor {
        name = normalized(name);
        columns = List.copyOf(columns);
        primaryKey = primaryKey.stream().map(MetadataTableDescriptor::normalized).toList();
        foreignKeys = List.copyOf(foreignKeys);
    }

    boolean hasSamePortableShape(
            MetadataTableDescriptor other,
            MetadataDatabaseKind kind,
            MetadataDatabaseKind otherKind) {
        return name.equals(other.name)
                && columns.size() == other.columns.size()
                && columns.stream().allMatch(column -> column.hasSameSemantics(
                        other.column(column.name()), kind, otherKind, name))
                && primaryKey.equals(other.primaryKey)
                && foreignKeys.equals(other.foreignKeys);
    }

    Column column(String columnName) {
        return columns.stream()
                .filter(column -> column.name().equals(columnName))
                .findFirst()
                .orElse(null);
    }

    List<Column> identityColumns() {
        return columns.stream().filter(Column::autoIncrement).toList();
    }

    private static String normalized(String value) {
        return Objects.requireNonNull(value, "identifier").toLowerCase(Locale.ROOT);
    }

    record Column(
            String name,
            int jdbcType,
            String typeName,
            int size,
            int scale,
            boolean nullable,
            boolean autoIncrement) {

        Column {
            name = normalized(name);
            typeName = Objects.requireNonNullElse(typeName, "").toLowerCase(Locale.ROOT);
        }

        boolean hasSameSemantics(
                Column other,
                MetadataDatabaseKind kind,
                MetadataDatabaseKind otherKind,
                String table) {
            if (other == null || !name.equals(other.name) || autoIncrement != other.autoIncrement) {
                return false;
            }
            String type = semanticType(kind, table);
            String otherType = other.semanticType(otherKind, table);
            return other != null
                    && (type.equals(otherType)
                    || booleanIntegerCompatibility(type, otherType)
                    || textCompatibility(type, otherType));
        }

        private static boolean booleanIntegerCompatibility(String type, String otherType) {
            return Set.of(type, otherType).equals(Set.of("boolean", "small-integer"));
        }

        private static boolean textCompatibility(String type, String otherType) {
            return Set.of(type, otherType).equals(Set.of("character", "large-text"));
        }

        String semanticType(
                MetadataDatabaseKind kind,
                String table) {
            if (kind == MetadataDatabaseKind.POSTGRESQL
                    && typeName.equals("oid") && name.equals("content")
                    && Set.of("hzb_ai_message", "hzb_define", "hzb_notice_template").contains(table)) {
                return "large-text";
            }
            if ((jdbcType == Types.VARCHAR || jdbcType == Types.NVARCHAR) && size >= 1_000_000) {
                return "large-text";
            }
            if (typeName.startsWith("enum")) {
                return "character";
            }
            return switch (jdbcType) {
                case Types.BOOLEAN -> "boolean";
                case Types.BIT -> size == 1 ? "boolean" : "binary-bit(" + size + ')';
                case Types.TINYINT -> kind == MetadataDatabaseKind.MYSQL
                                && size == 1 ? "boolean" : "small-integer";
                case Types.SMALLINT -> "small-integer";
                case Types.INTEGER -> "integer";
                case Types.BIGINT -> "bigint";
                case Types.NUMERIC, Types.DECIMAL -> "decimal(" + size + ',' + scale + ')';
                case Types.REAL, Types.FLOAT, Types.DOUBLE -> "floating";
                case Types.CHAR, Types.NCHAR, Types.VARCHAR, Types.NVARCHAR -> "character";
                case Types.LONGVARCHAR, Types.LONGNVARCHAR, Types.CLOB, Types.NCLOB -> "large-text";
                case Types.BINARY, Types.VARBINARY -> "binary";
                case Types.LONGVARBINARY, Types.BLOB -> "large-binary";
                case Types.DATE -> "date";
                case Types.TIME, Types.TIME_WITH_TIMEZONE -> "time";
                case Types.TIMESTAMP, Types.TIMESTAMP_WITH_TIMEZONE -> "timestamp";
                default -> "jdbc-type(" + jdbcType + ')';
            };
        }

        boolean timestampWithTimeZone() {
            return jdbcType == Types.TIMESTAMP_WITH_TIMEZONE
                    || typeName.equals("timestamptz")
                    || typeName.contains("timestamp with time zone");
        }
    }

    record ForeignKey(List<String> columns, String referencedTable, List<String> referencedColumns) {

        ForeignKey {
            columns = columns.stream().map(MetadataTableDescriptor::normalized).toList();
            referencedTable = normalized(referencedTable);
            referencedColumns = referencedColumns.stream().map(MetadataTableDescriptor::normalized).toList();
        }
    }
}
