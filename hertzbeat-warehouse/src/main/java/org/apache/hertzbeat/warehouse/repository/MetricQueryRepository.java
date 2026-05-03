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

import org.apache.hertzbeat.common.entity.dto.query.DatasourceQueryData;

/**
 * Repository for metric query execution.
 */
public interface MetricQueryRepository {

    /**
     * Whether a promql-capable metric query executor exists.
     *
     * @return true if promql query is available
     */
    boolean hasPromqlExecutor();

    /**
     * Execute a promql range query.
     *
     * @param refId query ref id
     * @param query promql expression
     * @param start range start millis
     * @param end range end millis
     * @param step range step
     * @return datasource and query result
     */
    PromqlRangeQueryResult queryPromqlRange(String refId, String query, long start, long end, String step);

    /**
     * Promql query result wrapper.
     *
     * @param datasource datasource name
     * @param results datasource query result
     * @param errorMessage query error message
     */
    record PromqlRangeQueryResult(
            String datasource,
            DatasourceQueryData results,
            String errorMessage
    ) {
    }
}
