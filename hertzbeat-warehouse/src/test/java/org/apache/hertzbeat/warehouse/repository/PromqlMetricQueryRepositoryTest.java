/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.warehouse.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQuery;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQueryData;
import org.apache.hertzbeat.warehouse.db.QueryExecutor;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PromqlMetricQueryRepositoryTest {

    @Mock
    private QueryExecutor promqlQueryExecutor;

    @Test
    void hasPromqlExecutorReturnsFalseWhenNoSupportedExecutorPresent() {
        MetricQueryRepository repository = new PromqlMetricQueryRepository(List.of());

        assertFalse(repository.hasPromqlExecutor());
    }

    @Test
    void queryPromqlRangeUsesSupportedExecutor() {
        DatasourceQueryData queryData = new DatasourceQueryData("ref", 200, null, List.of());
        when(promqlQueryExecutor.support("promql")).thenReturn(true);
        when(promqlQueryExecutor.getDatasource()).thenReturn("Greptime-promql");
        when(promqlQueryExecutor.query(any(DatasourceQuery.class))).thenReturn(queryData);

        MetricQueryRepository repository = new PromqlMetricQueryRepository(List.of(promqlQueryExecutor));

        MetricQueryRepository.PromqlRangeQueryResult result =
                repository.queryPromqlRange("ref", "sum(rate(test_total[5m]))", 1000L, 2000L, "30s");

        assertTrue(repository.hasPromqlExecutor());
        assertNotNull(result);
        assertEquals("Greptime-promql", result.datasource());
        assertEquals(queryData, result.results());
        assertEquals(null, result.errorMessage());
        verify(promqlQueryExecutor).query(any(DatasourceQuery.class));
    }
}
