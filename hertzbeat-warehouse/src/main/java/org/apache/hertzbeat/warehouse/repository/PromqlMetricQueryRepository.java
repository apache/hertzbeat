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

import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQuery;
import org.apache.hertzbeat.common.entity.dto.query.DatasourceQueryData;
import org.apache.hertzbeat.warehouse.constants.WarehouseConstants;
import org.apache.hertzbeat.warehouse.db.QueryExecutor;
import org.springframework.stereotype.Repository;

/**
 * Repository for promql-backed metric queries.
 */
@Repository
@RequiredArgsConstructor
public class PromqlMetricQueryRepository implements MetricQueryRepository {

    private final List<QueryExecutor> queryExecutors;

    @Override
    public boolean hasPromqlExecutor() {
        return resolvePromqlExecutor() != null;
    }

    @Override
    public PromqlRangeQueryResult queryPromqlRange(String refId, String query, long start, long end, String step) {
        QueryExecutor queryExecutor = resolvePromqlExecutor();
        if (queryExecutor == null) {
            return new PromqlRangeQueryResult(null, null, null);
        }
        DatasourceQuery datasourceQuery = DatasourceQuery.builder()
                .refId(refId)
                .datasource(queryExecutor.getDatasource())
                .expr(query)
                .exprType(WarehouseConstants.PROMQL)
                .timeType(WarehouseConstants.RANGE)
                .start(start)
                .end(end)
                .step(step)
                .build();
        try {
            DatasourceQueryData results = queryExecutor.query(datasourceQuery);
            return new PromqlRangeQueryResult(queryExecutor.getDatasource(), results, null);
        } catch (Exception ex) {
            return new PromqlRangeQueryResult(queryExecutor.getDatasource(), null, ex.getMessage());
        }
    }

    private QueryExecutor resolvePromqlExecutor() {
        if (queryExecutors == null || queryExecutors.isEmpty()) {
            return null;
        }
        return queryExecutors.stream()
                .filter(Objects::nonNull)
                .filter(executor -> executor.support(WarehouseConstants.PROMQL))
                .findFirst()
                .orElse(null);
    }
}
