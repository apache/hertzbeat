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
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.metric.NativeMetricSystemDimensions;
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
        return resolve(tableName, fields).schema();
    }

    ResolvedSchema resolve(String tableName, List<CollectRep.Field> fields) {
        List<IndexedMetricColumn> accepted = new ArrayList<>(fields.size());
        List<String> rejectedNames = new ArrayList<>();
        for (int index = 0; index < fields.size(); index++) {
            CollectRep.Field field = fields.get(index);
            if (field == null) {
                continue;
            }
            if (NativeMetricSystemDimensions.isReserved(field.getName())) {
                rejectedNames.add(field.getName());
                continue;
            }
            if (!isSupported(field)) {
                continue;
            }
            accepted.add(new IndexedMetricColumn(index, MetricColumn.from(field)));
        }
        List<MetricColumn> columns = accepted.stream().map(IndexedMetricColumn::column).toList();
        CachedSchema cached = schemas.getIfPresent(tableName);
        if (cached != null && cached.matches(columns)) {
            return resolved(cached.schema(), accepted, rejectedNames, false);
        }
        AtomicBoolean schemaChanged = new AtomicBoolean();
        CachedSchema resolved = schemas.asMap().compute(tableName, (key, current) -> {
            if (current != null && current.matches(columns)) {
                return current;
            }
            schemaChanged.set(true);
            return createSchema(key, columns);
        });
        return resolved(resolved.schema(), accepted, rejectedNames, schemaChanged.get());
    }

    private static ResolvedSchema resolved(TableSchema schema, List<IndexedMetricColumn> columns,
                                           List<String> rejectedNames, boolean schemaChanged) {
        return new ResolvedSchema(schema, columns.stream().map(IndexedMetricColumn::sourceIndex).toList(),
                List.copyOf(rejectedNames), schemaChanged);
    }

    private static CachedSchema createSchema(String tableName, List<MetricColumn> columns) {
        TableSchema.Builder builder = TableSchema.newBuilder(tableName);
        NativeMetricSystemDimensions.TAG_NAMES.forEach(name -> builder.addTag(name, DataType.String));
        builder.addTimestamp(NativeMetricSystemDimensions.TIMESTAMP, DataType.TimestampMillisecond);
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

    private static boolean isSupported(CollectRep.Field field) {
        return field.getLabel()
                || field.getType() == CommonConstants.TYPE_NUMBER
                || field.getType() == CommonConstants.TYPE_STRING;
    }

    private record CachedSchema(List<MetricColumn> columns, TableSchema schema) {

        private boolean matches(List<MetricColumn> candidateColumns) {
            return columns.equals(candidateColumns);
        }
    }

    record ResolvedSchema(TableSchema schema, List<Integer> sourceIndexes, List<String> rejectedNames,
                          boolean schemaChanged) {
    }

    private record IndexedMetricColumn(int sourceIndex, MetricColumn column) {
    }

    private record MetricColumn(String name, int type, boolean label) {

        private static MetricColumn from(CollectRep.Field field) {
            return new MetricColumn(field.getName(), field.getType(), field.getLabel());
        }
    }
}
