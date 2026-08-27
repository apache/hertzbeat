/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.warehouse.store.history.tsdb.greptime;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.greptime.models.DataType;
import io.greptime.models.TableSchema;
import java.util.List;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.message.CollectRep;

/**
 * Bounded cache for immutable Greptime metric table schemas.
 */
final class GreptimeMetricSchemaCache {

    private static final long DEFAULT_MAXIMUM_SIZE = 1_024;

    private final Cache<String, CachedSchema> schemas;

    GreptimeMetricSchemaCache() {
        this(DEFAULT_MAXIMUM_SIZE);
    }

    GreptimeMetricSchemaCache(long maximumSize) {
        this.schemas = Caffeine.newBuilder()
                .maximumSize(maximumSize)
                .build();
    }

    TableSchema getOrCreate(String tableName, List<CollectRep.Field> fields) {
        CachedSchema cached = schemas.getIfPresent(tableName);
        if (cached != null && cached.matches(fields)) {
            return cached.schema();
        }
        CachedSchema resolved = schemas.asMap().compute(tableName, (key, current) -> {
            if (current != null && current.matches(fields)) {
                return current;
            }
            return createSchema(key, fields);
        });
        return resolved.schema();
    }

    private static CachedSchema createSchema(String tableName, List<CollectRep.Field> fields) {
        List<MetricColumn> columns = fields.stream()
                .map(MetricColumn::from)
                .toList();
        TableSchema.Builder builder = TableSchema.newBuilder(tableName)
                .addTag("instance", DataType.String)
                .addTimestamp("ts", DataType.TimestampMillisecond);
        for (MetricColumn column : columns) {
            if (column.label()) {
                builder.addTag(column.name(), DataType.String);
            } else if (column.type() == CommonConstants.TYPE_NUMBER) {
                builder.addField(column.name(), DataType.Float64);
            } else if (column.type() == CommonConstants.TYPE_STRING) {
                builder.addField(column.name(), DataType.String);
            }
        }
        return new CachedSchema(columns, builder.build());
    }

    private record CachedSchema(List<MetricColumn> columns, TableSchema schema) {

        private boolean matches(List<CollectRep.Field> fields) {
            if (columns.size() != fields.size()) {
                return false;
            }
            for (int index = 0; index < fields.size(); index++) {
                if (!columns.get(index).matches(fields.get(index))) {
                    return false;
                }
            }
            return true;
        }
    }

    private record MetricColumn(String name, int type, boolean label) {

        private static MetricColumn from(CollectRep.Field field) {
            return new MetricColumn(field.getName(), field.getType(), field.getLabel());
        }

        private boolean matches(CollectRep.Field field) {
            return name.equals(field.getName())
                    && type == field.getType()
                    && label == field.getLabel();
        }
    }
}
