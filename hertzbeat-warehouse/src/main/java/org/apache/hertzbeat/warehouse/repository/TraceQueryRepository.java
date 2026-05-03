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
import java.util.Map;

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
     * Query rows for a single trace id.
     *
     * @param traceId trace id
     * @param limit row limit
     * @return raw trace rows
     */
    List<Map<String, Object>> queryTraceRows(String traceId, int limit);
}
