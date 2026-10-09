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

package org.apache.hertzbeat.collector.mysql.r2dbc;

import io.r2dbc.spi.Row;
import io.r2dbc.spi.RowMetadata;
import io.r2dbc.spi.Statement;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/**
 * Maps R2DBC results into the collector-neutral result model.
 */
public class ResultSetMapper {

    /**
     * Execute and map a single statement.
     *
     * @param statement statement to execute
     * @param timeout timeout for the query
     * @param maxRows max rows to materialize
     * @return normalized query result
     */
    public Mono<QueryResult> map(Statement statement, Duration timeout, int maxRows) {
        long startNanos = System.nanoTime();
        ResultAccumulator accumulator = new ResultAccumulator();
        return Flux.from(statement.execute())
                .concatMap(result -> Flux.from(result.map(accumulator::mapRow)))
                .take(maxRows)
                .collectList()
                .map(rows -> accumulator.toQueryResult(rows, elapsedMillis(startNanos)))
                .timeout(timeout);
    }

    private static long elapsedMillis(long startNanos) {
        return Duration.ofNanos(System.nanoTime() - startNanos).toMillis();
    }

    private static ColumnLayout extractColumns(RowMetadata metadata) {
        List<String> columns = new ArrayList<>();
        metadata.getColumnMetadatas().forEach(columnMetadata -> columns.add(columnMetadata.getName()));
        return new ColumnLayout(List.copyOf(columns), columns.size());
    }

    private static List<String> extractRow(Row row, int columnCount) {
        List<String> values = new ArrayList<>(columnCount);
        for (int index = 0; index < columnCount; index++) {
            Object value = row.get(index);
            values.add(value == null ? null : String.valueOf(value));
        }
        return values;
    }

    private record ColumnLayout(List<String> columns, int columnCount) {
    }

    private static final class ResultAccumulator {

        private ColumnLayout columnLayout;

        private List<String> mapRow(Row row, RowMetadata metadata) {
            if (columnLayout == null) {
                columnLayout = extractColumns(metadata);
            }
            return extractRow(row, columnLayout.columnCount());
        }

        private QueryResult toQueryResult(List<List<String>> rows, long elapsedMs) {
            return QueryResult.builder()
                    .columns(columnLayout == null ? List.of() : columnLayout.columns())
                    .rows(rows)
                    .rowCount(rows.size())
                    .elapsedMs(elapsedMs)
                    .build();
        }
    }
}
