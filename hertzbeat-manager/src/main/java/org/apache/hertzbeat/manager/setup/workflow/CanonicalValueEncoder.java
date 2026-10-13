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

import java.math.BigDecimal;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.sql.Date;
import java.sql.Time;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAccessor;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Encodes one logical JDBC value into a typed, length-framed canonical byte sequence. */
final class CanonicalValueEncoder {

    private CanonicalValueEncoder() {
    }

    static byte[] encode(
            String table,
            MetadataTableDescriptor.Column logicalColumn,
            MetadataTableDescriptor.Column actualColumn,
            Object value,
            MetadataDatabaseKind actualKind) {
        if (value == null) {
            return frame((byte) 0, new byte[0]);
        }
        if (logicalColumn.semanticType(MetadataDatabaseKind.H2, table).equals("boolean")) {
            return frame((byte) 2, new byte[]{booleanValue(value) ? (byte) 1 : (byte) 0});
        }
        if (logicalColumn.timestampWithTimeZone()) {
            Instant instant = instant(value, actualColumn, actualKind).truncatedTo(ChronoUnit.MICROS);
            return frame((byte) 7, utf8(instant.toString()));
        }
        if (logicalColumn.semanticType(MetadataDatabaseKind.H2, table).equals("timestamp")) {
            LocalDateTime timestamp = localTimestamp(value).truncatedTo(ChronoUnit.MICROS);
            return frame((byte) 7, utf8(timestamp.toString()));
        }
        if (value instanceof byte[] bytes) {
            return frame((byte) 1, bytes);
        } else if (value instanceof Boolean bool) {
            return frame((byte) 2, new byte[]{bool ? (byte) 1 : (byte) 0});
        } else if (value instanceof BigDecimal decimal) {
            return frame((byte) 3, utf8(decimal.toPlainString()));
        } else if (value instanceof Byte || value instanceof Short
                || value instanceof Integer || value instanceof Long) {
            return frame((byte) 4, utf8(value.toString()));
        } else if (value instanceof Float number) {
            return frame((byte) 5, utf8(Float.toHexString(number)));
        } else if (value instanceof Double number) {
            return frame((byte) 6, utf8(Double.toHexString(number)));
        } else if (value instanceof Date || value instanceof Time || value instanceof TemporalAccessor) {
            return frame((byte) 8, utf8(value.toString()));
        }
        return frame(isCharacter(logicalColumn) ? (byte) 9 : (byte) 10,
                utf8(value.toString()));
    }

    static boolean isCharacter(MetadataTableDescriptor.Column column) {
        return switch (column.jdbcType()) {
            case Types.CHAR, Types.VARCHAR, Types.LONGVARCHAR,
                    Types.NCHAR, Types.NVARCHAR, Types.LONGNVARCHAR,
                    Types.CLOB, Types.NCLOB -> true;
            default -> false;
        };
    }

    private static Instant instant(
            Object value,
            MetadataTableDescriptor.Column actualColumn,
            MetadataDatabaseKind actualKind) {
        if (value instanceof OffsetDateTime timestamp) {
            return timestamp.toInstant();
        }
        if (value instanceof ZonedDateTime timestamp) {
            return timestamp.toInstant();
        }
        if (value instanceof Instant instant) {
            return instant;
        }
        if (value instanceof Timestamp timestamp) {
            return actualKind == MetadataDatabaseKind.MYSQL || !actualColumn.timestampWithTimeZone()
                    ? timestamp.toLocalDateTime().toInstant(ZoneOffset.UTC)
                    : timestamp.toInstant();
        }
        if (value instanceof LocalDateTime timestamp) {
            return timestamp.toInstant(ZoneOffset.UTC);
        }
        throw new MetadataMigrationException(MetadataMigrationErrorCode.VERIFICATION);
    }

    private static boolean booleanValue(Object value) {
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value instanceof Number number) {
            return number.longValue() != 0;
        }
        if (value instanceof byte[] bytes) {
            return bytes.length > 0 && bytes[0] != 0;
        }
        return Boolean.parseBoolean(value.toString());
    }

    private static LocalDateTime localTimestamp(Object value) {
        if (value instanceof LocalDateTime timestamp) {
            return timestamp;
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toLocalDateTime();
        }
        if (value instanceof OffsetDateTime timestamp) {
            return timestamp.withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime();
        }
        if (value instanceof ZonedDateTime timestamp) {
            return timestamp.withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime();
        }
        throw new MetadataMigrationException(MetadataMigrationErrorCode.VERIFICATION);
    }

    private static byte[] frame(byte type, byte[] value) {
        ByteBuffer frame = ByteBuffer.allocate(1 + Integer.BYTES + value.length);
        frame.put(type);
        frame.putInt(value.length);
        frame.put(value);
        return frame.array();
    }

    private static byte[] utf8(String value) {
        return value.getBytes(StandardCharsets.UTF_8);
    }
}
