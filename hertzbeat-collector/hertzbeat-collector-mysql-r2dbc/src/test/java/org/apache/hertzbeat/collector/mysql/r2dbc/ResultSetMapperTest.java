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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.r2dbc.spi.ColumnMetadata;
import io.r2dbc.spi.Result;
import io.r2dbc.spi.Row;
import io.r2dbc.spi.RowMetadata;
import io.r2dbc.spi.Statement;
import java.time.Duration;
import java.util.List;
import java.util.function.BiFunction;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Flux;

class ResultSetMapperTest {

    private final ResultSetMapper mapper = new ResultSetMapper();

    @Test
    @SuppressWarnings("unchecked")
    void shouldCacheColumnLayoutAcrossRows() {
        Statement statement = mock(Statement.class);
        Result result = mock(Result.class);
        RowMetadata metadata = mock(RowMetadata.class);
        Row firstRow = mock(Row.class);
        Row secondRow = mock(Row.class);
        ColumnMetadata firstColumn = mock(ColumnMetadata.class);
        ColumnMetadata secondColumn = mock(ColumnMetadata.class);

        when(firstColumn.getName()).thenReturn("id");
        when(secondColumn.getName()).thenReturn("label");
        doReturn(List.of(firstColumn, secondColumn)).when(metadata).getColumnMetadatas();
        when(firstRow.get(0)).thenReturn(1);
        when(firstRow.get(1)).thenReturn("alpha");
        when(secondRow.get(0)).thenReturn(2);
        when(secondRow.get(1)).thenReturn("beta");
        when(result.map(any(BiFunction.class))).thenAnswer(invocation -> {
            BiFunction<Row, RowMetadata, List<String>> mapping =
                    (BiFunction<Row, RowMetadata, List<String>>) invocation.getArgument(0);
            return Flux.just(
                    mapping.apply(firstRow, metadata),
                    mapping.apply(secondRow, metadata));
        });
        doReturn(Flux.just(result)).when(statement).execute();

        QueryResult queryResult = mapper.map(statement, Duration.ofSeconds(1), 10).block();

        assertNotNull(queryResult);
        assertEquals(List.of("id", "label"), queryResult.getColumns());
        assertEquals(List.of(
                List.of("1", "alpha"),
                List.of("2", "beta")), queryResult.getRows());
        assertEquals(2, queryResult.getRowCount());
        verify(metadata, times(1)).getColumnMetadatas();
    }
}
