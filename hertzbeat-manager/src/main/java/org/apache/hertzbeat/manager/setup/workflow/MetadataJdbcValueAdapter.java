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
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.sql.Blob;
import java.sql.Clob;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.SQLXML;
import java.sql.Types;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.Set;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Materializes JDBC values and adapts the three PostgreSQL large-object text columns. */
final class MetadataJdbcValueAdapter {

    private static final Set<String> POSTGRESQL_OID_TEXT = Set.of(
            "hzb_ai_message.content", "hzb_define.content", "hzb_notice_template.content");

    Object read(
            ResultSet rows,
            int index,
            String table,
            MetadataTableDescriptor.Column column,
            MetadataDatabaseKind kind) throws SQLException {
        Object value = rows.getObject(index);
        if (value == null) {
            return null;
        }
        if (isPostgresqlOidText(kind, table, column.name()) && value instanceof byte[] bytes) {
            return new String(bytes, StandardCharsets.UTF_8);
        }
        if (value instanceof Clob clob) {
            return readClob(clob);
        }
        if (value instanceof Blob blob) {
            return blob.getBytes(1, Math.toIntExact(blob.length()));
        }
        if (value instanceof SQLXML xml) {
            return xml.getString();
        }
        return value;
    }

    void bind(
            PreparedStatement statement,
            int index,
            Object value,
            String table,
            MetadataTableDescriptor.Column targetColumn,
            MetadataDatabaseKind targetKind) throws SQLException {
        if (isPostgresqlOidText(targetKind, table, targetColumn.name())) {
            if (value == null) {
                statement.setNull(index, Types.BINARY);
            } else {
                statement.setBytes(index, value.toString().getBytes(StandardCharsets.UTF_8));
            }
        } else if (value == null) {
            statement.setNull(index, targetColumn.jdbcType());
        } else if (value instanceof byte[] bytes) {
            statement.setBytes(index, bytes);
        } else if (value instanceof OffsetDateTime timestamp) {
            bindOffsetTimestamp(statement, index, timestamp, targetColumn, targetKind);
        } else if (value instanceof ZonedDateTime timestamp) {
            bindOffsetTimestamp(statement, index, timestamp.toOffsetDateTime(), targetColumn, targetKind);
        } else {
            statement.setObject(index, value);
        }
    }

    String selectExpression(
            String quotedColumn,
            String table,
            MetadataTableDescriptor.Column column,
            MetadataDatabaseKind kind) {
        return isPostgresqlOidText(kind, table, column.name())
                ? "lo_get(" + quotedColumn + ")"
                : quotedColumn;
    }

    String insertExpression(
            String table,
            MetadataTableDescriptor.Column column,
            MetadataDatabaseKind kind) {
        return isPostgresqlOidText(kind, table, column.name()) ? "lo_from_bytea(0, ?)" : "?";
    }

    private static boolean isPostgresqlOidText(
            MetadataDatabaseKind kind,
            String table,
            String column) {
        return kind == MetadataDatabaseKind.POSTGRESQL && POSTGRESQL_OID_TEXT.contains(table + '.' + column);
    }

    private static void bindOffsetTimestamp(
            PreparedStatement statement,
            int index,
            OffsetDateTime value,
            MetadataTableDescriptor.Column targetColumn,
            MetadataDatabaseKind targetKind) throws SQLException {
        OffsetDateTime utc = value.withOffsetSameInstant(ZoneOffset.UTC);
        if (targetKind == MetadataDatabaseKind.MYSQL || !targetColumn.timestampWithTimeZone()) {
            statement.setObject(index, utc.toLocalDateTime());
        } else {
            statement.setObject(index, utc);
        }
    }

    private static String readClob(Clob clob) throws SQLException {
        try (Reader reader = clob.getCharacterStream()) {
            StringBuilder value = new StringBuilder();
            char[] buffer = new char[4096];
            int count;
            while ((count = reader.read(buffer)) >= 0) {
                value.append(buffer, 0, count);
            }
            return value.toString();
        } catch (IOException exception) {
            throw new SQLException("Cannot materialize large text", "58000");
        }
    }
}
