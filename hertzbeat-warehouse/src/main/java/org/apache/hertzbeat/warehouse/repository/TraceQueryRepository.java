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

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Repository for raw trace row queries.
 */
public interface TraceQueryRepository {

    /**
     * Query recent trace rows.
     *
     * @param limit row limit
     * @return raw trace rows
     */
    List<Map<String, Object>> queryRecentTraceRows(int limit);

    /**
     * Query recent trace rows with optional list-view filters.
     *
     * @param limit row limit
     * @param serviceName service name filter
     * @param hideInternal whether internal HertzBeat traces should be hidden
     * @return raw trace rows
     */
    default List<Map<String, Object>> queryRecentTraceRows(int limit, String serviceName, Boolean hideInternal) {
        return queryRecentTraceRows(limit);
    }

    /**
     * Query recent trace rows with optional list-view and time-window filters.
     *
     * @param limit row limit
     * @param start start time in epoch milliseconds
     * @param end end time in epoch milliseconds
     * @param serviceName service name filter
     * @param environment deployment environment filter
     * @param hideInternal whether internal HertzBeat traces should be hidden
     * @return raw trace rows
     */
    default List<Map<String, Object>> queryRecentTraceRows(int limit,
                                                           Long start,
                                                           Long end,
                                                           String serviceName,
                                                           String environment,
                                                           Boolean hideInternal) {
        return queryRecentTraceRows(limit, serviceName, hideInternal);
    }

    /**
     * Query recent trace rows with storage-owned workspace and entity scope filters.
     *
     * @param limit row limit
     * @param start start time in epoch milliseconds
     * @param end end time in epoch milliseconds
     * @param serviceName service name filter
     * @param serviceNamespace service namespace filter
     * @param environment deployment environment filter
     * @param workspaceId workspace id filter
     * @param resourceIdentityFilters canonical resource identity filters
     * @param hideInternal whether internal HertzBeat traces should be hidden
     * @return raw trace rows
     */
    default List<Map<String, Object>> queryRecentTraceRows(int limit,
                                                           Long start,
                                                           Long end,
                                                           String serviceName,
                                                           String serviceNamespace,
                                                           String environment,
                                                           String workspaceId,
                                                           Map<String, Set<String>> resourceIdentityFilters,
                                                           Boolean hideInternal) {
        return queryRecentTraceRows(limit, start, end, serviceName, environment, hideInternal);
    }

    /**
     * Whether this repository can query trace-list rows with storage-owned grouping and pagination.
     *
     * @return true when storage-owned trace list rows are supported
     */
    default boolean supportsTraceListRows() {
        return false;
    }

    /**
     * Query trace-list rows grouped and paged by the storage layer.
     *
     * @param start start time in epoch milliseconds
     * @param end end time in epoch milliseconds
     * @param errorOnly whether only error traces should be returned
     * @param serviceName service name filter
     * @param serviceNamespace service namespace filter
     * @param environment deployment environment filter
     * @param workspaceId workspace id filter
     * @param resourceIdentityFilters canonical resource identity filters
     * @param hideInternal whether internal HertzBeat traces should be hidden
     * @param offset pagination offset
     * @param limit page size
     * @return trace-list rows with optional total_count
     */
    default List<Map<String, Object>> queryTraceListRows(Long start,
                                                         Long end,
                                                         Boolean errorOnly,
                                                         String serviceName,
                                                         String serviceNamespace,
                                                         String environment,
                                                         String workspaceId,
                                                         Map<String, Set<String>> resourceIdentityFilters,
                                                         Boolean hideInternal,
                                                         int offset,
                                                         int limit) {
        return List.of();
    }

    /**
     * Query service-to-service trace call graph rows with RED metrics aggregated by the storage layer.
     *
     * @param limit row limit
     * @param start start time in epoch milliseconds
     * @param end end time in epoch milliseconds
     * @param environment deployment environment filter
     * @param hideInternal whether internal HertzBeat traces should be hidden
     * @return service graph rows
     */
    default List<Map<String, Object>> queryTraceServiceGraphRows(int limit,
                                                                 Long start,
                                                                 Long end,
                                                                 String environment,
                                                                 Boolean hideInternal) {
        return List.of();
    }

    /**
     * Query service-to-service trace call graph rows with service scope pushed into the storage layer.
     *
     * @param limit row limit
     * @param start start time in epoch milliseconds
     * @param end end time in epoch milliseconds
     * @param environment deployment environment filter
     * @param serviceNames services that should appear as either source or target
     * @param hideInternal whether internal HertzBeat traces should be hidden
     * @return service graph rows
     */
    default List<Map<String, Object>> queryTraceServiceGraphRows(int limit,
                                                                 Long start,
                                                                 Long end,
                                                                 String environment,
                                                                 Collection<String> serviceNames,
                                                                 Boolean hideInternal) {
        return queryTraceServiceGraphRows(limit, start, end, environment, hideInternal);
    }

    /**
     * Query rows for a single trace id.
     *
     * @param traceId trace id
     * @param limit row limit
     * @return raw trace rows
     */
    List<Map<String, Object>> queryTraceRows(String traceId, int limit);

    /**
     * Query rows for a single trace id with storage-owned route/detail filters.
     *
     * @param traceId trace id
     * @param limit row limit
     * @param start start time in epoch milliseconds
     * @param end end time in epoch milliseconds
     * @param serviceName service name filter
     * @param serviceNamespace service namespace filter
     * @param environment deployment environment filter
     * @param workspaceId workspace id filter
     * @param resourceIdentityFilters canonical resource identity filters
     * @param hideInternal whether internal HertzBeat traces should be hidden
     * @return raw trace rows
     */
    default List<Map<String, Object>> queryTraceRows(String traceId,
                                                     int limit,
                                                     Long start,
                                                     Long end,
                                                     String serviceName,
                                                     String serviceNamespace,
                                                     String environment,
                                                     String workspaceId,
                                                     Map<String, Set<String>> resourceIdentityFilters,
                                                     Boolean hideInternal) {
        return queryTraceRows(traceId, limit);
    }
}
